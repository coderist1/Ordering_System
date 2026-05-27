import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from orders.models import Customer, UserProfile
from orders.roles import ADMIN_ROLE

def create_admin():
    username = os.getenv('ADMIN_USERNAME', 'adminconey')
    email = os.getenv('ADMIN_EMAIL', 'adminconey@gmail.com')
    password = os.getenv('ADMIN_PASSWORD', 'adminconey')

    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        },
    )
    if created:
        user.set_password(password)
        user.save()
        print(f"Superuser '{username}' created successfully.")
    else:
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        print(f"Superuser '{username}' updated.")

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = ADMIN_ROLE
    profile.save()
    print(f"Role 'admin' assigned to UserProfile for '{username}'.")

    Customer.objects.get_or_create(
        email=user.email,
        defaults={'name': user.username, 'phone': '', 'user': user},
    )

if __name__ == '__main__':
    create_admin()
