from rest_framework import serializers
from django.db import models
from .models import (
    UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem,
    Cart, CartItem  # <-- TAMBAHKAN Cart dan CartItem
)
from django.contrib.auth.models import User

from dj_rest_auth.registration.serializers import RegisterSerializer as DefaultRegisterSerializer

class CustomRegisterSerializer(DefaultRegisterSerializer):
    first_name = serializers.CharField(required=False, max_length=30, allow_blank=True)
    last_name = serializers.CharField(required=False, max_length=30, allow_blank=True)

    def custom_signup(self, request, user):
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()

# Serializer untuk User (untuk menampilkan info owner/user)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

# Serializer untuk UserProfile (jika Anda ingin mengeksposnya secara terpisah)
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    has_shop = serializers.BooleanField(read_only=True)
    shop_id = serializers.IntegerField(read_only=True, source='shop_id', allow_null=True) # source dari property

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'has_shop', 'shop_id']


# Serializer untuk Category
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

# Serializer untuk ProductImage (digunakan sebagai nested serializer di AppProduct)
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'order']

# Serializer untuk Shop
class ShopSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True, source='owner.id', required=False)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Category.objects.all(), source='categories', write_only=True, required=False
    )
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Shop
        fields = [
            'id', 'owner_id', 'owner_username', 'name', 'description', 'location', 'rating',
            'total_rentals', 'image', 'categories', 'category_ids', 'phone_number',
            'address', 'zip_code', 'business_type', 'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ('rating', 'total_rentals', 'created_at', 'updated_at')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and request:
            representation['image'] = request.build_absolute_uri(instance.image.url)
        return representation

# Serializer untuk AppProduct
class AppProductSerializer(serializers.ModelSerializer):
    shop_id = serializers.IntegerField(write_only=True, source='shop.id', required=False) # required=False jika tidak selalu dibutuhkan saat update
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    product_images_data = ProductImageSerializer(many=True, read_only=True, source='product_images') # Ganti nama field 'product_images' menjadi 'product_images_data' agar tidak bentrok
    images = serializers.SerializerMethodField(read_only=True) # Field 'images' untuk frontend
    owner_info = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AppProduct
        fields = [
            'id', 'shop_id', 'shop_name', 'name', 'description', 'price', 'category_id', 'category_name',
            'rating', 'available', 'total_individual_rentals', 'product_images_data', 'images',
            'owner_info', 'created_at', 'updated_at'
        ]
        read_only_fields = ('rating', 'total_individual_rentals', 'created_at', 'updated_at')

    def get_images(self, instance):
        request = self.context.get('request')
        if instance.product_images.exists() and request:
            return [request.build_absolute_uri(img.image.url) for img in instance.product_images.all()]
        return []

    def get_owner_info(self, obj):
        return {
            'id': str(obj.shop.id), # Pastikan ID adalah string
            'name': obj.shop.name
        }
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Hapus product_images_data karena sudah ada 'images'
        if 'product_images_data' in representation:
            del representation['product_images_data']
        # Pastikan category adalah nama, bukan objek
        if instance.category:
            representation['category'] = instance.category.name
        else:
            representation['category'] = None
        return representation


# Serializer untuk ProductReview
class ProductReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'user', 'rating', 'comment', 'created_at']
        read_only_fields = ('created_at',)

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
        read_only_fields = ('item_total',)

    def get_product_image(self, obj):
        request = self.context.get('request')
        first_image = obj.product.product_images.first()
        if request and first_image and first_image.image:
            return request.build_absolute_uri(first_image.image.url)
        return None

# Serializer untuk RentalOrder
class RentalOrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
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
        read_only_fields = ('total_price', 'created_at', 'updated_at')

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items_data', [])
        user = self.context['request'].user
        validated_data['user'] = user
        calculated_total_price = 0
        items_to_create = []
        for item_data in order_items_data:
            product = AppProduct.objects.get(id=item_data['product_id'])
            quantity = item_data['quantity']
            start_date_str = item_data['start_date']
            end_date_str = item_data['end_date']
            
            # Konversi string tanggal ke objek date
            s_date = models.DateField().to_python(start_date_str)
            e_date = models.DateField().to_python(end_date_str)
            
            duration_days = (e_date - s_date).days + 1
            price_per_day = product.price
            item_total = price_per_day * duration_days * quantity
            calculated_total_price += item_total
            items_to_create.append(
                OrderItem(
                    product=product, quantity=quantity, price_per_day_at_rental=price_per_day,
                    start_date=s_date, end_date=e_date
                )
            )
        validated_data['total_price'] = calculated_total_price
        order = RentalOrder.objects.create(**validated_data)
        for item_instance in items_to_create:
            item_instance.order = order
            item_instance.save()
        return order

# ----------------------------------------------------
# SERIALIZER BARU UNTUK KERANJANG (CART) DAN CARTITEM
# ----------------------------------------------------

class ProductInfoForCartSerializer(serializers.ModelSerializer):
    """
    Serializer sederhana untuk menampilkan informasi produk di dalam CartItem.
    """
    main_image = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = AppProduct
        fields = ['id', 'name', 'price', 'main_image', 'shop_name'] # Sesuaikan field sesuai kebutuhan frontend

    def get_main_image(self, obj):
        request = self.context.get('request')
        first_image = obj.product_images.first()
        if request and first_image and first_image.image:
            return request.build_absolute_uri(first_image.image.url)
        return None

class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer untuk CartItem.
    """
    product_detail = ProductInfoForCartSerializer(source='product', read_only=True) # Untuk GET (membaca detail produk)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=AppProduct.objects.all(), source='product', write_only=True
    ) # Untuk POST/PUT (menulis/mengupdate item dengan ID produk)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True) # Dari property model

    class Meta:
        model = CartItem
        fields = [
            'id',
            'cart', # Biasanya ID cart tidak perlu dikirim dari frontend saat membuat item, akan di-set di view
            'product_id',       # Untuk write operations (POST, PUT)
            'product_detail',   # Untuk read operations (GET)
            'quantity',
            'start_date',
            'end_date',
            'added_at',
            'subtotal'
        ]
        read_only_fields = ['id', 'added_at', 'subtotal', 'cart']
        # 'cart' bisa di-set di view berdasarkan user yang terautentikasi

    def validate(self, data):
        # Validasi bahwa end_date tidak boleh sebelum start_date
        # self.instance akan ada saat update (PUT/PATCH)
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))

        if start_date and end_date:
            if end_date < start_date:
                raise serializers.ValidationError("End date cannot be before start date.")
            if start_date == end_date: # Jika periode hanya 1 hari
                pass # Ini valid
            # Anda bisa menambahkan validasi lain, misal durasi rental minimum/maksimum
        elif 'start_date' in data and not data.get('start_date'): # Jika start_date dikirim tapi kosong
             raise serializers.ValidationError({"start_date": "Start date is required."})
        elif 'end_date' in data and not data.get('end_date'): # Jika end_date dikirim tapi kosong
             raise serializers.ValidationError({"end_date": "End date is required."})

        return data

class CartSerializer(serializers.ModelSerializer):
    """
    Serializer untuk Cart.
    """
    user = UserSerializer(read_only=True)
    items = CartItemSerializer(many=True, read_only=True) # Menampilkan semua item dalam keranjang
    total_cart_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'created_at', 'updated_at', 'total_cart_price']
        read_only_fields = ['id', 'user', 'items', 'created_at', 'updated_at', 'total_cart_price']

    def get_total_cart_price(self, obj):
        # Menghitung total harga dari semua item di keranjang
        return sum(item.subtotal for item in obj.items.all())