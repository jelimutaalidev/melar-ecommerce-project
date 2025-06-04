from rest_framework import serializers
from django.db import models # Pastikan models diimpor jika Anda menggunakan models.DateField()
from .models import (
    UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem,
    Cart, CartItem
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

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) # Ini akan serialize objek User terkait
    # has_shop dan shop_id adalah properties pada model UserProfile
    # DRF akan mengambilnya jika disebutkan di Meta.fields
    has_shop = serializers.BooleanField(read_only=True)
    shop_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = UserProfile # <-- PERBAIKAN: Model harus UserProfile
        fields = ['id', 'user', 'has_shop', 'shop_id'] # <-- PERBAIKAN: Sertakan field dari UserProfile


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'order']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and request:
            representation['image'] = request.build_absolute_uri(instance.image.url)
        return representation

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

class AppProductSerializer(serializers.ModelSerializer):
    shop_id = serializers.IntegerField(write_only=True, source='shop.id', required=False)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    images = serializers.SerializerMethodField(read_only=True)
    owner_info = serializers.SerializerMethodField(read_only=True) 

    class Meta:
        model = AppProduct
        fields = [
            'id', 'shop_id', 'shop_name', 'name', 'description', 'price', 
            'category_id', 'category_name', 'rating', 'available', 
            'total_individual_rentals', 'images', 'owner_info', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ('rating', 'total_individual_rentals', 'created_at', 'updated_at')

    def get_images(self, instance):
        request = self.context.get('request')
        if instance.product_images.exists() and request:
            return [request.build_absolute_uri(img.image.url) for img in instance.product_images.all().order_by('order')]
        return []

    def get_owner_info(self, obj):
        return {
            'id': str(obj.shop.id), 
            'name': obj.shop.name
        }
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.category:
            representation['category_name'] = instance.category.name 
        else:
            representation['category_name'] = None 
        if 'category' in representation and isinstance(representation['category'], int): 
            del representation['category'] 
        return representation

class ProductReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True) 

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'user', 'rating', 'comment', 'created_at']
        read_only_fields = ('created_at', 'user') 

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

class ProductInfoForOrderItemSerializer(serializers.ModelSerializer):
    main_image = serializers.SerializerMethodField()
    shop_id = serializers.IntegerField(source='shop.id', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = AppProduct
        fields = [
            'id', 'name', 'price', 'main_image', 
            'shop_id', 'shop_name', 
        ]

    def get_main_image(self, obj): 
        request = self.context.get('request')
        first_image_instance = obj.product_images.order_by('order').first()
        if request and first_image_instance and first_image_instance.image:
            return request.build_absolute_uri(first_image_instance.image.url)
        return None

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductInfoForOrderItemSerializer(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True) 

    class Meta:
        model = OrderItem
        fields = [
            'id', 
            'product', 
            'product_name', 
            'product_image', 
            'quantity', 
            'price_per_day_at_rental', 
            'start_date', 
            'end_date', 
            'item_total'
        ]
        read_only_fields = ('item_total',) 

    def get_product_image(self, obj): 
        if obj.product and hasattr(obj.product, 'main_image'):
            if isinstance(obj.product, dict) and obj.product.get('main_image'): 
                return obj.product.get('main_image')

        request = self.context.get('request')
        # Memastikan obj.product adalah instance AppProduct atau memiliki ID yang bisa digunakan untuk query
        product_id_to_fetch = None
        if hasattr(obj.product, 'id') and not isinstance(obj.product, int): # Jika obj.product adalah objek/dict dengan 'id'
             product_id_to_fetch = obj.product.id
        elif isinstance(obj.product, int): # Jika obj.product adalah integer (ID)
             product_id_to_fetch = obj.product
        
        if product_id_to_fetch:
            try:
                app_product_instance = AppProduct.objects.get(id=product_id_to_fetch)
                first_image_model_instance = app_product_instance.product_images.order_by('order').first()
                if request and first_image_model_instance and first_image_model_instance.image:
                        return request.build_absolute_uri(first_image_model_instance.image.url)
            except AppProduct.DoesNotExist:
                return None # Atau gambar placeholder
        return None


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
        read_only_fields = ('total_price', 'created_at', 'updated_at', 'user', 'items')

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items_data', [])
        
        calculated_total_price = 0
        items_to_be_created_instances = []

        for item_data in order_items_data:
            product_instance = AppProduct.objects.get(id=item_data['product_id'])
            quantity = item_data['quantity']
            start_date_str = item_data['start_date']
            end_date_str = item_data['end_date']
            
            if not all([product_instance, quantity, start_date_str, end_date_str]):
                raise serializers.ValidationError("Missing data for one of the order items.")

            s_date = models.DateField().to_python(start_date_str)
            e_date = models.DateField().to_python(end_date_str)

            if e_date < s_date:
                raise serializers.ValidationError(f"For product '{product_instance.name}', end date cannot be before start date.")
            
            duration_days = (e_date - s_date).days + 1 
            duration_days = max(1, duration_days) 

            price_per_day = product_instance.price
            item_total = price_per_day * duration_days * quantity
            calculated_total_price += item_total
            
            items_to_be_created_instances.append(
                OrderItem(
                    product=product_instance, 
                    quantity=quantity, 
                    price_per_day_at_rental=price_per_day,
                    start_date=s_date, 
                    end_date=e_date
                )
            )
        
        validated_data['total_price'] = calculated_total_price
        order = RentalOrder.objects.create(**validated_data) 
        
        for item_instance in items_to_be_created_instances:
            item_instance.order = order
            item_instance.save() 
            
        return order

class ProductInfoForCartSerializer(serializers.ModelSerializer):
    main_image = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    shop_id = serializers.IntegerField(source='shop.id', read_only=True)

    class Meta:
        model = AppProduct
        fields = ['id', 'name', 'price', 'main_image', 'shop_name', 'shop_id']

    def get_main_image(self, obj):
        request = self.context.get('request')
        first_image = obj.product_images.order_by('order').first()
        if request and first_image and first_image.image:
            return request.build_absolute_uri(first_image.image.url)
        return None

class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductInfoForCartSerializer(source='product', read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=AppProduct.objects.all(), source='product', write_only=True
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'cart', 'product_id', 'product_detail', 'quantity',
            'start_date', 'end_date', 'added_at', 'subtotal'
        ]
        read_only_fields = ['id', 'added_at', 'subtotal', 'cart']

    def validate(self, data):
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))

        if start_date and end_date:
            if end_date < start_date:
                raise serializers.ValidationError({"non_field_errors": "End date cannot be before start date."}) 
        elif 'start_date' in data and not data.get('start_date'):
             raise serializers.ValidationError({"start_date": "Start date is required."})
        elif 'end_date' in data and not data.get('end_date'):
             raise serializers.ValidationError({"end_date": "End date is required."})
        return data

class CartSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_cart_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'created_at', 'updated_at', 'total_cart_price']
        read_only_fields = ['id', 'user', 'items', 'created_at', 'updated_at', 'total_cart_price']

    def get_total_cart_price(self, obj):
        return sum(item.subtotal for item in obj.items.all())

