# backend/melar_api/views.py
from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    UserProfile, Category, Shop, AppProduct,
    ProductImage, ProductReview, RentalOrder, OrderItem # Pastikan OrderItem diimpor
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
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action == 'retrieve':
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
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
    """
    queryset = Shop.objects.all().select_related('owner').prefetch_related('categories', 'products').order_by('-created_at')
    serializer_class = ShopSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        # Untuk 'products' dan 'orders' custom action, permission diatur di decorator @action
        return [permissions.AllowAny()] # Default untuk list dan retrieve

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'shop') and self.request.user.shop is not None:
            raise ValidationError({"detail": "You already own a shop."})
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'], url_path='products', permission_classes=[permissions.AllowAny])
    def products(self, request, pk=None):
        shop = self.get_object()
        products = AppProduct.objects.filter(shop=shop).select_related('category').prefetch_related('product_images')
        serializer = AppProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
    
    # PERBAIKAN/TAMBAHAN: Custom action untuk mengambil order berdasarkan shop_id
    @action(detail=True, methods=['get'], url_path='orders', permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def shop_orders(self, request, pk=None):
        """
        Returns a list of orders associated with this shop.
        Only accessible by the shop owner or admin.
        """
        shop = self.get_object() # IsOwnerOrReadOnly akan dicek di sini
        # Ambil semua order yang salah satu itemnya berasal dari produk di toko ini
        order_ids = OrderItem.objects.filter(product__shop=shop).values_list('order_id', flat=True).distinct()
        orders = RentalOrder.objects.filter(id__in=order_ids).select_related('user').prefetch_related('items', 'items__product').order_by('-created_at')
        
        page = self.paginate_queryset(orders)
        if page is not None:
            serializer = RentalOrderSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
            
        serializer = RentalOrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)


class AppProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows products to be viewed or edited.
    """
    queryset = AppProduct.objects.all().select_related('shop', 'category').prefetch_related('product_images', 'reviews').order_by('-created_at')
    serializer_class = AppProductSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsShopOwnerOrReadOnlyForProduct()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        shop_id_from_request = self.request.data.get('shop_id')
        if not shop_id_from_request:
            raise ValidationError({"shop_id": "This field is required."})
        try:
            shop = Shop.objects.get(id=shop_id_from_request, owner=self.request.user)
            serializer.save(shop=shop)
        except Shop.DoesNotExist:
            raise PermissionDenied("You do not own this shop, the shop does not exist, or shop_id is incorrect.")
        except ValueError:
             raise ValidationError({"shop_id": "Invalid Shop ID format."})


class ProductReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for product reviews.
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
        product_id = self.request.data.get('product')
        if not product_id:
            raise ValidationError({"product": "Product ID is required."})
        try:
            product_instance = AppProduct.objects.get(id=product_id)
            # Tambahan: Cek apakah user sudah pernah mereview produk ini
            if ProductReview.objects.filter(product=product_instance, user=self.request.user).exists():
                raise ValidationError({"detail": "You have already reviewed this product."})
            serializer.save(user=self.request.user, product=product_instance)
        except AppProduct.DoesNotExist:
            raise ValidationError({"product": "Product does not exist."})

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

class RentalOrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for rental orders.
    """
    queryset = RentalOrder.objects.all().select_related('user').prefetch_related('items', 'items__product', 'items__product__product_images').order_by('-created_at')
    serializer_class = RentalOrderSerializer

    def get_permissions(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'cancel_order']:
            return [permissions.IsAuthenticated(), IsOrderOwner()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        elif self.action == 'list':
            # Diperbarui: Izinkan pengguna terautentikasi untuk list, logika filter ada di get_queryset
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Ambil queryset dasar dari kelas induk atau definisikan di sini
        # queryset = super().get_queryset() # Jika queryset sudah didefinisikan di atas
        queryset = RentalOrder.objects.all().select_related('user').prefetch_related(
            'items', 'items__product', 'items__product__shop', 'items__product__product_images' # Tambahkan items__product__shop
        ).order_by('-created_at')


        if not user.is_authenticated:
            return RentalOrder.objects.none()

        if user.is_staff: # Admin bisa lihat semua, atau filter jika ada shop_id
            shop_id_param = self.request.query_params.get('shop_id')
            if shop_id_param:
                order_ids = OrderItem.objects.filter(product__shop_id=shop_id_param).values_list('order_id', flat=True).distinct()
                return queryset.filter(id__in=order_ids)
            return queryset
        
        # Untuk non-admin (user biasa atau pemilik toko)
        shop_id_param = self.request.query_params.get('shop_id')
        if shop_id_param:
            # Jika parameter shop_id ada, cek apakah user adalah pemilik toko tersebut
            if hasattr(user, 'shop') and user.shop and str(user.shop.id) == str(shop_id_param):
                # Pemilik toko mengambil semua order yang itemnya terkait dengan produk di tokonya
                order_ids = OrderItem.objects.filter(product__shop_id=user.shop.id).values_list('order_id', flat=True).distinct()
                return queryset.filter(id__in=order_ids)
            else:
                # Jika shop_id_param ada tapi user bukan pemilik toko itu, jangan kembalikan apa-apa (atau 403 jika lebih sesuai)
                # Untuk konsistensi, jika user mencoba mengakses shop_id yang bukan miliknya, kembalikan empty queryset.
                # Permission lebih ketat bisa dihandle di level permission class jika endpointnya spesifik per shop.
                return RentalOrder.objects.none()
        else:
            # Jika tidak ada parameter shop_id, user biasa hanya bisa lihat order yang dia buat (rental history)
            return queryset.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='cancel-order')
    def cancel_order(self, request, pk=None):
        order = self.get_object()
        if order.status not in ['pending', 'confirmed']:
            return Response(
                {'detail': f'Order with status "{order.status}" cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        order.status = 'cancelled'
        # Logika untuk mengembalikan ketersediaan produk
        for item in order.items.all():
             product = item.product
             # Di sini Anda mungkin perlu logika lebih kompleks jika ada manajemen stok quantity
             # Untuk saat ini, kita asumsikan 'available' adalah boolean sederhana per produk
             if not product.available: # Hanya set available jika sebelumnya tidak available karena order ini
                 product.available = True # atau logika penambahan stok
                 product.save()
        order.save()
        return Response(RentalOrderSerializer(order, context={'request': request}).data)