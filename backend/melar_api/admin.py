from django.contrib import admin
from django.utils.html import format_html # Untuk menampilkan gambar di admin
from .models import UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem

# Kustomisasi untuk UserProfile
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user_username', 'user_email', 'has_shop_status', 'shop_id_display')
    search_fields = ('user__username', 'user__email')
    list_select_related = ('user', 'user__shop') # Optimasi query

    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'Username'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'

    def has_shop_status(self, obj):
        return obj.has_shop
    has_shop_status.boolean = True # Menampilkan sebagai ikon True/False
    has_shop_status.short_description = 'Has Shop'

    def shop_id_display(self, obj):
        # Menggunakan related_name 'shop' dari User ke Shop (OneToOneField)
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
        return obj.products_in_category.count() # Menggunakan related_name dari AppProduct.category
    product_count.short_description = 'Number of Products'

admin.site.register(Category, CategoryAdmin)

# Inline untuk ProductImage di AppProductAdmin
class ProductImageInline(admin.TabularInline): # Atau admin.StackedInline untuk tampilan berbeda
    model = ProductImage
    extra = 1 # Jumlah form kosong untuk gambar baru yang bisa ditambahkan
    readonly_fields = ('image_preview',) # Menampilkan preview gambar

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
    list_select_related = ('shop', 'category') # Optimasi query
    inlines = [ProductImageInline] # Mengelola ProductImage langsung di halaman AppProduct
    ordering = ('-created_at',)

    def shop_name(self, obj):
        return obj.shop.name
    shop_name.short_description = 'Shop'

    def category_name(self, obj):
        return obj.category.name if obj.category else '-'
    category_name.short_description = 'Category'

    def image_count(self, obj):
        return obj.product_images.count() # Menggunakan related_name dari ProductImage.product
    image_count.short_description = 'Images'

admin.site.register(AppProduct, AppProductAdmin)

# Kustomisasi untuk Shop
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_username', 'location', 'rating', 'total_rentals', 'product_count_in_shop', 'created_at')
    list_filter = ('location', 'business_type', 'categories')
    search_fields = ('name', 'description', 'owner__username')
    filter_horizontal = ('categories',) # Membuat pilihan ManyToManyField lebih mudah digunakan
    list_select_related = ('owner',) # Optimasi query
    readonly_fields = ('image_preview_admin',)
    ordering = ('-created_at',)

    def owner_username(self, obj):
        return obj.owner.username
    owner_username.short_description = 'Owner'

    def product_count_in_shop(self, obj):
        return obj.products.count() # Menggunakan related_name dari AppProduct.shop
    product_count_in_shop.short_description = 'Products'

    def image_preview_admin(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="150" height="auto" />', obj.image.url)
        return "(No image)"
    image_preview_admin.short_description = 'Logo Preview'

admin.site.register(Shop, ShopAdmin)


# Kustomisasi untuk ProductReview
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('product_name', 'user_username', 'rating', 'created_at_formatted')
    list_filter = ('rating', 'created_at', 'product')
    search_fields = ('comment', 'product__name', 'user__username')
    list_select_related = ('product', 'user') # Optimasi query
    readonly_fields = ('product', 'user', 'rating', 'comment', 'created_at') # Seringkali review tidak diubah dari admin
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
    extra = 0 # Biasanya item order tidak ditambahkan/diedit manual dari admin order
    readonly_fields = ('product_link', 'quantity', 'price_per_day_at_rental', 'start_date', 'end_date', 'rental_duration_days', 'item_total_display')
    can_delete = False # Mencegah penghapusan item dari order secara langsung (harus melalui logika bisnis)
    max_num = 0 # Mencegah penambahan item baru dari sini

    def product_link(self, obj):
        if obj.product:
            from django.urls import reverse
            link = reverse("admin:melar_api_appproduct_change", args=[obj.product.id])
            return format_html('<a href="{}">{}</a>', link, obj.product.name)
        return "-"
    product_link.short_description = 'Product'

    def item_total_display(self, obj):
        return f"${obj.item_total:.2f}" # Menggunakan property dari model
    item_total_display.short_description = 'Item Total'


# Kustomisasi untuk RentalOrder
class RentalOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_username', 'status', 'total_price_display', 'item_count', 'created_at_formatted')
    list_filter = ('status', 'created_at', 'user')
    search_fields = ('id', 'user__username', 'items__product__name')
    list_select_related = ('user',) # Optimasi query
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at' # Navigasi cepat berdasarkan tanggal
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

# Model ProductImage dan OrderItem biasanya tidak perlu didaftarkan secara terpisah
# jika sudah dikelola melalui Inlines di model induknya (AppProduct dan RentalOrder).
# Jika Anda ingin bisa menambah/mengeditnya secara mandiri, Anda bisa mendaftarkannya:
# admin.site.register(ProductImage)
# admin.site.register(OrderItem)