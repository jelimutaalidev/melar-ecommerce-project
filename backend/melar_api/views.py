from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    UserProfile, Category, Shop, AppProduct,
    ProductImage, ProductReview, RentalOrder, OrderItem
)
from .serializers import (
    UserSerializer, UserProfileSerializer, CategorySerializer, ShopSerializer,
    AppProductSerializer, ProductImageSerializer, ProductReviewSerializer,
    RentalOrderSerializer, OrderItemSerializer
)
# Mengimpor permission kustom yang telah kita buat
from .permissions import (
    IsOwnerOrReadOnly, IsShopOwnerOrReadOnlyForProduct,
    IsReviewAuthorOrReadOnly, IsOrderOwner
)

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows users to be viewed.
    Only accessible by admin users.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

class UserProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user profiles.
    Users can view/edit their own profile. Admins can view/edit all.
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            # IsOwnerOrReadOnly akan memeriksa obj.user == request.user
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action == 'retrieve':
             # Pengguna bisa melihat profilnya sendiri, admin bisa melihat semua
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()] # IsOwnerOrReadOnly juga cocok di sini
        # List semua profil hanya untuk admin
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return UserProfile.objects.all().select_related('user')
        if user.is_authenticated:
            return UserProfile.objects.filter(user=user).select_related('user')
        return UserProfile.objects.none()

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows categories to be viewed or edited.
    Viewing is allowed for anyone. Creating/Editing/Deleting only for admins.
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

class ShopViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows shops to be viewed or edited.
    - Anyone can list and retrieve shops.
    - Authenticated users can create a shop (if they don't own one already).
    - Only the shop owner or admin can update/delete their shop.
    """
    queryset = Shop.objects.all().select_related('owner').prefetch_related('categories', 'products').order_by('-created_at')
    serializer_class = ShopSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()] # Logika "hanya satu toko per user" ada di perform_create
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        # Memastikan user yang login belum punya toko (karena relasi OneToOneField di Shop.owner)
        if hasattr(self.request.user, 'shop') and self.request.user.shop is not None:
            raise ValidationError({"detail": "You already own a shop."})
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'], url_path='products', permission_classes=[permissions.AllowAny])
    def products(self, request, pk=None):
        """
        Returns a list of products for a given shop.
        """
        shop = self.get_object() # Ini akan menjalankan pemeriksaan permission objek jika ada
        products = AppProduct.objects.filter(shop=shop).select_related('category').prefetch_related('product_images')
        serializer = AppProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

class AppProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows products to be viewed or edited.
    - Anyone can list and retrieve products.
    - Authenticated shop owners can create products for their shop.
    - Only the shop owner (of the product's shop) or admin can update/delete products.
    """
    queryset = AppProduct.objects.all().select_related('shop', 'category').prefetch_related('product_images', 'reviews').order_by('-created_at')
    serializer_class = AppProductSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsShopOwnerOrReadOnlyForProduct()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()] # Validasi kepemilikan toko ada di perform_create
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        shop_id_from_request = self.request.data.get('shop_id') # Ambil dari request.data
        if not shop_id_from_request:
            raise ValidationError({"shop_id": "This field is required."})
        try:
            # User hanya bisa membuat produk untuk toko yang mereka miliki
            shop = Shop.objects.get(id=shop_id_from_request, owner=self.request.user)
            serializer.save(shop=shop)
            # Untuk handle upload multiple images jika menggunakan field 'uploaded_images' di serializer
            # uploaded_images_data = self.request.FILES.getlist('uploaded_images')
            # product_instance = serializer.instance
            # for image_data in uploaded_images_data:
            #     ProductImage.objects.create(product=product_instance, image=image_data)

        except Shop.DoesNotExist:
            raise PermissionDenied("You do not own this shop, the shop does not exist, or shop_id is incorrect.")
        except ValueError: # Jika shop_id tidak valid (bukan integer)
             raise ValidationError({"shop_id": "Invalid Shop ID format."})


class ProductReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for product reviews.
    - Anyone can list and retrieve reviews.
    - Authenticated users can create reviews.
    - Only the review author or admin can update/delete their review.
    """
    queryset = ProductReview.objects.all().select_related('product', 'user').order_by('-created_at')
    serializer_class = ProductReviewSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsReviewAuthorOrReadOnly()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        # User yang login otomatis menjadi author review
        # Product ID akan dikirim oleh frontend dalam payload request
        product_id = self.request.data.get('product')
        if not product_id:
            raise ValidationError({"product": "Product ID is required."})
        try:
            product_instance = AppProduct.objects.get(id=product_id)
            serializer.save(user=self.request.user, product=product_instance)
        except AppProduct.DoesNotExist:
            raise ValidationError({"product": "Product does not exist."})


    def get_queryset(self):
        """
        Optionally restricts the returned reviews to a given product,
        by filtering against a `product_id` query parameter in the URL.
        """
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

class RentalOrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for rental orders.
    - Authenticated users can create orders.
    - Users can view/update/delete their own orders (subject to status).
    - Admins can view/manage all orders.
    """
    queryset = RentalOrder.objects.all().select_related('user').prefetch_related('items', 'items__product', 'items__product__product_images').order_by('-created_at')
    serializer_class = RentalOrderSerializer

    def get_permissions(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'cancel_order']:
            return [permissions.IsAuthenticated(), IsOrderOwner()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        elif self.action == 'list': # Hanya admin yang boleh list semua order
            return [permissions.IsAdminUser()]
        # Default, user harus terautentikasi, get_queryset akan memfilter lebih lanjut
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff: # Admin bisa lihat semua
            return super().get_queryset()
        if user.is_authenticated: # User biasa hanya bisa lihat order miliknya
            return super().get_queryset().filter(user=user)
        return RentalOrder.objects.none() # Tidak ada order untuk user anonim

    def perform_create(self, serializer):
        # User yang melakukan request otomatis menjadi pemilik order
        # Data item (order_items_data) akan dihandle di dalam serializer.create()
        serializer.save(user=self.request.user) # Pastikan user diteruskan ke context serializer jika diperlukan

    @action(detail=True, methods=['post'], url_path='cancel-order') # url_path diubah agar lebih RESTful
    def cancel_order(self, request, pk=None):
        """
        Allows the order owner or an admin to cancel an order if its status permits.
        """
        order = self.get_object() # Permission IsOrderOwner sudah dicek di sini

        if order.status not in ['pending', 'confirmed']:
            return Response(
                {'detail': f'Order with status "{order.status}" cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        order.status = 'cancelled'
        # Logika tambahan seperti mengembalikan ketersediaan produk bisa ditambahkan di sini
        # for item in order.items.all():
        #     product = item.product
        #     product.available = True # atau logika penambahan stok
        #     product.save()
        order.save()
        return Response(RentalOrderSerializer(order, context={'request': request}).data)

# ViewSet untuk ProductImage dan OrderItem biasanya tidak diekspos langsung
# karena dikelola melalui model induknya (AppProduct dan RentalOrder).
# Jika Anda tetap ingin ada endpoint terpisah untuknya (misalnya untuk admin):

# class ProductImageViewSet(viewsets.ModelViewSet):
#     queryset = ProductImage.objects.all()
#     serializer_class = ProductImageSerializer
#     permission_classes = [permissions.IsAdminUser] # Contoh: Hanya admin

# class OrderItemViewSet(viewsets.ModelViewSet):
#     queryset = OrderItem.objects.all()
#     serializer_class = OrderItemSerializer
#     permission_classes = [permissions.IsAdminUser] # Contoh: Hanya admin