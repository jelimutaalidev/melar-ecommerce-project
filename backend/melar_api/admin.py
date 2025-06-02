from django.contrib import admin
from django.utils.html import format_html # Untuk menampilkan gambar di admin
from django.urls import reverse # Diperlukan untuk product_link di CartItemInline
from .models import (
    UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem,
    Cart, CartItem # <-- TAMBAHKAN MODEL BARU
)

# Kustomisasi untuk UserProfile
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user_username', 'user_email', 'has_shop_status', 'shop_id_display')
    search_fields = ('user__username', 'user__email')
    list_select_related = ('user', 'user__shop')

    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'Username'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

    def has_shop_status(self, obj):
        return obj.has_shop
    has_shop_status.boolean = True 
    has_shop_status.short_description = 'Has Shop'

    def shop_id_display(self, obj):
        if hasattr(obj.user, 'shop') and obj.user.shop:
            return obj.user.shop.id
        return '-'
    shop_id_display.short_description = 'Shop ID'

admin.site.register(UserProfile, UserProfileAdmin)

# Kustomisasi untuk Category
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_count')
    search_fields = ('name',)

    def product_count(self, obj):
        return obj.products_in_category.count()
    product_count.short_description = 'Number of Products'

admin.site.register(Category, CategoryAdmin)

# Inline untuk ProductImage di AppProductAdmin
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1 
    readonly_fields = ('image_preview',) 

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="100" height="auto" />', obj.image.url)
        return "(No image)"
    image_preview.short_description = 'Preview'

# Kustomisasi untuk AppProduct
class AppProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'shop_name', 'category_name', 'price', 'available', 'rating', 'total_individual_rentals', 'image_count')
    list_filter = ('available', 'category', 'shop', 'rating')
    search_fields = ('name', 'description', 'shop__name', 'category__name')
    list_select_related = ('shop', 'category') 
    inlines = [ProductImageInline] 
    ordering = ('-created_at',)

    def shop_name(self, obj):
        return obj.shop.name
    shop_name.short_description = 'Shop'

    def category_name(self, obj):
        return obj.category.name if obj.category else '-'
    category_name.short_description = 'Category'

    def image_count(self, obj):
        return obj.product_images.count() 
    image_count.short_description = 'Images'

admin.site.register(AppProduct, AppProductAdmin)

