"""
Email utilities for sending activation and notification emails.
Now using Resend instead of Gmail SMTP.
"""

import resend
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings


def _send_email_via_resend(subject: str, html_content: str, to_email: str):
    """Helper to send email using Resend."""
    if not settings.RESEND_API_KEY:
        print("⚠ RESEND_API_KEY not set. Skipping email send.")
        return False

    resend.api_key = settings.RESEND_API_KEY

    params = {
        "from": settings.DEFAULT_FROM_EMAIL or "Ordering System <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    try:
        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"✗ Resend error: {str(e)}")
        return False


def send_activation_email(user):
    """
    Send account activation email using Resend.
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
        success = _send_email_via_resend(subject, html_message, user.email)

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
    Send password reset email using Resend.
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
        success = _send_email_via_resend(subject, html_message, user.email)

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
    Send order notification email using Resend.
    """
    try:
        context = {
            'user': user,
            'order': order,
            'order_url': f"{settings.FRONTEND_URL}/orders/{order.id}",
        }

        html_message = render_to_string('emails/order_notification.html', context)

        subject = f'Order {order.order_number} Confirmation'
        success = _send_email_via_resend(subject, html_message, user.email)

        if success:
            print(f"✓ Order notification sent to {user.email}")
            return True
        return False

    except Exception as e:
        print(f"✗ Failed to send order notification: {str(e)}")
        return False
