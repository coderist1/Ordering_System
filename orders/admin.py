from django.contrib import admin
from .models import (
    Customer,
    Order,
    OrderItem,
    StatusHistory,
    UserProfile,
    Review,
    KnowledgeBase,
    ChatMessage,
    Product,
    Author,
    OwnerApplication,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class StatusHistoryInline(admin.TabularInline):
    model = StatusHistory
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'changed_at', 'note']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'is_active', 'created_by', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'customer', 'status', 'total_amount', 'created_at']
    list_filter = ['status']
    search_fields = ['order_number', 'customer__name']
    inlines = [OrderItemInline, StatusHistoryInline]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'created_at']
    search_fields = ['name', 'email']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'order', 'quantity', 'unit_price']


@admin.register(StatusHistory)
class StatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['order', 'from_status', 'to_status', 'changed_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['order', 'customer', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'user', 'created_at']
    search_fields = ['first_name', 'last_name', 'user__username']


@admin.register(OwnerApplication)
class OwnerApplicationAdmin(admin.ModelAdmin):
    list_display = ['user', 'business_name', 'status', 'submitted_at', 'reviewed_at']
    list_filter = ['status']
    search_fields = ['user__username', 'business_name']


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ['title', 'website_url', 'created_at']
    search_fields = ['title', 'text_content', 'website_url']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['role', 'message', 'created_at']
    list_filter = ['role']
    search_fields = ['message']
