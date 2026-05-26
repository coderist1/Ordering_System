from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from orders.models import Customer


class Command(BaseCommand):
    help = 'Delete every user account and matching customer records.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        user_count = User.objects.count()
        customer_count = Customer.objects.count()

        if user_count == 0 and customer_count == 0:
            self.stdout.write(self.style.WARNING('No users or customers to delete.'))
            return

        if not options['yes']:
            self.stdout.write(
                f'This will delete {user_count} user(s) and {customer_count} customer record(s).'
            )
            confirm = input('Type "yes" to continue: ')
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING('Cancelled.'))
                return

        deleted_users, user_details = User.objects.all().delete()
        deleted_customers, customer_details = Customer.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Deleted {deleted_users} user-related object(s): {user_details}'
            )
        )
        if deleted_customers:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deleted {deleted_customers} customer-related object(s): {customer_details}'
                )
            )
