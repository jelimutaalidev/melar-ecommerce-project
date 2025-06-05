from rest_framework import serializers
from django.db import models # Pastikan models diimpor jika Anda menggunakan models.DateField()
from .models import (
    UserProfile, Category, Shop, AppProduct, ProductImage, ProductReview, RentalOrder, OrderItem,
    Cart, CartItem
)
from django.contrib.auth.models import User
from dj_rest_auth.registration.serializers import RegisterSerializer as DefaultRegisterSerializer
import logging # Import logging

logger = logging.getLogger(__name__) # Buat instance logger

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
    user = UserSerializer(read_only=True)
    has_shop = serializers.BooleanField(read_only=True)
    shop_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'has_shop', 'shop_id']


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
        
        if instance.image:
            image_url = None
            if hasattr(instance.image, 'url'): 
                image_url = instance.image.url
            elif isinstance(instance.image, str): # Jika sudah string URL
                image_url = instance.image
            
            if image_url and request:
                representation['image'] = request.build_absolute_uri(image_url)
            elif image_url: # Fallback jika request tidak ada di context
                representation['image'] = image_url
            else:
                representation['image'] = None # Kasus jika instance.image ada tapi tidak punya URL dan bukan string
        else:
            representation['image'] = None
        return representation


class ShopSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True, required=False)
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
        read_only_fields = ('id', 'owner_username', 'rating', 'total_rentals', 'categories', 'product_count', 'created_at', 'updated_at')

    def create(self, validated_data):
        owner_id_val = validated_data.pop('owner_id', None)
        category_data = validated_data.pop('categories', []) 

        if owner_id_val:
            try:
                user_instance = User.objects.get(pk=owner_id_val)
                validated_data['owner'] = user_instance
            except User.DoesNotExist:
                raise serializers.ValidationError({'owner_id': f"User with id {owner_id_val} does not exist."})
        else:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                validated_data['owner'] = request.user
            else:
                # Jika owner_id tidak ada dan user tidak terautentikasi (misalnya dari admin)
                # Anda mungkin perlu logika berbeda atau raise error jika owner wajib
                if not validated_data.get('owner'): # Pastikan owner belum di-set
                    raise serializers.ValidationError({'owner_id': "Shop owner is required."})


        shop = Shop.objects.create(**validated_data)
        if category_data: 
            shop.categories.set(category_data)
        return shop

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if instance.image and hasattr(instance.image, 'url') and request:
            representation['image'] = request.build_absolute_uri(instance.image.url)
        elif instance.image: 
             representation['image'] = str(instance.image)
        return representation

