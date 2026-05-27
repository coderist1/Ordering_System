import logging
import os

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.shortcuts import render
from django.conf import settings
from io import BytesIO
from pathlib import Path
import re
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from bs4 import BeautifulSoup
from pypdf import PdfReader
import requests

from .models import Author, Customer, Order, OrderItem, StatusHistory, Review, UserProfile, Product, OwnerApplication, KnowledgeBase, ChatMessage
from .serializers import (
    AuthorSerializer,
    RegisterSerializer,
    UserSerializer,
    CustomerSerializer,
    ProductSerializer,
    ProductCreateSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    StatusUpdateSerializer,
    ReviewSerializer,
    OwnerApplicationSerializer,
    OwnerApplicationCreateSerializer,
    OwnerApplicationReviewSerializer,
    KnowledgeBaseSerializer,
    ChatMessageSerializer,
)
from .email_utils import send_activation_email, send_password_reset_email
from .roles import get_role, is_admin, is_staff, is_customer, normalize_role, CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE
from .chatbot_faq import find_best_qa_match, format_faq_response, answer_from_knowledge_base
import requests
from django.core.files.base import ContentFile
from urllib.parse import urlparse


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

OLLAMA_MODEL = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:0.5b')
OLLAMA_URL = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434')
STRICT_CHAT_REFUSAL = 'I don\'t know based on the website information available.'
STRICT_CHAT_SYSTEM = (
    'You are the official FAQ assistant for this ordering website. '
    'Answer the user in a way that is directly aligned with their question: begin with a single, concise sentence that explicitly answers the user’s question (do not begin with unrelated background). '
    'If helpful, follow the first sentence with up to three short bullet steps or clarifying notes. '
    'Only use information found in the provided website knowledge base context — do not add outside knowledge or speculate. '
    f'If the question cannot be answered from the knowledge base, reply exactly: {STRICT_CHAT_REFUSAL} '
    'If the user’s question is ambiguous or missing details, ask one brief clarifying question instead of guessing. '
    'When you use information from the knowledge base, include a "Source:" line naming the knowledge base title and URL when available.'
)


def _extract_pdf_text(file_obj):
    if not file_obj:
        return ''

    try:
        reader = PdfReader(file_obj)
        pages = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or '')
            except Exception:
                continue
        return '\n'.join(pages).strip()
    except Exception:
        return ''


def _extract_website_text(url):
    if not url:
        return ''

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        text = soup.get_text('\n', strip=True)
        return text
    except Exception:
        return ''


def _tokenize_chat_query(text):
    stop_words = {
        'the', 'and', 'for', 'with', 'about', 'this', 'that', 'what', 'when', 'where', 'which',
        'who', 'why', 'how', 'can', 'could', 'would', 'should', 'will', 'your', 'you', 'are',
        'from', 'into', 'have', 'has', 'had', 'was', 'were', 'been', 'being', 'there', 'their',
        'here', 'our', 'but', 'not', 'cant', 'dont', 'doesnt', 'isnt', 'im', 'i', 'me', 'my',
    }
    tokens = re.findall(r"[a-z0-9]+", (text or '').lower())
    return [token for token in tokens if len(token) > 2 and token not in stop_words]


def _build_knowledge_entries():
    entries = []
    for item in KnowledgeBase.objects.all().order_by('-created_at'):
        entry_chunks = []
        if item.title:
            entry_chunks.append(f"Title: {item.title}")
        if item.text_content:
            entry_chunks.append(item.text_content)
        if item.pdf_file:
            pdf_text = _extract_pdf_text(item.pdf_file)
            if pdf_text:
                entry_chunks.append(pdf_text)
        if item.website_url:
            website_text = _extract_website_text(item.website_url)
            if website_text:
                entry_chunks.append(f"Source URL: {item.website_url}\n{website_text}")

        content = '\n\n'.join(chunk for chunk in entry_chunks if chunk).strip()
        if content:
            entries.append({
                'title': item.title,
                'url': item.website_url,
                'content': content,
            })

    return entries


