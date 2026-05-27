import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from orders.models import Customer, KnowledgeBase, Product, UserProfile
from orders.roles import ADMIN_ROLE, CUSTOMER_ROLE, OWNER_ROLE, normalize_role

User = get_user_model()

DEFAULT_PRODUCTS = [
    {
        'name': 'Wireless Earbuds Pro',
        'description': 'Noise-cancelling earbuds with 30-hour battery life and fast charging.',
        'price': '2499.00',
        'category': 'Electronics',
        'emoji': '🎧',
        'badge': 'Best Seller',
        'image_url': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
    },
    {
        'name': 'Smart Watch Series X',
        'description': 'Track fitness, heart rate, and notifications on a bright AMOLED display.',
        'price': '4999.00',
        'category': 'Electronics',
        'emoji': '⌚',
        'badge': 'New',
        'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    },
    {
        'name': 'Portable Bluetooth Speaker',
        'description': 'Water-resistant speaker with deep bass for outdoor use.',
        'price': '1899.00',
        'category': 'Electronics',
        'emoji': '🔊',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
    },
    {
        'name': 'Vitamin C Brightening Serum',
        'description': 'Daily serum for brighter, even-toned skin with hyaluronic acid.',
        'price': '799.00',
        'category': 'Beauty',
        'emoji': '✨',
        'badge': 'Popular',
        'image_url': 'https://images.unsplash.com/photo-1620916565838-75ff51039b0a?w=800&q=80',
    },
    {
        'name': 'Hydrating Face Moisturizer',
        'description': 'Lightweight moisturizer suitable for all skin types.',
        'price': '649.00',
        'category': 'Beauty',
        'emoji': '💧',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
    },
    {
        'name': 'Yoga Mat Premium',
        'description': 'Non-slip mat with extra cushioning for home workouts.',
        'price': '1299.00',
        'category': 'Fitness',
        'emoji': '🧘',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b44?w=800&q=80',
    },
    {
        'name': 'Adjustable Dumbbell Set',
        'description': 'Space-saving dumbbells adjustable from 2kg to 24kg.',
        'price': '8999.00',
        'category': 'Fitness',
        'emoji': '🏋️',
        'badge': 'Best Seller',
        'image_url': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    },
    {
        'name': 'Gift Box — Gourmet Snacks',
        'description': 'Curated snack assortment perfect for celebrations and thank-you gifts.',
        'price': '999.00',
        'category': 'Gifts',
        'emoji': '🎁',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1549465220-1a8b923004cd?w=800&q=80',
    },
    {
        'name': 'Scented Candle Set',
        'description': 'Set of three soy candles in lavender, vanilla, and citrus scents.',
        'price': '749.00',
        'category': 'Gifts',
        'emoji': '🕯️',
        'badge': 'New',
        'image_url': 'https://images.unsplash.com/photo-1602603150450-3a62f2f2410a?w=800&q=80',
    },
    {
        'name': 'Non-Stick Cookware Set',
        'description': '5-piece cookware set with heat-resistant handles and even heating.',
        'price': '3499.00',
        'category': 'Kitchen',
        'emoji': '🍳',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1584990347499-744ae147092d?w=800&q=80',
    },
    {
        'name': 'Electric Kettle 1.7L',
        'description': 'Fast-boil stainless steel kettle with auto shut-off.',
        'price': '1199.00',
        'category': 'Kitchen',
        'emoji': '☕',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80',
    },
    {
        'name': 'Reusable Water Bottle',
        'description': 'Insulated bottle keeps drinks cold for 24 hours.',
        'price': '599.00',
        'category': 'Others',
        'emoji': '🥤',
        'badge': '',
        'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
    },
]

DEFAULT_KNOWLEDGE = [
    {
        'title': 'Login and Registration',
        'text_content': (
            'Question: How do I create an account?\n'
            'Answer: Open the Register page, fill in your details, then activate your account '
            'using the email link before logging in.\n\n'
            'Question: How do I log in?\n'
            'Answer: Go to the Login page and sign in with your email and password after activation.\n\n'
            'Question: How do I activate my account?\n'
            'Answer: Check your email for the activation link after registering, click it, then log in.\n\n'
            'Question: I forgot my password\n'
            'Answer: Use the Forgot Password page, enter your email, and follow the reset link sent to your inbox.'
        ),
    },
    {
        'title': 'Orders and Products',
        'text_content': (
            'Question: How do I browse products?\n'
            'Answer: Log in and open the Dashboard shop tab to browse products, add items to your cart, and checkout.\n\n'
            'Question: How do I check my order status?\n'
            'Answer: Open the Orders page to view order history and current status.\n\n'
            'Question: How do I cancel an order?\n'
            'Answer: Pending orders can be cancelled from the Orders page by the customer who placed them.\n\n'
            'Question: How do I place an order?\n'
            'Answer: Browse products on the Dashboard, add items to your cart, then complete checkout from the cart.'
        ),
    },
    {
        'title': 'Roles and Owner Applications',
        'text_content': (
            'Question: What can an admin do?\n'
            'Answer: Admins manage users, customers, products, orders, and owner applications from the admin dashboard.\n\n'
            'Question: What can an owner do?\n'
            'Answer: Owners manage products and process orders from their owner dashboard.\n\n'
            'Question: What can a customer do?\n'
            'Answer: Customers browse products, place orders, track order status, and apply to become an owner.\n\n'
            'Question: How do I apply to become an owner?\n'
            'Answer: Customers can submit an owner application from the Apply for Owner page in the sidebar.'
        ),
    },
    {
        'title': 'Profile and Account',
        'text_content': (
            'Question: How do I update my profile?\n'
            'Answer: Open the Profile page after logging in to view and edit your personal details.\n\n'
            'Question: Where is my profile page?\n'
            'Answer: Click Profile in the sidebar after you sign in.'
        ),
    },
]


class Command(BaseCommand):
    help = 'Seed demo products, knowledge base entries, and default accounts for Railway/local dev'

    def add_arguments(self, parser):
        parser.add_argument('--force-products', action='store_true', help='Re-create products even if some exist')

    @transaction.atomic
    def handle(self, *args, **options):
        admin_user = self._ensure_account(
            username=os.getenv('ADMIN_USERNAME', 'adminconey'),
            email=os.getenv('ADMIN_EMAIL', 'adminconey@gmail.com'),
            password=os.getenv('ADMIN_PASSWORD', 'adminconey'),
            role=ADMIN_ROLE,
            superuser=True,
        )
        owner_user = self._ensure_account(
            username=os.getenv('OWNER_USERNAME', 'ownerdemo'),
            email=os.getenv('OWNER_EMAIL', 'ownerdemo@example.com'),
            password=os.getenv('OWNER_PASSWORD', 'ownerdemo123'),
            role=OWNER_ROLE,
            superuser=False,
        )
        customer_user = self._ensure_account(
            username=os.getenv('CUSTOMER_USERNAME', 'customerdemo'),
            email=os.getenv('CUSTOMER_EMAIL', 'customerdemo@example.com'),
            password=os.getenv('CUSTOMER_PASSWORD', 'customerdemo123'),
            role=CUSTOMER_ROLE,
            superuser=False,
        )

        product_count = self._seed_products(admin_user, owner_user, force=options['force_products'])
        kb_count = self._seed_knowledge()

        self.stdout.write(self.style.SUCCESS(
            f'Seed complete: admin={admin_user.username}, owner={owner_user.username}, '
            f'customer={customer_user.username}, products={product_count}, knowledge={kb_count}'
        ))

    def _ensure_account(self, username, email, password, role, superuser=False):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': username,
                'is_staff': superuser,
                'is_superuser': superuser,
                'is_active': True,
            },
        )

        changed = False
        if user.email != email:
            user.email = email
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True
        if superuser:
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
        if created or changed:
            user.set_password(password)
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        normalized = normalize_role(role)
        if profile.role != normalized:
            profile.role = normalized
            profile.save()

        if normalized == CUSTOMER_ROLE:
            Customer.objects.get_or_create(
                email=user.email,
                defaults={
                    'name': user.get_full_name() or user.username,
                    'phone': '',
                    'user': user,
                },
            )

        action = 'Created' if created else 'Ensured'
        self.stdout.write(self.style.SUCCESS(f"{action} {normalized} account '{username}'"))
        return user

    def _seed_products(self, admin_user, owner_user, force=False):
        if force:
            Product.objects.all().delete()

        created_by = owner_user or admin_user
        for item in DEFAULT_PRODUCTS:
            Product.objects.update_or_create(
                name=item['name'],
                defaults={**item, 'created_by': created_by, 'is_active': True},
            )

        count = Product.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Synced {count} products with images'))
        return count

    def _seed_knowledge(self):
        for item in DEFAULT_KNOWLEDGE:
            KnowledgeBase.objects.update_or_create(
                title=item['title'],
                defaults={'text_content': item['text_content']},
            )
        count = KnowledgeBase.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Synced {count} knowledge base entries'))
        return count
