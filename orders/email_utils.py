"""
Email utilities for sending activation and notification emails.
Uses Django's configured email backend so SMTP settings from the environment
control delivery.
"""

from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from email.utils import parseaddr

import requests


def _log(message: str):
    print(message, flush=True)


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
        _log(f"[email] SMTP error: {e}")
        return False


def _send_email_via_brevo_api(subject: str, html_content: str, to_email: str):
    """Fallback sender using Brevo HTTP API when SMTP is unavailable."""
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    if not api_key:
        return False

    display_name, sender_email = parseaddr(settings.DEFAULT_FROM_EMAIL)
    sender_email = sender_email or settings.DEFAULT_FROM_EMAIL
    sender_name = display_name or 'Ordering System'

    payload = {
        'sender': {'name': sender_name, 'email': sender_email},
        'to': [{'email': to_email}],
        'subject': subject,
        'htmlContent': html_content,
    }

    headers = {
        'accept': 'application/json',
        'api-key': api_key,
        'content-type': 'application/json',
    }

    try:
        timeout = int(getattr(settings, 'EMAIL_TIMEOUT', 20))
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            json=payload,
            headers=headers,
            timeout=timeout,
        )
        if response.ok:
            return True
        _log(f"[email] Brevo API error: {response.status_code} {response.text}")
        return False
    except Exception as e:
        _log(f"[email] Brevo API request failed: {e}")
        return False


def _send_email(subject: str, html_content: str, to_email: str):
    """Prefer Brevo API on cloud hosts; fall back to SMTP."""
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    if api_key and _send_email_via_brevo_api(subject, html_content, to_email):
        return True
    if _send_email_via_smtp(subject, html_content, to_email):
        return True
    return False


def send_activation_email(user):
    """
    Send account activation email using Django's configured email backend.
    """
    try:
        token = default_token_generator.make_token(user)

        activation_url = f"{settings.FRONTEND_URL}/activate/{user.pk}/{token}/"
        backend_activation_url = f"{getattr(settings, 'BACKEND_URL', 'http://localhost:8000')}/api/v1/auth/activate/{user.pk}/{token}/"

        context = {
            'user': user,
            'activation_url': activation_url,
            'backend_activation_url': backend_activation_url,
            'frontend_url': settings.FRONTEND_URL,
            'token': token,
        }

        html_message = render_to_string('emails/activation_email.html', context)

        subject = 'Activate Your Ordering System Account'
        success = _send_email(subject, html_message, user.email)

        if success:
            _log(f"[email] Activation email sent to {user.email}")
            return True, activation_url
        else:
            _log(f"[email] Activation email failed for {user.email}")
            return False, activation_url

    except Exception as e:
        _log(f"[email] Failed to send activation email: {e}")
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
        success = _send_email(subject, html_message, user.email)

        if success:
            _log(f"[email] Password reset email sent to {user.email}")
            return True, reset_url
        else:
            return False, reset_url

    except Exception as e:
        _log(f"[email] Failed to send password reset email: {e}")
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
        success = _send_email(subject, html_message, user.email)

        if success:
            _log(f"[email] Order notification sent to {user.email}")
            return True
        return False

    except Exception as e:
        _log(f"[email] Failed to send order notification: {e}")
        return False
