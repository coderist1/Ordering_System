"""
Email utilities for sending activation and notification emails.
Uses Django's configured email backend so SMTP settings from the environment
control delivery.
"""

from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings


def _send_email_via_smtp(subject: str, html_content: str, to_email: str):
    """Helper to send email using Django's configured email backend."""
    message = EmailMultiAlternatives(
        subject=subject,
        body='Please view this email in an HTML-capable client.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    message.attach_alternative(html_content, 'text/html')

    try:
        message.send(fail_silently=False)
        return True
    except Exception as e:
        print(f"✗ SMTP error: {str(e)}")
        return False


def send_activation_email(user):
    """
    Send account activation email using Django's configured email backend.
    """
    try:
        token = default_token_generator.make_token(user)

        activation_url = f"{settings.FRONTEND_URL}/activate/{user.pk}/{token}/"
        backend_activation_url = f"{getattr(settings, 'BACKEND_URL', 'http://localhost:8000')}/api/auth/activate/{user.pk}/{token}/"

        context = {
            'user': user,
            'activation_url': activation_url,
            'backend_activation_url': backend_activation_url,
            'frontend_url': settings.FRONTEND_URL,
            'token': token,
        }

        html_message = render_to_string('emails/activation_email.html', context)

        subject = 'Activate Your Ordering System Account'
        success = _send_email_via_smtp(subject, html_message, user.email)

        if success:
            print(f"✓ Activation email sent to {user.email}")
            return True, activation_url
        else:
            return False, activation_url

    except Exception as e:
        print(f"✗ Failed to send activation email: {str(e)}")
        token = default_token_generator.make_token(user)
        activation_url = f"{settings.FRONTEND_URL}/activate/{user.pk}/{token}/"
        return False, activation_url


def send_password_reset_email(user):
    """
    Send password reset email using Django's configured email backend.
    """
    try:
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{user.pk}/{token}"

        context = {
            'user': user,
            'reset_url': reset_url,
        }

        html_message = render_to_string('emails/password_reset_email.html', context)

        subject = 'Reset Your Ordering System Password'
        success = _send_email_via_smtp(subject, html_message, user.email)

        if success:
            print(f"✓ Password reset email sent to {user.email}")
            return True, reset_url
        else:
            return False, reset_url

    except Exception as e:
        print(f"✗ Failed to send password reset email: {str(e)}")
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{user.pk}/{token}"
        return False, reset_url


def send_order_notification_email(user, order):
    """
    Send order notification email using Django's configured email backend.
    """
    try:
        context = {
            'user': user,
            'order': order,
            'order_url': f"{settings.FRONTEND_URL}/orders/{order.id}",
        }

        html_message = render_to_string('emails/order_notification.html', context)

        subject = f'Order {order.order_number} Confirmation'
        success = _send_email_via_smtp(subject, html_message, user.email)

        if success:
            print(f"✓ Order notification sent to {user.email}")
            return True
        return False

    except Exception as e:
        print(f"✗ Failed to send order notification: {str(e)}")
        return False
