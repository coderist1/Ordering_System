# Email Activation Setup Guide

## Overview
Your Ordering System now has email activation via Brevo SMTP. Users receive activation links when they register, and must click them to activate their accounts.

## Features Implemented

✅ **Email Activation**
- Users receive activation emails upon registration
- Activation links expire in 24 hours
- Email contains clickable button and fallback link
- Beautiful HTML email templates

✅ **Password Reset**
- Users can request password reset via email
- Secure token-based verification
- Tokens expire in 24 hours

✅ **API Endpoints**
- `POST /api/v1/auth/register/` - Register (sends activation email)
- `POST /api/v1/auth/activate/<user_id>/<token>/` - Activate account
- `POST /api/v1/auth/resend-activation/` - Resend activation email
- `POST /api/v1/auth/request-reset/` - Request password reset
- `POST /api/v1/auth/reset-password/<user_id>/<token>/` - Reset password

---

## Step 1: Get Brevo SMTP Credentials

1. Go to your Brevo Dashboard.
2. Click on your profile menu (top right) -> **SMTP & API**.
3. Under the **SMTP** tab, click **Generate a new SMTP key**.
4. Copy the generated password.
5. Verify your sender email address (`mathewpolinar5@gmail.com`) in the Senders list.

---

## Step 2: Configure Django Settings

### Update `config/settings.py`

Your settings are already set up to use environment variables. In your deployment (or `.env` file), configure:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ac6f60001@smtp-brevo.com
EMAIL_HOST_PASSWORD=your-brevo-password
DEFAULT_FROM_EMAIL="Ordering System <mathewpolinar5@gmail.com>"
```

---

## Step 3: Configure Frontend URL

Update the `FRONTEND_URL` in `config/settings.py`:

```python
# For local development
FRONTEND_URL = 'http://localhost:5173'

# For production
FRONTEND_URL = 'https://yourdomain.com'
```

---

## Step 4: Test Email Sending (Optional)

Use Django's console backend for testing (emails print to console):

```python
# In config/settings.py, temporarily use:
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

Then run the server and register a user. You'll see the email printed in the console.

Switch back to SMTP when ready for production.

---

## Step 5: Run Migrations

```bash
python manage.py migrate
```

This creates any necessary database tables (though we're using Django's built-in User model).

---

## API Usage Examples

### 1. Register User (Sends Activation Email)
```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "securepass123",
    "confirm_password": "securepass123",
    "role": "customer"
  }'
```

**Response:**
```json
{
  "message": "Registration successful! Please check your email to activate your account.",
  "user_id": 1,
  "email": "john@example.com",
  "detail": "Activation link sent to your email. It will expire in 24 hours."
}
```

### 2. Activate Account
User clicks link or uses endpoint:
```bash
curl -X POST http://localhost:8000/api/v1/auth/activate/1/abc123token...
```

### 3. Resend Activation Email
```bash
curl -X POST http://localhost:8000/api/v1/auth/resend-activation/ \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

### 4. Request Password Reset
```bash
curl -X POST http://localhost:8000/api/v1/auth/request-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com"}'
```

### 5. Reset Password
```bash
curl -X POST http://localhost:8000/api/v1/auth/reset-password/1/abc123token... \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "newpass456",
    "confirm_password": "newpass456"
  }'
```

---

## Troubleshooting

### "SMTPAuthenticationError: 535 5.7.8 Username and password not accepted"
- ✓ Check app password is 16 characters (with spaces in the middle)
- ✓ Verify you enabled 2-Factor Authentication on your Gmail account
- ✓ Confirm EMAIL_HOST_USER matches your Gmail address

### "Connection refused" or "timeout"
- ✓ Check internet connection
- ✓ Verify `EMAIL_HOST = 'smtp.gmail.com'` and `EMAIL_PORT = 587`
- ✓ Ensure your network allows outbound SMTP

### Emails not sending
- ✓ Check Django console output for error messages
- ✓ Verify email template files exist in `orders/templates/emails/`
- ✓ Try using console backend first to debug

### Activation link doesn't work
- ✓ Verify `FRONTEND_URL` is set correctly
- ✓ Ensure token hasn't expired (24 hours)
- ✓ Check the link includes both user_id and token

---

## Frontend Integration

### Activation Page Component

Create `frontend/src/pages/Activate.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Activate() {
  const { userId, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('activating');
  const [message, setMessage] = useState('Activating your account...');

  useEffect(() => {
    activateAccount();
  }, []);

  const activateAccount = async () => {
    try {
      const response = await axios.post(
        `http://localhost:8000/api/v1/auth/activate/${userId}/${token}/`
      );
      setStatus('success');
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      {loading ? (
        <>
          <h2>🔄 Activating Account...</h2>
          <p>Please wait...</p>
        </>
      ) : status === 'success' ? (
        <>
          <h2>✓ Success!</h2>
          <p>{message}</p>
          <p>Redirecting to login...</p>
        </>
      ) : (
        <>
          <h2>✗ Activation Failed</h2>
          <p>{message}</p>
          <button onClick={() => navigate('/register')}>Register Again</button>
        </>
      )}
    </div>
  );
}
```

---

## Email Templates

Three email templates have been created:

1. **activation_email.html** - Sent when user registers
2. **password_reset_email.html** - Sent when user requests password reset
3. **order_notification.html** - Sent when order is created

All templates are in `orders/templates/emails/`

---

## Security Notes

✅ **What's Protected:**
- App password is NOT your Gmail password
- Tokens expire after 24 hours
- Tokens are single-use (checked against user's `last_login`)
- Passwords are hashed (never sent in emails)
- Email addresses validated before sending

✅ **Best Practices:**
- Never commit credentials to Git (use environment variables in production)
- Use environment variables for sensitive data:
  ```python
  import os
  EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
  EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
  ```

---

## Production Checklist

- [ ] Create app password on Gmail
- [ ] Update EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
- [ ] Update FRONTEND_URL to production domain
- [ ] Test email sending with console backend first
- [ ] Run migrations
- [ ] Test full registration + activation flow
- [ ] Set DEBUG = False in production
- [ ] Use environment variables for sensitive data

---

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review Django email documentation
3. Check Gmail app passwords help: https://support.google.com/accounts/answer/185833
