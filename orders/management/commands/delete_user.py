from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from orders.models import Customer


class Command(BaseCommand):
    help = 'Delete a single user (and related customer record) by email or username.'

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--email', type=str, help='Email address of the account to delete')
        group.add_argument('--username', type=str, help='Username of the account to delete')

    def handle(self, *args, **options):
        email = options.get('email')
        username = options.get('username')

        if email:
            user = User.objects.filter(email__iexact=email.strip()).first()
            lookup = f'email={email}'
        else:
            user = User.objects.filter(username__iexact=username.strip()).first()
            lookup = f'username={username}'

        if not user:
            raise CommandError(f'No user found for {lookup}')

        customer_qs = Customer.objects.filter(email__iexact=user.email)
        customer_count = customer_qs.count()

        self.stdout.write(
            f'Found user id={user.id} username={user.username!r} email={user.email!r}'
        )
        if customer_count:
            self.stdout.write(f'Also removing {customer_count} customer record(s) with same email.')

        deleted_user, user_details = user.delete()
        deleted_customers, customer_details = customer_qs.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Deleted user ({deleted_user} objects): {user_details}'
            )
        )
        if deleted_customers:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deleted customers ({deleted_customers} objects): {customer_details}'
                )
            )
