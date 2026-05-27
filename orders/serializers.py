from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from django.utils.dateparse import parse_date
from .roles import CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE, normalize_role
from .models import UserProfile, Customer, Product, Order, OrderItem, StatusHistory, Review, OwnerApplication, KnowledgeBase, ChatMessage, Author
from .product_images import product_image_url


# ─────────────────────────────────────────────
#  AUTH SERIALIZERS
# ─────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'profile_image', 'address', 'age', 'birthday']

    def get_profile_image(self, obj):
        """Return full URL for profile image."""
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    role = serializers.SerializerMethodField()
    profile_image = serializers.ImageField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    age = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    birthday = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role',
            'profile', 'profile_image', 'address', 'age', 'birthday',
        ]
        read_only_fields = ['id', 'username']

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return normalize_role(getattr(profile, 'role', CUSTOMER_ROLE))

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        profile_image = validated_data.pop('profile_image', None)
        address = validated_data.pop('address', None)
        age = validated_data.pop('age', None)
        birthday = validated_data.pop('birthday', None)
        profile = instance.profile

        if age == '':
            age = None
        elif age is not None:
            age = int(age)

        if birthday == '':
            birthday = None
        elif birthday is not None:
            birthday = parse_date(birthday)

        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()

        if profile_image is not None:
            profile.profile_image = profile_image
        elif 'profile_image' in profile_data:
            profile.profile_image = profile_data.get('profile_image')
        profile.address = address if address is not None else profile_data.get('address', profile.address)
        profile.age = age if age is not None else profile_data.get('age', profile.age)
        profile.birthday = birthday if birthday is not None else profile_data.get('birthday', profile.birthday)
        profile.save()

        return instance


class DjoserUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=6, write_only=True)
    re_password = serializers.CharField(min_length=6, write_only=True)
    role = serializers.ChoiceField(choices=[CUSTOMER_ROLE, OWNER_ROLE, ADMIN_ROLE])
    profile_image = serializers.ImageField(required=False, allow_null=True)

    def validate_username(self, value):
        normalized = value.strip()
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError('Username already taken.')
        return normalized

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('Email already registered.')
        return normalized

    def validate_first_name(self, value):
        return value.strip()

    def validate_last_name(self, value):
        return value.strip()

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('re_password'):
            raise serializers.ValidationError({'re_password': ['Passwords do not match.']})
        return attrs

    def create(self, validated_data):
        role = validated_data.pop('role')
        validated_data.pop('re_password', None)
        profile_image = validated_data.pop('profile_image', None)
        first_name = validated_data.get('first_name', '')
        last_name = validated_data.get('last_name', '')

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
            first_name=first_name,
            last_name=last_name,
        )
        user.is_active = False
        user.save(update_fields=['is_active'])

        UserProfile.objects.create(user=user, role=role, profile_image=profile_image)

        if role == CUSTOMER_ROLE:
            Customer.objects.get_or_create(
                email=user.email,
                defaults={
                    'name': f"{first_name} {last_name}".strip() or user.username,
                    'phone': '',
                    'user': user,
                }
            )

        return user


class RegisterSerializer(serializers.Serializer):
    username         = serializers.CharField(max_length=150)
    email            = serializers.EmailField()
    first_name       = serializers.CharField(max_length=150)
    last_name        = serializers.CharField(max_length=150)
    password         = serializers.CharField(min_length=6, write_only=True)
    confirm_password = serializers.CharField(min_length=6, write_only=True)
    role             = serializers.CharField(required=False, default='customer')  # Always customer for new registrations
    profile_image    = serializers.ImageField(required=False, allow_null=True)

    def validate_username(self, value):
        normalized = value.strip()
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("Username already taken.")
        return normalized

    def validate_first_name(self, value):
        return value.strip()

    def validate_last_name(self, value):
        return value.strip()

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Email already registered.")
        return normalized

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({
                'confirm_password': ['Passwords do not match.']
            })
        return attrs

    def create(self, validated_data):
        role       = validated_data.pop('role')
        validated_data.pop('confirm_password', None)
        profile_image = validated_data.pop('profile_image', None)
        first_name = validated_data.get('first_name', '')
        last_name  = validated_data.get('last_name', '')

        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email'],
            first_name=first_name,
            last_name=last_name,
            is_active=False,  # User must activate via email
        )

        user.is_active = False
        user.save(update_fields=['is_active'])

        # All new registrations are customers
        profile_role = CUSTOMER_ROLE
        UserProfile.objects.create(user=user, role=profile_role, profile_image=profile_image)

        Customer.objects.get_or_create(
            email=user.email,
            defaults={
                'name':  f"{first_name} {last_name}".strip() or user.username,
                'phone': '',
                'user':  user,
            }
        )

        return user