# Kustomisasi untuk Shop
class ShopAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'owner_username',
        'location',
        'phone_number', # Ditambahkan
        'business_type', # Ditambahkan
        'rating',
        'total_rentals',
        'product_count_in_shop',
        'created_at_formatted', # Menggunakan format kustom
        'updated_at_formatted'  # Ditambahkan dan diformat
    )
    list_filter = ('location', 'business_type', 'categories', 'rating') # Rating bisa ditambahkan ke filter
    search_fields = ('name', 'description', 'owner__username', 'phone_number', 'address') # Ditambahkan phone_number dan address
    filter_horizontal = ('categories',)
    list_select_related = ('owner',)
    ordering = ('-created_at',)

    # Mengatur field yang tampil di halaman detail/edit menggunakan fieldsets
    fieldsets = (
        (None, {
            'fields': ('name', 'owner', 'description', 'image', 'image_preview_admin')
        }),
        ('Contact & Location Information', {
            'fields': ('phone_number', 'address', 'location', 'zip_code')
        }),
        ('Categorization & Type', {
            'fields': ('categories', 'business_type')
        }),
        ('Statistics & Timestamps (Read-only)', {
            'classes': ('collapse',), # Bisa disembunyikan secara default
            'fields': ('rating', 'total_rentals', 'product_count_display', 'created_at', 'updated_at')
        }),
    )

    readonly_fields = (
        'image_preview_admin',
        'rating', # Umumnya rating dihitung dari review
        'total_rentals', # Umumnya diupdate by system
        'product_count_display', # Tampilan jumlah produk di detail
        'created_at',
        'updated_at'
    )

    def owner_username(self, obj):
        return obj.owner.username
    owner_username.short_description = 'Owner'
    owner_username.admin_order_field = 'owner__username' # Memungkinkan sorting berdasarkan username owner

    def product_count_in_shop(self, obj):
        return obj.products.count()
    product_count_in_shop.short_description = 'Products (List)'

    def product_count_display(self, obj): # Untuk tampilan di fieldsets (detail view)
        return obj.products.count()
    product_count_display.short_description = 'Number of Products'

    def image_preview_admin(self, obj):
        if obj.image and hasattr(obj.image, 'url'): # Pastikan image ada dan punya URL
            return format_html('<img src="{}" width="150" height="auto" />', obj.image.url)
        return "(No image)"
    image_preview_admin.short_description = 'Logo Preview'

    def created_at_formatted(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    created_at_formatted.short_description = 'Created At'
    created_at_formatted.admin_order_field = 'created_at'

    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M')
    updated_at_formatted.short_description = 'Last Updated'
    updated_at_formatted.admin_order_field = 'updated_at'

admin.site.register(Shop, ShopAdmin)


# Kustomisasi untuk ProductReview
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('product_name', 'user_username', 'rating', 'created_at_formatted')
    list_filter = ('rating', 'created_at', 'product')
    search_fields = ('comment', 'product__name', 'user__username')
    list_select_related = ('product', 'user') 
    readonly_fields = ('product', 'user', 'rating', 'comment', 'created_at') 
    ordering = ('-created_at',)

    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = 'Product'

    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'User'

    def created_at_formatted(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    created_at_formatted.short_description = 'Created At'
    created_at_formatted.admin_order_field = 'created_at'


admin.site.register(ProductReview, ProductReviewAdmin)

# Inline untuk OrderItem di RentalOrderAdmin
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0 
    readonly_fields = ('product_link', 'quantity', 'price_per_day_at_rental', 'start_date', 'end_date', 'rental_duration_days', 'item_total_display')
    can_delete = False 
    max_num = 0 

    def product_link(self, obj):
        if obj.product:
            link = reverse("admin:melar_api_appproduct_change", args=[obj.product.id])
            return format_html('<a href="{}">{}</a>', link, obj.product.name)
        return "-"
    product_link.short_description = 'Product'

    def item_total_display(self, obj):
        return f"${obj.item_total:.2f}" 
    item_total_display.short_description = 'Item Total'


# Kustomisasi untuk RentalOrder
class RentalOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_username', 'status', 'total_price_display', 'item_count', 'created_at_formatted')
    list_filter = ('status', 'created_at', 'user')
    search_fields = ('id', 'user__username', 'items__product__name')
    list_select_related = ('user',) 
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at' 
    readonly_fields = ('user', 'total_price', 'created_at', 'updated_at',
                       'first_name', 'last_name', 'email_at_checkout', 'phone_at_checkout',
                       'billing_address', 'billing_city', 'billing_state', 'billing_zip', 'payment_reference')
    ordering = ('-created_at',)

    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'User'

    def total_price_display(self, obj):
        return f"${obj.total_price:.2f}"
    total_price_display.short_description = 'Total Price'
    total_price_display.admin_order_field = 'total_price'

    def created_at_formatted(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    created_at_formatted.short_description = 'Order Date'
    created_at_formatted.admin_order_field = 'created_at'

    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'

admin.site.register(RentalOrder, RentalOrderAdmin)

# ----------------------------------------------------
# ADMIN BARU UNTUK KERANJANG (CART)
# ----------------------------------------------------

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0 # Admin biasanya tidak menambahkan item ke cart secara manual
    readonly_fields = ('product_link', 'subtotal_display', 'added_at')
    fields = ('product_link', 'quantity', 'start_date', 'end_date', 'subtotal_display', 'added_at')
    # Anda bisa membuat field 'quantity', 'start_date', 'end_date' tidak readonly jika admin perlu mengubahnya
    # contoh: readonly_fields = ('product_link', 'subtotal_display', 'added_at')
    # kemudian fields akan menampilkan sisanya secara default.
    # Untuk sekarang, kita buat bisa diedit kecuali product dan subtotal.

    def product_link(self, obj):
        if obj.product:
            link = reverse("admin:melar_api_appproduct_change", args=[obj.product.id])
            return format_html('<a href="{}">{}</a>', link, obj.product.name)
        return "-"
    product_link.short_description = 'Product'

    def subtotal_display(self, obj):
        return f"${obj.subtotal:.2f}"
    subtotal_display.short_description = 'Subtotal'

@admin.register(Cart) # Cara lain untuk mendaftarkan model
class CartAdmin(admin.ModelAdmin):
    list_display = ('user_username_display', 'item_count_display', 'total_cart_price_display', 'updated_at_formatted')
    list_select_related = ('user',)
    search_fields = ('user__username',)
    list_filter = ('updated_at',)
    inlines = [CartItemInline]
    readonly_fields = ('user', 'created_at', 'updated_at', 'total_cart_price_display_detail')
    
    fieldsets = (
        (None, {
            'fields': ('user', ('created_at', 'updated_at'), 'total_cart_price_display_detail')
        }),
    )

    def user_username_display(self, obj):
        return obj.user.username
    user_username_display.short_description = 'User'
    user_username_display.admin_order_field = 'user__username'

    def item_count_display(self, obj):
        return obj.items.count()
    item_count_display.short_description = 'Items'

    def total_cart_price_display(self, obj):
        total = sum(item.subtotal for item in obj.items.all())
        return f"${total:.2f}"
    total_cart_price_display.short_description = 'Total Price'
    
    def total_cart_price_display_detail(self, obj): # Untuk tampilan di detail view
        return self.total_cart_price_display(obj)
    total_cart_price_display_detail.short_description = 'Total Cart Price'


    def updated_at_formatted(self, obj):
        return obj.updated_at.strftime('%Y-%m-%d %H:%M')
    updated_at_formatted.short_description = 'Last Updated'
    updated_at_formatted.admin_order_field = 'updated_at'

# Kita tidak perlu mendaftarkan CartItem secara terpisah jika sudah di-handle oleh inline
# admin.site.register(CartItem)