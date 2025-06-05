from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from cloudinary.models import CloudinaryField # Impor CloudinaryField
# import uuid # Aktifkan jika Anda memutuskan untuk menggunakan UUID untuk ID kustom

# Model untuk Profil Pengguna Tambahan
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # hasShop akan ditentukan dengan memeriksa apakah user memiliki relasi ke Shop
    # shopId juga bisa didapatkan dari user.shop.id jika relasinya OneToOne

    def __str__(self):
        return self.user.username

    @property
    def has_shop(self):
        return hasattr(self.user, 'shop') # Memeriksa apakah ada objek shop yang terhubung

    @property
    def shop_id(self):
        if self.has_shop:
            return self.user.shop.id
        return None

# Signal untuk membuat UserProfile setiap kali User dibuat
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except UserProfile.DoesNotExist:
        # Ini bisa terjadi jika User sudah ada sebelum UserProfile diimplementasikan
        # atau jika ada kasus di mana profile belum terbuat.
        UserProfile.objects.create(user=instance)


# Model untuk Kategori Produk/Toko
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    # Jika ingin menggunakan gambar untuk kategori:
    # image = CloudinaryField('category_image', folder='melar/category_images', null=True, blank=True) # Opsional

    class Meta:
        verbose_name_plural = "Categories" # Perbaikan untuk penamaan jamak di admin

    def __str__(self):
        return self.name

# Model untuk Toko (Shop)
class Shop(models.Model):
    # Menggunakan OneToOneField jika satu user hanya boleh punya satu toko
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='shop')
    name = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255) # Misal: "Jakarta Selatan, ID"
    rating = models.FloatField(default=0.0)
    total_rentals = models.IntegerField(default=0)
    # Diubah ke CloudinaryField
    image = CloudinaryField('foto_shop', folder='melar/shop_images', null=True, blank=True)
    categories = models.ManyToManyField(Category, related_name='shops_in_category', blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    zip_code = models.CharField(max_length=10, blank=True, null=True) # Mengganti nama field agar konsisten
    business_type = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Model untuk Produk (AppProduct)
class AppProduct(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2) # Harga per hari
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products_in_category')
    rating = models.FloatField(default=0.0)
    available = models.BooleanField(default=True) # Status utama ketersediaan
    # 'status' dan 'rentals' per produk bisa dihitung atau ditambahkan jika sangat sering diakses
    total_individual_rentals = models.PositiveIntegerField(default=0) # Jumlah berapa kali produk ini dirental
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Model untuk Gambar Produk
class ProductImage(models.Model):
    product = models.ForeignKey(AppProduct, related_name='product_images', on_delete=models.CASCADE)
    # Diubah ke CloudinaryField
    image = CloudinaryField('foto_produk', folder='melar/produk_images', null=True, blank=True)
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    order = models.PositiveIntegerField(default=0, help_text="Urutan gambar, gambar utama biasanya 0")

    class Meta:
        ordering = ['order'] # Urutkan gambar berdasarkan field order

    def __str__(self):
        return f"Image for {self.product.name} (Order: {self.order})"

# Model untuk Ulasan Produk (ProductReview)
class ProductReview(models.Model):
    product = models.ForeignKey(AppProduct, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField() # Misal 1-5, pastikan validasi di serializer/form
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.product.name} by {self.user.username}"

# Model untuk Pesanan Rental (RentalOrder)
class RentalOrder(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rental_orders')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('pending_whatsapp', 'Pending WhatsApp'), # <-- TAMBAHKAN INI
        ('confirmed', 'Confirmed'), # Pembayaran dikonfirmasi, barang siap diambil/dikirim
        ('active', 'Active'),       # Barang sedang disewa
        ('completed', 'Completed'), # Barang sudah dikembalikan
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_whatsapp')
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email_at_checkout = models.EmailField(blank=True) 
    phone_at_checkout = models.CharField(max_length=20, blank=True)
    billing_address = models.TextField(blank=True)
    billing_city = models.CharField(max_length=100, blank=True)
    billing_state = models.CharField(max_length=100, blank=True)
    billing_zip = models.CharField(max_length=10, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.id} by {self.user.username} - {self.status}"

# Model untuk Item dalam Pesanan Rental (OrderItem)
class OrderItem(models.Model):
    order = models.ForeignKey(RentalOrder, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(AppProduct, on_delete=models.PROTECT) 
    quantity = models.PositiveIntegerField(default=1)
    price_per_day_at_rental = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in Order {self.order.id}"

    @property
    def rental_duration_days(self):
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1 # +1 untuk inklusif
        return 0

    @property
    def item_total(self):
        return self.price_per_day_at_rental * self.rental_duration_days * self.quantity

# ---------------------------------------------
# MODEL BARU UNTUK KERANJANG (CART)
# ---------------------------------------------

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(AppProduct, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    start_date = models.DateField()
    end_date = models.DateField()
    added_at = models.DateTimeField(auto_now_add=True) 

    class Meta:
        unique_together = ('cart', 'product', 'start_date', 'end_date')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (for {self.cart.user.username})"

    @property
    def rental_duration_days_cart(self): 
        if self.start_date and self.end_date:
            duration = (self.end_date - self.start_date).days + 1
            return max(1, duration) 
        return 0

    @property
    def subtotal(self):
        return self.product.price * self.rental_duration_days_cart * self.quantity