# ─────────────────────────────────────────────
#  OWNER APPLICATION SERIALIZERS
# ─────────────────────────────────────────────

class OwnerApplicationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    submitted_at = serializers.DateTimeField(read_only=True)
    reviewed_at = serializers.DateTimeField(read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = OwnerApplication
        fields = [
            'id', 'user', 'business_name', 'business_description', 'business_address',
            'phone_number', 'website', 'experience_years', 'motivation',
            'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes'
        ]
        read_only_fields = ['id', 'user', 'submitted_at', 'reviewed_at', 'reviewed_by']

class OwnerApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerApplication
        fields = [
            'business_name', 'business_description', 'business_address',
            'phone_number', 'website', 'experience_years', 'motivation'
        ]

    def validate_experience_years(self, value):
        if value < 0:
            raise serializers.ValidationError("Experience years cannot be negative.")
        if value > 50:
            raise serializers.ValidationError("Please enter a reasonable number of experience years.")
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class OwnerApplicationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerApplication
        fields = ['status', 'review_notes']
        extra_kwargs = {
            'status': {'required': True},
            'review_notes': {'required': False}
        }

    def update(self, instance, validated_data):
        from django.utils import timezone
        validated_data['reviewed_by'] = self.context['request'].user
        validated_data['reviewed_at'] = timezone.now()
        return super().update(instance, validated_data)


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBase
        fields = '__all__'


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = '__all__'


# ─────────────────────────────────────────────
#  PRODUCT SERIALIZER
# ─────────────────────────────────────────────

class ProductSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'description', 'price', 'category',
            'emoji', 'badge', 'image', 'image_url', 'is_active', 'created_by_id', 'created_by_username', 'created_at',
        ]
        read_only_fields = ['created_by_id', 'created_by_username', 'created_at']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_image(self, obj):
        return product_image_url(obj, self.context.get('request'))


class ProductCreateSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    image_url = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model  = Product
        fields = ['name', 'description', 'price', 'category', 'emoji', 'badge', 'image', 'image_url', 'is_active']
        read_only_fields = ['created_by']


# ─────────────────────────────────────────────
#  CUSTOMER SERIALIZER
# ─────────────────────────────────────────────

class CustomerSerializer(serializers.ModelSerializer):
    order_count = serializers.SerializerMethodField()

    class Meta:
        model  = Customer
        fields = ['id', 'name', 'email', 'phone', 'created_at', 'order_count']

    def get_order_count(self, obj):
        return obj.orders.count()


# ─────────────────────────────────────────────
#  ORDER ITEM SERIALIZER
# ─────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model  = OrderItem
        fields = ['id', 'product_name', 'quantity', 'unit_price', 'subtotal']


# ─────────────────────────────────────────────
#  STATUS HISTORY SERIALIZER
# ─────────────────────────────────────────────

class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.SerializerMethodField()
    changed_by_id = serializers.IntegerField(source='changed_by.id', read_only=True, allow_null=True)

    class Meta:
        model  = StatusHistory
        fields = [
            'id', 'from_status', 'to_status',
            'changed_by_id', 'changed_by_username', 'changed_at', 'note',
        ]
        read_only_fields = ['changed_by_id', 'changed_by_username', 'changed_at']

    def get_changed_by_username(self, obj):
        return obj.changed_by.username if obj.changed_by else None


# ─────────────────────────────────────────────
#  REVIEW SERIALIZER
# ─────────────────────────────────────────────

class ReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.SerializerMethodField()
    customer_id = serializers.IntegerField(source='customer.id', read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'rating', 'comment', 'customer_id', 'customer_username', 'created_at']
        read_only_fields = ['customer_id', 'customer_username', 'created_at']

    def get_customer_username(self, obj):
        return obj.customer.username if obj.customer else None

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


# ─────────────────────────────────────────────
#  ORDER SERIALIZER  (read)
# ─────────────────────────────────────────────

class OrderSerializer(serializers.ModelSerializer):
    items          = OrderItemSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    review         = ReviewSerializer(read_only=True)
    total          = serializers.SerializerMethodField()

    customer_name  = serializers.CharField(source='customer.name',  read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)

    created_by_id       = serializers.IntegerField(source='created_by.id',       read_only=True)
    created_by_username = serializers.CharField(source='created_by.username',     read_only=True)

    item_count = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'status', 'notes', 'total_amount', 'total',
            'created_at', 'updated_at',
            'customer_name', 'customer_email', 'customer_phone',
            'created_by_id', 'created_by_username',
            'item_count', 'items', 'status_history', 'review',
        ]
        read_only_fields = [
            'id', 'order_number', 'status', 'total_amount', 'total',
            'created_at', 'updated_at', 'created_by_id', 'created_by_username',
            'customer_name', 'customer_email', 'customer_phone',
            'item_count', 'items', 'status_history', 'review',
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_total(self, obj):
        return obj.total_amount or 0


# ─────────────────────────────────────────────
#  ORDER CREATE SERIALIZER  (write)
# ─────────────────────────────────────────────

class OrderItemInputSerializer(serializers.Serializer):
    product_id   = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(max_length=200)
    quantity     = serializers.IntegerField(min_value=1)
    unit_price   = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderCreateSerializer(serializers.Serializer):
    customer_name  = serializers.CharField(max_length=200)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    notes          = serializers.CharField(required=False, allow_blank=True)
    items          = OrderItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        for item in value:
            if float(item.get('unit_price', 0)) < 0:
                raise serializers.ValidationError("Unit price cannot be negative.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')

        # Get or create Customer — NO user in defaults to avoid UNIQUE constraint
        customer, _ = Customer.objects.get_or_create(
            email=validated_data['customer_email'],
            defaults={
                'name':  validated_data['customer_name'],
                'phone': validated_data.get('customer_phone', ''),
            }
        )

        order = Order.objects.create(
            customer=customer,
            created_by=request.user if request else None,
            notes=validated_data.get('notes', ''),
        )

        total = 0
        for item_data in validated_data['items']:
            product = None
            if item_data.get('product_id'):
                try:
                    product = Product.objects.get(pk=item_data['product_id'])
                except Product.DoesNotExist:
                    pass

            item = OrderItem.objects.create(
                order=order,
                product=product,
                product_name=item_data['product_name'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
            )
            total += item.subtotal

        order.total_amount = total
        order.save()

        StatusHistory.objects.create(
            order=order,
            from_status=None,
            to_status='pending',
            changed_by=request.user if request else None,
            note='Order placed',
        )

        return order


# ─────────────────────────────────────────────
#  STATUS UPDATE SERIALIZER
# ─────────────────────────────────────────────

class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=['pending', 'processing', 'shipped', 'completed']
    )
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        order = self.context.get('order')
        if order and not order.can_transition_to(data['status']):
            raise serializers.ValidationError(
                f"Cannot transition from '{order.status}' to '{data['status']}'. "
                f"Valid next status: {Order.VALID_TRANSITIONS.get(order.status, [])}"
            )
        return data


# ─────────────────────────────────────────────
#  EXPORTS
# ─────────────────────────────────────────────

__all__ = [
    'RegisterSerializer',
    'UserSerializer',
    'AuthorSerializer',
    'ProductSerializer',
    'ProductCreateSerializer',
    'CustomerSerializer',
    'OrderItemSerializer',
    'StatusHistorySerializer',
    'ReviewSerializer',
    'OrderSerializer',
    'OrderCreateSerializer',
    'StatusUpdateSerializer',
]


class AuthorSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Author
        fields = ['id', 'first_name', 'last_name', 'user', 'created_at']
        read_only_fields = ['user']