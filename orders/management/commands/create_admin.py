from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from orders.models import Customer, UserProfile
from orders.roles import ADMIN_ROLE, normalize_role

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a superuser and ensure UserProfile.role is set to admin'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='adminconey', help='Username')
        parser.add_argument('--email', type=str, default='adminconey@gmail.com', help='Email')
        parser.add_argument('--password', type=str, default='adminconey', help='Password')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

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
            self.stdout.write(self.style.SUCCESS(f"Created superuser: {username}"))
        else:
            changed = False
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_active:
                user.is_active = True
                changed = True
            if user.email != email:
                user.email = email
                changed = True
            if changed:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Updated existing user to superuser: {username}"))
            else:
                self.stdout.write(self.style.NOTICE(f"User '{username}' already exists and is superuser."))

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.role != ADMIN_ROLE:
            profile.role = ADMIN_ROLE
            profile.save()
            self.stdout.write(self.style.SUCCESS(f"Set UserProfile.role='admin' for {username}"))
        else:
            self.stdout.write(self.style.NOTICE(f"UserProfile for {username} already has role 'admin'."))

        Customer.objects.get_or_create(
            email=user.email,
            defaults={
                'name': user.get_full_name() or user.username,
                'phone': '',
                'user': user,
            },
        )