def _build_relevant_knowledge_context(user_message):
    entries = _build_knowledge_entries()
    tokens = _tokenize_chat_query(user_message)

    if not entries:
        return [], ''

    scored_entries = []
    for entry in entries:
        haystack = ' '.join([entry.get('title') or '', entry.get('url') or '', entry.get('content') or '']).lower()
        score = sum(1 for token in tokens if token in haystack)
        scored_entries.append((score, entry))

    scored_entries.sort(key=lambda item: item[0], reverse=True)
    selected = [entry for score, entry in scored_entries[:3] if score > 0]

    if not selected:
        selected = [entry for _, entry in scored_entries[:2]]

    context_parts = []
    sources = []
    for entry in selected:
        snippet = entry['content'][:4000]
        context_parts.append(f"Title: {entry.get('title') or 'Knowledge Base Entry'}\n{snippet}")
        if entry.get('url'):
            sources.append(entry['url'])

    return sources, '\n\n---\n\n'.join(context_parts).strip()[:12000]


def _call_ollama(prompt, system=None):
    response = requests.post(
        f"{OLLAMA_URL.rstrip('/')}/api/generate",
        json={
            'model': OLLAMA_MODEL,
            'prompt': prompt,
            'system': system or STRICT_CHAT_SYSTEM,
            'options': {
                'temperature': 0.1,
            },
            'stream': False,
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    return data.get('response', '').strip()


def _ollama_enabled():
    if getattr(settings, 'CHATBOT_FAQ_ONLY', False):
        return False
    explicit = os.getenv('OLLAMA_ENABLED', '').strip().lower()
    if explicit in ('0', 'false', 'no', 'off'):
        return False
    if explicit in ('1', 'true', 'yes', 'on'):
        return True
    return settings.DEBUG


def _generate_chatbot_response(user_message):
    """FAQ-first chatbot. Uses Ollama only when explicitly enabled."""
    sources = []

    match = find_best_qa_match(user_message)
    if match:
        answer, title, url, _score = match
        if url:
            sources = [url]
        return format_faq_response(answer, title, url), sources

    qa = _find_exact_qa_match(user_message)
    if qa:
        answer_text, title, url = qa
        if url:
            sources = [url]
        return format_faq_response(answer_text, title, url), sources

    sources, context = _build_relevant_knowledge_context(user_message)
    if not context:
        return STRICT_CHAT_REFUSAL, sources

    if not _ollama_enabled():
        return answer_from_knowledge_base(user_message, context, sources)

    prompt = f"""
{STRICT_CHAT_SYSTEM}

Knowledge:
{context}

User question:
{user_message}

Respond strictly as an FAQ entry. Begin with a concise direct answer (one or two sentences). If step-by-step help is required, add up to three short bullets. End with a source line: "Source: <title> (<url>)" for the primary knowledge entry used. If the knowledge does not contain the answer, reply with the exact refusal sentence.
""".strip()

    try:
        ai_response = _call_ollama(prompt)
        if ai_response:
            return ai_response, sources
    except Exception as exc:
        logger.warning('Ollama unavailable, using FAQ fallback: %s', exc)

    return answer_from_knowledge_base(user_message, context, sources)


def _find_exact_qa_match(user_message):
    """Return (answer_text, title, url) if a KnowledgeBase entry contains
    an explicit 'Question: {user_message}' followed by 'Answer: ...'.
    Case-insensitive match on the question line."""
    qm = (user_message or '').strip()
    if not qm:
        return None
    for item in KnowledgeBase.objects.all().order_by('-created_at'):
        content = (item.text_content or '')
        # Look for a 'Question:' line containing the exact question
        m = re.search(r"Question:\s*(.+)", content, flags=re.IGNORECASE)
        if m:
            qtext = m.group(1).strip()
            if qtext.lower() == qm.lower():
                # Extract 'Answer:' section following the question
                a_match = re.search(r"Answer:\s*(.*?)($|\n\n[A-Z][a-z]+:|\nSteps:)", content, flags=re.IGNORECASE | re.DOTALL)
                if a_match:
                    answer = a_match.group(1).strip()
                else:
                    # Fallback: use whole content after question
                    post = content[m.end():].strip()
                    answer = post.split('\n\n')[0].strip()
                return answer, (item.title or 'Knowledge Base'), (item.website_url or '')
    return None


# ─────────────────────────────────────────────
#  PERMISSION CLASSES
# ─────────────────────────────────────────────

class IsAdmin(BasePermission):
    """Allow access only to admin users."""
    message = "Admin access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and is_admin(request.user)


class IsStaffOrAdmin(BasePermission):
    """Allow access to staff-level users (admins)."""
    message = "Admin access required."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and is_staff(request.user)


class IsOwnerOrReadOnly(BasePermission):
    """Allow admins to edit; others can view only."""
    message = "You can only edit your own objects."

    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user or is_staff(request.user)
        return False


class IsObjectOwnerOrAdmin(BasePermission):
    """Allow access only to object owner or admins."""
    message = "You can only access your own objects."

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user or is_admin(request.user)
        if hasattr(obj, 'user'):
            return obj.user == request.user or is_admin(request.user)
        return False


class IsOwner(BasePermission):
    """
    Custom permission to only allow owners of an object to access it.
    """
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


# ─────────────────────────────────────────────
#  ADMIN PANEL
# ─────────────────────────────────────────────

def admin_panel(request):
    return render(request, 'docs.html')


# ─────────────────────────────────────────────
#  AUTHOR VIEWS
# ─────────────────────────────────────────────

class AuthorListCreateView(APIView):
    """List and create authors for authenticated users."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all authors for the authenticated user."""
        authors = Author.objects.filter(user=request.user).order_by('-created_at')
        serializer = AuthorSerializer(authors, many=True)
        return Response({'authors': serializer.data})

    def post(self, request):
        """Create a new author, automatically linking to the authenticated user."""
        serializer = AuthorSerializer(data=request.data)
        if serializer.is_valid():
            # Automatically set the user to the authenticated user
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AuthorDetailView(APIView):
    """Retrieve, update, or delete a specific author."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsOwner]

    def get_author(self, pk, user):
        """Helper method to get author by ID and ensure user owns it."""
        try:
            author = Author.objects.get(pk=pk)
            # Check if user owns this author
            if author.user != user:
                return None
            return author
        except Author.DoesNotExist:
            return None

    def get(self, request, pk):
        """Retrieve a specific author."""
        author = self.get_author(pk, request.user)
        if not author:
            return Response(
                {'detail': 'Author not found or you do not have permission to view it.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = AuthorSerializer(author)
        return Response(serializer.data)

    def patch(self, request, pk):
        """Update a specific author."""
        author = self.get_author(pk, request.user)
        if not author:
            return Response(
                {'detail': 'Author not found or you do not have permission to update it.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = AuthorSerializer(author, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Delete a specific author."""
        author = self.get_author(pk, request.user)
        if not author:
            return Response(
                {'detail': 'Author not found or you do not have permission to delete it.'},
                status=status.HTTP_404_NOT_FOUND
            )
        author.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────
#  AUTH VIEWS
# ─────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = serializer.save()

                # Manually update profile fields that might be skipped by RegisterSerializer
                profile, _ = UserProfile.objects.get_or_create(user=user)
                if 'profile_image' in request.FILES:
                    profile.profile_image = request.FILES['profile_image']
                    profile.save()

                # Send activation email
                success, activation_url = send_activation_email(user)

            response_data = {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': get_role(user),
                },
                'email': user.email,
                'message': 'Registration successful! Please check your email to activate your account.',
                'detail': 'Activation link sent to your email. It will expire in 24 hours.',
            }

            # DEV FALLBACK: If email is blocked by firewall/ISP, give link directly to frontend
            if not success and settings.DEBUG:
                response_data['dev_activation_url'] = activation_url
                response_data['detail'] = 'Email timed out. Used DEV fallback activation link.'

            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            logger.exception('Registration failed')
            error_detail = str(exc) if settings.DEBUG else 'Registration failed on the server.'
            return Response(
                {'error': 'Registration failed.', 'detail': error_detail},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ActivateEmailView(APIView):
    """Verify email activation token and activate user account."""
    permission_classes = [AllowAny]

    def activate_user(self, user_id, token):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify token
        if not default_token_generator.check_token(user, token):
            return None, Response({'error': 'Activation link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Activate user
        if user.is_active:
            return user, Response({'message': 'Account is already activated.'}, status=status.HTTP_200_OK)

        user.is_active = True
        user.save()

        return user, Response({
            'message': '✓ Your account has been activated successfully!',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'detail': 'You can now log in to your account.',
        }, status=status.HTTP_200_OK)

    def post(self, request, user_id, token):
        """Activate via POST (API call)."""
        _, resp = self.activate_user(user_id, token)
        return resp

    def get(self, request, user_id, token):
        """Activate via GET (clicked link from browser). Returns HTML redirect or JSON."""
        user, resp = self.activate_user(user_id, token)
        # If frontend is available, redirect to login page or show frontend route
        frontend = getattr(settings, 'FRONTEND_URL', None)
        if user and frontend:
            # Redirect to frontend login with success message (query param)
            redirect_url = f"{frontend}/login?activated=1"
            from django.shortcuts import redirect
            return redirect(redirect_url)
        return resp


class ResendActivationEmailView(APIView):
    """Resend activation email if user hasn't activated yet."""
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Resend activation email.
        POST /api/v1/auth/resend-activation/
        Body: { "email": "user@example.com" }
        """
        email = request.data.get('email', '').strip()
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # For security, don't reveal if email exists
            return Response(
                {'message': 'If this email is registered, a new activation link has been sent.'},
                status=status.HTTP_200_OK
            )

        if user.is_active:
            return Response(
                {'message': 'This account is already activated. You can log in directly.'},
                status=status.HTTP_200_OK
            )

        # Send activation email
        success, activation_url = send_activation_email(user)

        response_data = {
            'message': 'Activation email has been resent.',
            'detail': 'Please check your email for the activation link. It will expire in 24 hours.',
            'email': user.email,
        }
        if not success and settings.DEBUG:
            response_data['dev_activation_url'] = activation_url
            response_data['detail'] = 'Email timed out. Used DEV fallback activation link.'

        return Response(response_data, status=status.HTTP_200_OK)


class RequestPasswordResetView(APIView):
    """Request password reset email."""
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Request password reset.
        POST /api/v1/auth/request-reset/
        Body: { "email": "user@example.com" }
        """
        email = request.data.get('email', '').strip()
        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # For security, don't reveal if email exists
            return Response(
                {'message': 'If this email is registered, a password reset link has been sent.'},
                status=status.HTTP_200_OK
            )

        # Send password reset email
        success, reset_url = send_password_reset_email(user)

        response_data = {
            'message': 'Password reset email has been sent.',
            'detail': 'Check your email for the reset link. It will expire in 24 hours.',
            'email': user.email,
        }
        if not success and settings.DEBUG:
            response_data['dev_reset_url'] = reset_url
            response_data['detail'] = 'Email timed out. Used DEV fallback reset link.'

        return Response(response_data, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """Reset password with token."""
    permission_classes = [AllowAny]

    def post(self, request, user_id, token):
        """
        Reset password with token.
        POST /api/v1/auth/reset-password/<user_id>/<token>/
        Body: { "new_password": "newpass123", "confirm_password": "newpass123" }
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify token
        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Reset link is invalid or has expired.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_password = request.data.get('new_password', '').strip()
        confirm_password = request.data.get('confirm_password', '').strip()

        if not new_password or not confirm_password:
            return Response(
                {'error': 'Both password fields are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {'error': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {'error': 'Password must be at least 6 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({
            'message': '✓ Your password has been reset successfully!',
            'detail': 'You can now log in with your new password.',
            'username': user.username,
        }, status=status.HTTP_200_OK)


class LoginView(APIView):
     permission_classes = [AllowAny]

     def post(self, request):
         email    = request.data.get('email', '').strip()
         password = request.data.get('password', '')

         if not email or not password:
             return Response(
                 {'error': 'Email and password are required.'},
                 status=status.HTTP_400_BAD_REQUEST
             )

         try:
             user_obj = User.objects.get(email__iexact=email)
         except User.DoesNotExist:
             print(f"DEBUG: Login failed. No user found with email '{email}'")
             return Response(
                 {'error': 'Invalid email or password.'},
                 status=status.HTTP_401_UNAUTHORIZED
             )

         # Check if account is activated
         if not user_obj.is_active:
             print(f"DEBUG: Login failed. User '{email}' exists but is not active.")
             return Response(
                 {'error': 'Account not activated. Check your email for the activation link, or contact support.'},
                 status=status.HTTP_403_FORBIDDEN
             )

         user = authenticate(username=user_obj.username, password=password)
         if not user:
             print(f"DEBUG: Login failed. Incorrect password for email '{email}' (username: '{user_obj.username}')")
             return Response(
                 {'error': 'Invalid email or password.'},
                 status=status.HTTP_401_UNAUTHORIZED
             )

         refresh = RefreshToken.for_user(user)
         user_serializer = UserSerializer(user, context={'request': request})
         return Response({
             'access': str(refresh.access_token),
             'refresh': str(refresh),
             'user': user_serializer.data,
         })


class LogoutView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response({'detail': 'Logged out successfully.'})


class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        user_serializer = UserSerializer(request.user, context={'request': request})
        return Response(user_serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            
            # Manually update profile fields that might be skipped by UserSerializer
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile_updated = False
            
            if 'address' in request.data:
                profile.address = request.data['address']
                profile_updated = True
                
            if 'profile_image' in request.FILES:
                profile.profile_image = request.FILES['profile_image']
                profile_updated = True
                
            if profile_updated:
                profile.save()
                
            return Response(UserSerializer(user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  PRODUCT VIEWS
# ─────────────────────────────────────────────

class ProductListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]
    parser_classes         = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        """Get products - admins see all, users see only active."""
        if is_staff(request.user):
            products = Product.objects.all().order_by('-created_at')
        else:
            products = Product.objects.filter(is_active=True).order_by('-created_at')

        category = request.query_params.get('category', '')
        if category:
            products = products.filter(category=category)

        return Response({'products': ProductSerializer(products, many=True, context={'request': request}).data})

    def post(self, request):
        """Create product - admins and owners only.

        Supports `image` as a remote URL string: if provided, the view will
        download the image after creating the product and attach it to the
        product image field. This allows clients to submit image URLs instead
        of multipart file uploads.
        """
        if not is_staff(request.user):
            return Response(
                {'detail': 'Only admins and owners can create products.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Make a mutable copy of incoming data so we can strip out image URLs
        data = request.data.copy()
        image_url = None
        if 'image' in data and isinstance(data.get('image'), str) and data.get('image').startswith('http'):
            image_url = data.pop('image')

        serializer = ProductCreateSerializer(data=data)
        if serializer.is_valid():
            product = serializer.save(created_by=request.user)

            # If an image URL was provided, download and attach it
            if image_url:
                try:
                    resp = requests.get(image_url, timeout=10)
                    resp.raise_for_status()
                    parsed = urlparse(image_url)
                    filename = parsed.path.split('/')[-1] or 'image.jpg'
                    product.image.save(filename, ContentFile(resp.content))
                    product.save()
                except Exception:
                    # Don't fail the whole request if image download fails — leave product created
                    print(f"DEBUG: failed to fetch image from {image_url}")
            return Response(ProductSerializer(product, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]
    parser_classes         = [JSONParser, FormParser, MultiPartParser]

    def get_product(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        """Retrieve a product - admins/owners see all, users see only active."""
        p = self.get_product(pk)
        if not p:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Users can only view active products
        if not is_staff(request.user) and not p.is_active:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(ProductSerializer(p, context={'request': request}).data)

    def patch(self, request, pk):
        """Update product - owners and admins only."""
        if not is_staff(request.user):
            return Response(
                {'detail': 'Only owners and admins can edit products.'},
                status=status.HTTP_403_FORBIDDEN
            )
        p = self.get_product(pk)
        if not p:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Support image as remote URL. Copy data and remove URL before validation.
        data = request.data.copy()
        image_url = None
        if 'image' in data and isinstance(data.get('image'), str) and data.get('image').startswith('http'):
            image_url = data.pop('image')

        serializer = ProductCreateSerializer(p, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # If an image URL was provided, download and attach it to the product
            if image_url:
                try:
                    resp = requests.get(image_url, timeout=10)
                    resp.raise_for_status()
                    parsed = urlparse(image_url)
                    filename = parsed.path.split('/')[-1] or 'image.jpg'
                    p.image.save(filename, ContentFile(resp.content))
                    p.save()
                except Exception:
                    print(f"DEBUG: failed to fetch image from {image_url}")
            return Response(ProductSerializer(p, context={'request': request}).data)
        # Log validation errors and request payload for debugging
        try:
            print("DEBUG: Product update failed for id=", pk)
            print("DEBUG: serializer.errors:", serializer.errors)
            print("DEBUG: request.data keys:", list(request.data.keys()))
            print("DEBUG: request.FILES keys:", list(request.FILES.keys()))
        except Exception:
            pass
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Delete product - admins only."""
        if not is_admin(request.user):
            return Response(
                {'detail': 'Only admins can delete products.'},
                status=status.HTTP_403_FORBIDDEN
            )
        p = self.get_product(pk)
        if not p:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        p.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────
#  ORDER VIEWS
# ─────────────────────────────────────────────

class OrderListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        role = get_role(request.user)
        if is_customer(request.user):
            orders = Order.objects.filter(created_by=request.user).order_by('-created_at')
        else:
            orders = Order.objects.all().order_by('-created_at')

        search = request.query_params.get('search', '')
        status_filter = request.query_params.get('status', '')

        if search:
            orders = (
                orders.filter(order_number__icontains=search) |
                orders.filter(customer__name__icontains=search) |
                orders.filter(customer__email__icontains=search)
            )
        if status_filter:
            orders = orders.filter(status=status_filter)

        return Response({'orders': OrderSerializer(orders.distinct(), many=True).data})

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get_order(self, pk, user):
        """Get order if user has permission to access it."""
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return None
        
        # Users can only access their own orders
        if is_customer(user) and order.created_by != user:
            return None
        
        return order

    def get(self, request, pk):
        """Retrieve an order."""
        order = self.get_order(pk, request.user)
        if not order:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)

    def patch(self, request, pk):
        """Update order notes - customer can update own order, admins can update any."""
        order = self.get_order(pk, request.user)
        if not order:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Only customers updating their own orders can update notes
        if is_customer(request.user):
            order.notes = request.data.get('notes', order.notes)
            order.save()
        elif is_staff(request.user):
            # Admins/owners can update more fields
            order.notes = request.data.get('notes', order.notes)
            order.save()
        
        return Response(OrderSerializer(order).data)

    def delete(self, request, pk):
        """Delete order - admins only."""
        if not is_admin(request.user):
            return Response(
                {'detail': 'Only admins can delete orders.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            Order.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


class OrderStatusUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, pk):
        """Update order status - owners and admins only."""
        if not is_staff(request.user):
            return Response(
                {'detail': 'Only admins can update order status.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StatusUpdateSerializer(data=request.data, context={'order': order})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        new_status = serializer.validated_data['status']
        note       = serializer.validated_data.get('note', '')
        order.status = new_status
        order.save()

        StatusHistory.objects.create(
            order=order, from_status=old_status, to_status=new_status,
            changed_by=request.user, note=note,
        )
        return Response(OrderSerializer(order).data)


class OrderCancelView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, pk):
        if not is_customer(request.user):
            return Response(
                {'detail': 'Only customers can cancel orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            order = Order.objects.get(pk=pk, created_by=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response(
                {'detail': 'Only pending orders can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status   = order.status
        order.status = 'cancelled'
        order.save()

        StatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status='cancelled',
            changed_by=request.user,
            note=request.data.get('note', 'Cancelled by customer'),
        )

        return Response(OrderSerializer(order).data)


class OrderSummaryView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        role = get_role(request.user)
        orders = Order.objects.filter(created_by=request.user) if is_customer(request.user) else Order.objects.all()
        return Response({
            'total_orders':      orders.count(),
            'total_revenue':     float(sum(o.total_amount for o in orders)),
            'completed_revenue': float(sum(o.total_amount for o in orders.filter(status='completed'))),
            'by_status': {
                'pending':    orders.filter(status='pending').count(),
                'processing': orders.filter(status='processing').count(),
                'shipped':    orders.filter(status='shipped').count(),
                'completed':  orders.filter(status='completed').count(),
            },
        })


# ─────────────────────────────────────────────
#  CUSTOMER & USER VIEWS
# ─────────────────────────────────────────────

class CustomerListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        if not is_staff(request.user):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        customers = Customer.objects.all().order_by('-created_at')
        return Response({'customers': CustomerSerializer(customers, many=True).data})


class UserListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'detail': 'Only admins can view users.'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.all().order_by('id')
        return Response({
            'users': [
                {
                    'id':         u.id,
                    'username':   u.username,
                    'email':      u.email,
                    'first_name': u.first_name,
                    'last_name':  u.last_name,
                    'role':       get_role(u),
                    'date_joined': u.date_joined,
                }
                for u in users
            ]
        })


class UserRoleUpdateView(APIView):
    """Admin-only: change a user's role."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_admin(request.user):
            return Response({'detail': 'Only admins can change user roles.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent admin from changing their own role
        if user == request.user:
            return Response({'detail': 'You cannot change your own role.'}, status=status.HTTP_400_BAD_REQUEST)

        new_role = normalize_role(request.data.get('role'))
        if new_role not in [CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE]:
            return Response({'detail': 'Invalid role. Must be customer, owner, or admin.'}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = new_role
        profile.save()

        return Response({
            'id':       user.id,
            'username': user.username,
            'role':     new_role,
            'detail':   f"Role updated to {new_role}.",
        })


class KnowledgeBaseView(ListCreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = KnowledgeBase.objects.all().order_by('-created_at')
    serializer_class = KnowledgeBaseSerializer


class ChatbotView(ListCreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = ChatMessage.objects.all().order_by('created_at')
    serializer_class = ChatMessageSerializer

    def create(self, request, *args, **kwargs):
        user_message = (request.data or {}).get('message', '').strip()
        if not user_message:
            return Response({'detail': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user_chat = ChatMessage.objects.create(role='user', message=user_message)
        ai_response, sources = _generate_chatbot_response(user_message)
        ai_chat = ChatMessage.objects.create(role='assistant', message=ai_response)

        return Response({
            'user': ChatMessageSerializer(user_chat).data,
            'assistant': ChatMessageSerializer(ai_chat).data,
            'sources': sources,
        }, status=status.HTTP_201_CREATED)


class ChatbotPublicView(ListCreateAPIView):
    """Public FAQ chatbot: allows unauthenticated users to ask site-specific questions.
    Uses the same KB retrieval + Ollama call as ChatbotView but permits anonymous access.
    """
    permission_classes = [AllowAny]
    queryset = ChatMessage.objects.all().order_by('created_at')
    serializer_class = ChatMessageSerializer

    def create(self, request, *args, **kwargs):
        user_message = (request.data or {}).get('message', '').strip()
        if not user_message:
            return Response({'detail': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        # Save user message (anonymous)
        user_chat = ChatMessage.objects.create(role='user', message=user_message)
        ai_response, sources = _generate_chatbot_response(user_message)
        ai_chat = ChatMessage.objects.create(role='assistant', message=ai_response)

        return Response({
            'user': ChatMessageSerializer(user_chat).data,
            'assistant': ChatMessageSerializer(ai_chat).data,
            'sources': sources,
        }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
#  REVIEW VIEW
# ─────────────────────────────────────────────

class ReviewView(APIView):
    """Customer-only: create reviews for completed orders."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request, pk):
        """Create a review for a completed order - customers only."""
        if not is_customer(request.user):
            return Response(
                {'detail': 'Only customers can leave reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            order = Order.objects.get(pk=pk, created_by=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'completed':
            return Response(
                {'detail': 'You can only review completed orders.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(order, 'review'):
            return Response(
                {'detail': 'You have already reviewed this order.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            Review.objects.create(
                order=order, customer=request.user,
                rating=serializer.validated_data['rating'],
                comment=serializer.validated_data.get('comment', ''),
            )
            return Response(ReviewSerializer(order.review).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  OWNER APPLICATION VIEWS
# ─────────────────────────────────────────────

class OwnerApplicationCreateView(APIView):
    """Allow customers to apply for owner status."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def post(self, request):
        if is_staff(request.user):
            return Response(
                {'error': 'Only customers can apply for owner status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is already an owner/admin
        if is_admin(request.user):
            return Response(
                {'error': 'You are already an owner/admin.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already has a pending or approved application
        existing_app = OwnerApplication.objects.filter(user=request.user).first()
        if existing_app:
            if existing_app.status == 'pending':
                return Response(
                    {'error': 'You already have a pending application.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif existing_app.status == 'approved':
                return Response(
                    {'error': 'Your application has already been approved.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = OwnerApplicationCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            application = serializer.save()
            return Response({
                'message': 'Your owner application has been submitted successfully!',
                'application_id': application.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OwnerApplicationListView(APIView):
    """List applications - admins see all, users see their own."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        if is_admin(request.user):
            applications = OwnerApplication.objects.all().order_by('-submitted_at')
        else:
            applications = OwnerApplication.objects.filter(user=request.user)

        serializer = OwnerApplicationSerializer(applications, many=True)
        return Response({'applications': serializer.data})

class OwnerApplicationDetailView(APIView):
    """View application details."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request, pk):
        try:
            application = OwnerApplication.objects.get(pk=pk)
        except OwnerApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Users can only see their own applications, admins can see all
        if not is_admin(request.user) and application.user != request.user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OwnerApplicationSerializer(application)
        return Response(serializer.data)

class OwnerApplicationReviewView(APIView):
    """Admins can approve/reject applications."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAdmin]

    def post(self, request, pk):
        try:
            application = OwnerApplication.objects.get(pk=pk)
        except OwnerApplication.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

        if application.status != 'pending':
            return Response(
                {'error': 'This application has already been reviewed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OwnerApplicationReviewSerializer(application, data=request.data, context={'request': request})
        if serializer.is_valid():
            application = serializer.save()

            # If approved, update user role
            if application.status == 'approved':
                try:
                    profile, _ = UserProfile.objects.get_or_create(user=application.user)
                    # Don't downgrade admins to owners
                    if profile.role != 'admin':
                        profile.role = 'owner'
                    profile.save()
                except UserProfile.DoesNotExist:
                    # Create profile if it doesn't exist
                    UserProfile.objects.create(user=application.user, role='owner')

            return Response({
                'message': f'Application {application.status}.',
                'application': OwnerApplicationSerializer(application).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  NOTIFICATION VIEW
# ─────────────────────────────────────────────

class NotificationView(APIView):
    """Get notifications based on user role."""
    authentication_classes = [JWTAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        """
        Get notifications:
        - Owners/Admins: see new pending orders
        - Customers: see their order status updates
        """
        role = get_role(request.user)
        notifications = []

        if is_admin(request.user):
            # Show pending orders to admins
            for order in Order.objects.filter(status='pending').order_by('-created_at')[:10]:
                notifications.append({
                    'id': f'new-order-{order.id}',
                    'type': 'new_order',
                    'message': f'New order {order.order_number} from {order.customer.name}',
                    'order_id': order.id,
                    'created_at': order.created_at,
                })

        if is_customer(request.user):
            # Show order status updates to customers
            for h in StatusHistory.objects.filter(order__created_by=request.user).order_by('-changed_at')[:10]:
                notifications.append({
                    'id': f'status-{h.id}',
                    'type': 'status_update',
                    'message': f'Order {h.order.order_number} updated to {h.to_status}',
                    'order_id': h.order.id,
                    'created_at': h.changed_at,
                })

        return Response({'notifications': notifications})