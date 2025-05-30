from rest_framework import serializers
from django.db import models # <--- TAMBAHKAN BARIS INI
from .models import UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem
from django.contrib.auth.models import User

from dj_rest_auth.registration.serializers import RegisterSerializer as DefaultRegisterSerializer

class CustomRegisterSerializer(DefaultRegisterSerializer):
    first_name = serializers.CharField(required=False) # Jadikan opsional atau required sesuai kebutuhan
    last_name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()
        # Di sini Anda juga bisa menambahkan logika untuk UserProfile jika perlu
        # UserProfile.objects.filter(user=user).update(...)

# Serializer untuk User (untuk menampilkan info owner/user)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

# Serializer untuk UserProfile (jika Anda ingin mengeksposnya secara terpisah)
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) # Tampilkan detail user, bukan hanya ID
    has_shop = serializers.BooleanField(read_only=True) # Ambil dari property model
    shop_id = serializers.IntegerField(read_only=True) # Ambil dari property model

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'has_shop', 'shop_id']


# Serializer untuk Category
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description'] # Tambahkan field lain jika ada

# Serializer untuk ProductImage (digunakan sebagai nested serializer di AppProduct)
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'order']

# Serializer untuk Shop
class ShopSerializer(serializers.ModelSerializer):
    # owner = UserSerializer(read_only=True) # Menampilkan detail owner, bukan hanya ID
    # Jika Anda ingin bisa set owner saat membuat/update Shop via API (misal oleh admin):
    owner_id = serializers.IntegerField(write_only=True, source='owner.id', required=False)
    owner_username = serializers.CharField(source='owner.username', read_only=True) # Untuk tampilan
    categories = CategorySerializer(many=True, read_only=True) # Menampilkan detail kategori
    # Jika Anda ingin bisa set kategori saat membuat/update Shop via API dengan ID kategori:
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), source='categories', write_only=True, required=False
    )
    product_count = serializers.IntegerField(source='products.count', read_only=True) # Jumlah produk di toko

    class Meta:
        model = Shop
        fields = [
            'id', 'owner_id', 'owner_username', 'name', 'description', 'location', 'rating',
            'total_rentals', 'image', 'categories', 'category_ids', 'phone_number',
            'address', 'zip_code', 'business_type', 'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ('rating', 'total_rentals', 'created_at', 'updated_at')

    # Anda bisa menambahkan validasi atau representasi kustom di sini jika perlu
    # Contoh: Menampilkan URL lengkap untuk gambar
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.image:
            representation['image'] = instance.image.url
        return representation

# Serializer untuk AppProduct
class AppProductSerializer(serializers.ModelSerializer):
    shop_id = serializers.IntegerField(write_only=True, source='shop.id') # Untuk set shop saat create/update
    shop_name = serializers.CharField(source='shop.name', read_only=True) # Untuk tampilan
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    # Jika Anda ingin bisa set category saat membuat/update AppProduct via API dengan ID kategori:
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    # Untuk menampilkan ProductImage
    product_images = ProductImageSerializer(many=True, read_only=True)
    # Untuk upload ProductImage (jika tidak dihandle terpisah)
    # uploaded_images = serializers.ListField(
    #     child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
    #     write_only=True, required=False
    # )
    owner_info = serializers.SerializerMethodField(read_only=True) # Sesuai frontend types.ts

    class Meta:
        model = AppProduct
        fields = [
            'id', 'shop_id', 'shop_name', 'name', 'description', 'price', 'category_id', 'category_name',
            'rating', 'available', 'total_individual_rentals', 'product_images', # 'uploaded_images',
            'owner_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ('rating', 'total_individual_rentals', 'created_at', 'updated_at')

    def get_owner_info(self, obj):
        return {
            'id': obj.shop.id, # ID Toko
            'name': obj.shop.name # Nama Toko
        }

    # Contoh jika Anda ingin menghandle upload gambar saat membuat produk
    # def create(self, validated_data):
    #     uploaded_images_data = validated_data.pop('uploaded_images', None)
    #     product = AppProduct.objects.create(**validated_data)
    #     if uploaded_images_data:
    #         for image_data in uploaded_images_data:
    #             ProductImage.objects.create(product=product, image=image_data)
    #     return product

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Mengubah format product_images agar sesuai dengan frontend yang mengharapkan array string URL
        if instance.product_images.exists():
            request = self.context.get('request')
            representation['images'] = [request.build_absolute_uri(img.image.url) for img in instance.product_images.all()]
        else:
            representation['images'] = [] # Frontend mengharapkan array string untuk images
        # Hapus field product_images jika frontend tidak membutuhkannya dan hanya butuh 'images'
        if 'product_images' in representation:
            del representation['product_images']

        # Frontend type untuk category adalah string, bukan objek
        if instance.category:
            representation['category'] = instance.category.name
        else:
            representation['category'] = None # atau string kosong jika lebih sesuai

        # Frontend type untuk owner adalah object {id, name}
        # sudah dihandle oleh get_owner_info dan owner_info field

        # Tambahkan representasi owner dari types.ts
        # representation['owner'] = {
        #     'id': instance.shop.id,
        #     'name': instance.shop.name
        # }

        return representation

# Serializer untuk ProductReview
class ProductReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) # Menampilkan detail user
    # Jika Anda ingin user bisa membuat review dengan mengirim user_id:
    # user_id = serializers.IntegerField(write_only=True, source='user.id')

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'user', 'rating', 'comment', 'created_at']
        read_only_fields = ('created_at',)

    # Validasi untuk rating (misalnya 1-5)
    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

