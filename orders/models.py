from django.db import models
from django.contrib.auth.models import User
import uuid

from .roles import CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE


class UserProfile(models.Model):
    ROLE_CHOICES = [
        (CUSTOMER_ROLE, 'Customer'),
        (OWNER_ROLE, 'Owner'),
        (ADMIN_ROLE, 'Admin'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=CUSTOMER_ROLE)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    birthday = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class KnowledgeBase(models.Model):
    title = models.CharField(max_length=255)
    text_content = models.TextField(blank=True, null=True)
    pdf_file = models.FileField(upload_to='pdfs/', null=True, blank=True)
    website_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('assistant', 'Assistant'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.role


class Customer(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_profile'
    )
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.email})"


class Author(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='authors'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# ── NEW: Product model ───────────────────────────────────────────────────────
class Product(models.Model):
    CATEGORY_CHOICES = [
        ('Electronics', 'Electronics'),
        ('Beauty', 'Beauty'),
        ('Fitness', 'Fitness'),
        ('Gifts', 'Gifts'),
        ('Kitchen', 'Kitchen'),
        ('Others', 'Others'),
    ]

    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=10, decimal_places=2)
    category    = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Others')
    emoji       = models.CharField(max_length=10, blank=True, default='📦')
    badge       = models.CharField(max_length=50, blank=True)  # e.g. "New", "Best Seller"
    image       = models.ImageField(upload_to='products/', null=True, blank=True)
    image_url   = models.URLField(max_length=500, blank=True, default='')
    is_active   = models.BooleanField(default=True)
    created_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='products'
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (₱{self.price})"


class OwnerApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='owner_application'
    )
    business_name = models.CharField(max_length=200)
    business_description = models.TextField()
    business_address = models.TextField()
    phone_number = models.CharField(max_length=20)
    website = models.URLField(blank=True)
    experience_years = models.PositiveIntegerField()
    motivation = models.TextField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_applications'
    )
    review_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.business_name} ({self.status})"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    VALID_TRANSITIONS = {
        'pending':    ['processing', 'cancelled'],
        'processing': ['shipped'],
        'shipped':    ['completed'],
        'completed':  [],
        'cancelled':  [],
    }

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name='orders'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders'
    )
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes        = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def __str__(self):
        return f"{self.order_number} ({self.status})"


class OrderItem(models.Model):
    order        = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product      = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items'
    )
    product_name = models.CharField(max_length=200)
    quantity     = models.PositiveIntegerField(default=1)
    unit_price   = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class StatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='status_history'
    )
    from_status = models.CharField(max_length=20, blank=True, null=True)
    to_status   = models.CharField(max_length=20)
    changed_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    note       = models.TextField(blank=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.order.order_number}: {self.from_status} -> {self.to_status}"


class Review(models.Model):
    order    = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating   = models.PositiveSmallIntegerField()  # 1-5
    comment  = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.order.order_number} - {self.rating} stars"