class AppProductSerializer(serializers.ModelSerializer):
    shop_id = serializers.IntegerField(write_only=True, required=True)
    category_id = serializers.IntegerField(write_only=True, required=True)

    # Field ini ada untuk DRF mengenali bahwa 'images' bisa jadi bagian dari data,
    # namun kita akan mengambilnya secara manual dari request.FILES di method 'create'.
    # Ini juga membantu untuk validasi dasar jika DRF memprosesnya.
    images_from_form = serializers.ListField( 
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False, # Gambar tidak wajib
        max_length=5,
        label="Upload images (up to 5)" # Label untuk browsable API
        # Tidak menggunakan 'source' agar tidak ada konflik saat kita ambil manual dari request.FILES['images']
    )

    images = serializers.SerializerMethodField(read_only=True) 
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    owner_info = serializers.SerializerMethodField(read_only=True) 

    class Meta:
        model = AppProduct
        fields = [
            'id', 
            'shop_id',      
            'shop_name',    
            'name', 
            'description', 
            'price', 
            'category_id',  
            'category_name',
            'rating', 
            'available', 
            'total_individual_rentals', 
            'images',       
            'images_from_form', # Nama field input gambar di serializer
            'owner_info', 
            'created_at', 
            'updated_at'
        ]
        read_only_fields = (
            'id', 'shop_name', 'category_name', 'images', 'owner_info', 
            'rating', 'total_individual_rentals', 'created_at', 'updated_at'
        )

    def get_images(self, instance):
        request = self.context.get('request')
        logger.debug(f"[AppProductSerializer DEBUG] get_images called for product ID: {instance.id}")
        image_instances = instance.product_images.all().order_by('order')
        logger.debug(f"[AppProductSerializer DEBUG] Found image_instances in get_images: {list(image_instances)}")
        if image_instances.exists() and request:
            serialized_images = ProductImageSerializer(image_instances, many=True, context={'request': request}).data
            logger.debug(f"[AppProductSerializer DEBUG] Serialized images for output in get_images: {serialized_images}")
            return serialized_images
        logger.debug("[AppProductSerializer DEBUG] No image instances or no request in context for get_images.")
        return []

    def get_owner_info(self, obj):
        if obj.shop: 
            return {
                'id': str(obj.shop.id), 
                'name': obj.shop.name
            }
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        logger.debug(f"[AppProductSerializer DEBUG] Entering create method.")
        logger.debug(f"[AppProductSerializer DEBUG] Initial validated_data keys: {list(validated_data.keys())}")
        logger.debug(f"[AppProductSerializer DEBUG] request.data keys: {list(request.data.keys()) if request else 'No request in context'}")
        logger.debug(f"[AppProductSerializer DEBUG] request.FILES keys: {list(request.FILES.keys()) if request else 'No request in context'}")
        
        # PERUBAHAN UTAMA: Ambil berkas langsung dari request.FILES
        image_files = []
        if request and hasattr(request, 'FILES'):
            image_files = request.FILES.getlist('images') # 'images' adalah kunci dari FormData frontend
            logger.info(f"[AppProductSerializer INFO] Files retrieved from request.FILES.getlist('images'): {len(image_files)} files.")
            for i, img_file in enumerate(image_files):
                logger.debug(f"[AppProductSerializer DEBUG] File {i} from request.FILES: Name - {getattr(img_file, 'name', 'N/A')}, Size - {getattr(img_file, 'size', 'N/A')}")
        else:
            logger.warning("[AppProductSerializer WARNING] No request object or no FILES attribute in request context found.")

        # Hapus field input gambar dari validated_data agar tidak menyebabkan error saat create AppProduct
        # karena field ini bukan field asli model AppProduct.
        validated_data.pop('images_from_form', None) 
        
        shop_id_val = validated_data.pop('shop_id')
        category_id_val = validated_data.pop('category_id')
        logger.debug(f"[AppProductSerializer DEBUG] Popped shop_id: {shop_id_val}, category_id: {category_id_val}")

        try:
            shop_instance = Shop.objects.get(pk=shop_id_val)
            logger.debug(f"[AppProductSerializer DEBUG] Fetched shop_instance: {shop_instance}")
        except Shop.DoesNotExist:
            logger.error(f"[AppProductSerializer ERROR] Shop with id {shop_id_val} does not exist.")
            raise serializers.ValidationError({'shop_id': f"Shop with id {shop_id_val} does not exist."})
        
        try:
            category_instance = Category.objects.get(pk=category_id_val)
            logger.debug(f"[AppProductSerializer DEBUG] Fetched category_instance: {category_instance}")
        except Category.DoesNotExist:
            logger.error(f"[AppProductSerializer ERROR] Category with id {category_id_val} does not exist.")
            raise serializers.ValidationError({'category_id': f"Category with id {category_id_val} does not exist."})

        validated_data['shop'] = shop_instance
        validated_data['category'] = category_instance
        logger.debug(f"[AppProductSerializer DEBUG] Validated_data before AppProduct.objects.create: {validated_data}")
        
        product = AppProduct.objects.create(**validated_data)
        logger.info(f"[AppProductSerializer INFO] Product created with ID: {product.id}")

        if not image_files: 
            logger.warning(f"[AppProductSerializer WARNING] No image files were retrieved from request.FILES to create ProductImage for product {product.id}.")
        
        for i, image_file_data in enumerate(image_files): 
            try:
                logger.debug(f"[AppProductSerializer DEBUG] Attempting to create ProductImage {i+1} for product {product.id} with file: {getattr(image_file_data, 'name', 'N/A')}")
                pi = ProductImage.objects.create(product=product, image=image_file_data) 
                logger.info(f"[AppProductSerializer INFO] ProductImage {i+1} created with ID: {pi.id}. Image URL (from CloudinaryField): {pi.image.url if pi.image and hasattr(pi.image, 'url') else 'No image URL/object'}")
            except Exception as e:
                logger.error(f"[AppProductSerializer CRITICAL] Error creating ProductImage {i+1} for product {product.id}: {e}", exc_info=True)
        
        created_images_count = product.product_images.count()
        logger.info(f"[AppProductSerializer INFO] Total ProductImages successfully linked to product {product.id}: {created_images_count}")
        
        return product

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.category:
            representation['category_name'] = instance.category.name 
        else:
            representation['category_name'] = None 
        
        representation.pop('images_from_form', None) 
        representation.pop('shop_id', None) 
        representation.pop('category_id', None) 
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
            if hasattr(first_image_instance.image, 'url'):
                return request.build_absolute_uri(first_image_instance.image.url)
            return str(first_image_instance.image)
        return None

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductInfoForOrderItemSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 
            'product', 
            'quantity', 
            'price_per_day_at_rental', 
            'start_date', 
            'end_date', 
            'item_total'
        ]
        read_only_fields = ('item_total',) 

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
            if hasattr(first_image.image, 'url'):
                return request.build_absolute_uri(first_image.image.url)
            return str(first_image.image)
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
        elif 'start_date' in data and not data.get('start_date') and not self.instance:
             raise serializers.ValidationError({"start_date": "Start date is required."})
        elif 'end_date' in data and not data.get('end_date') and not self.instance:
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