# Serializer untuk OrderItem
class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'quantity', 'price_per_day_at_rental', 'start_date', 'end_date', 'item_total']
        read_only_fields = ('item_total',) # item_total adalah property

    def get_product_image(self, obj):
        request = self.context.get('request')
        first_image = obj.product.product_images.first()
        if request and first_image and first_image.image:
            return request.build_absolute_uri(first_image.image.url)
        return None # atau URL placeholder

# Serializer untuk RentalOrder
class RentalOrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True) # Nested serializer untuk OrderItem
    # Untuk membuat order, kita akan mengharapkan daftar item ID, quantity, start_date, end_date
    order_items_data = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False
    )

    class Meta:
        model = RentalOrder
        fields = [
            'id', 'user', 'items', 'total_price', 'status', 'created_at', 'updated_at',
            'first_name', 'last_name', 'email_at_checkout', 'phone_at_checkout',
            'billing_address', 'billing_city', 'billing_state', 'billing_zip',
            'payment_reference', 'order_items_data'
        ]
        read_only_fields = ('total_price', 'created_at', 'updated_at') # Total price akan dihitung di backend

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items_data', [])
        # Dapatkan user dari request (akan dihandle di ViewSet)
        user = self.context['request'].user
        validated_data['user'] = user

        # Hitung total_price berdasarkan order_items_data di backend untuk keamanan
        calculated_total_price = 0
        items_to_create = []

        for item_data in order_items_data:
            product = AppProduct.objects.get(id=item_data['product_id'])
            quantity = item_data['quantity']
            start_date = item_data['start_date']
            end_date = item_data['end_date']
            
            # Hitung durasi rental
            s_date = models.DateField().to_python(start_date) # Konversi string ke objek date
            e_date = models.DateField().to_python(end_date)
            duration_days = (e_date - s_date).days + 1
            
            price_per_day = product.price
            item_total = price_per_day * duration_days * quantity
            calculated_total_price += item_total
            
            items_to_create.append(
                OrderItem(
                    product=product,
                    quantity=quantity,
                    price_per_day_at_rental=price_per_day,
                    start_date=start_date,
                    end_date=end_date
                    # order akan di-set setelah RentalOrder dibuat
                )
            )

        validated_data['total_price'] = calculated_total_price
        order = RentalOrder.objects.create(**validated_data)

        for item_instance in items_to_create:
            item_instance.order = order
            item_instance.save()
            # Kurangi stok produk atau tandai sebagai tidak tersedia jika perlu
            # product = item_instance.product
            # product.available = False # Atau kurangi stok
            # product.save()

        return order