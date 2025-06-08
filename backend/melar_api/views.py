# backend/melar_api/views.py
from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView # <-- Import APIView
from django.db import models # <--- PENAMBAHAN IMPORT INI
from django.db.models import ProtectedError

from .models import (
    UserProfile, Category, Shop, AppProduct,
    ProductImage, ProductReview, RentalOrder, OrderItem,
    Cart, CartItem  # <-- TAMBAHKAN Cart dan CartItem
)
from .serializers import (
    UserSerializer, UserProfileSerializer, CategorySerializer, ShopSerializer,
    AppProductSerializer, ProductImageSerializer, ProductReviewSerializer,
    RentalOrderSerializer, OrderItemSerializer,
    CartSerializer, CartItemSerializer  # <-- TAMBAHKAN CartSerializer dan CartItemSerializer
)
# Mengimpor permission kustom yang telah kita buat
from .permissions import (
    IsOwnerOrReadOnly, 
    IsShopOwnerOrReadOnlyForProduct,
    IsReviewAuthorOrReadOnly, 
    IsOrderOwner,
    IsShopOwnerOfOrderOrCustomer # <--- PASTIKAN BARIS INI ADA DAN NAMA KELASNYA SESUAI
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
        return [permissions.IsAdminUser()] # Default untuk list dan create oleh admin

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return UserProfile.objects.all().select_related('user')
        if user.is_authenticated:
            # User biasa hanya bisa lihat/edit profilnya sendiri
            return UserProfile.objects.filter(user=user).select_related('user')
        return UserProfile.objects.none()

    # perform_create/update otomatis menangani user jika serializer di-setup dengan benar
    # atau bisa dioverride jika ada logika khusus. Untuk UserProfile, OneToOne dengan User
    # biasanya dihandle saat User dibuat via signal.

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
        return [permissions.AllowAny()]

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

    @action(detail=True, methods=['get'], url_path='orders', permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def shop_orders(self, request, pk=None):
        shop = self.get_object()
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
            # **PERUBAHAN DI SINI:** Langsung raise ValidationError jika shop_id tidak ada di payload
            raise ValidationError({"shop_id": "This field is required in the request payload."})
        
        # Logika selanjutnya untuk memastikan user adalah pemilik shop_id yang diberikan
        try:
            shop = Shop.objects.get(id=shop_id_from_request, owner=self.request.user)
        except Shop.DoesNotExist:
            raise PermissionDenied("You do not own this shop, the shop does not exist, or shop_id is incorrect.")
        except ValueError: 
            raise ValidationError({"shop_id": "Invalid Shop ID format."})
        
        print(f"[AppProductViewSet DEBUG] Creating product for shop: {shop.name} (ID: {shop.id}) by user: {self.request.user.username}")
        serializer.save(shop=shop)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {"detail": "Produk ini tidak dapat dihapus karena sudah menjadi bagian dari pesanan yang ada."},
                status=status.HTTP_400_BAD_REQUEST
            )


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
    queryset = RentalOrder.objects.all().select_related('user').prefetch_related(
        'items', 'items__product', 'items__product__product_images', 'items__product__shop'
    ).order_by('-created_at')
    serializer_class = RentalOrderSerializer

    def get_permissions(self):
        # Untuk melihat detail, update, atau menghapus order:
        # - Customer bisa melakukan pada order miliknya.
        # - Shop owner bisa melakukan pada order yang berisi produk tokonya.
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsShopOwnerOfOrderOrCustomer()]
        # Untuk membuat order, hanya perlu terautentikasi.
        elif self.action == 'create':
            return [permissions.IsAuthenticated()]
        # Untuk melihat daftar order, hanya perlu terautentikasi (filtering di get_queryset).
        elif self.action == 'list':
            return [permissions.IsAuthenticated()]
        # Untuk cancel order, hanya customer pemilik order yang boleh.
        elif self.action == 'cancel_order':
            return [permissions.IsAuthenticated(), IsOrderOwner()]
        # Default permission jika ada action lain.
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Mulai dengan queryset dasar yang mengambil semua order
        # prefetch_related dan select_related sudah ada di queryset kelas
        base_queryset = super().get_queryset() 

        if not user.is_authenticated:
            return base_queryset.none()

        if user.is_staff:
            # Admin bisa melihat semua order atau order milik toko tertentu jika ada shop_id_param
            shop_id_param = self.request.query_params.get('shop_id')
            if shop_id_param:
                try:
                    shop_id_val = int(shop_id_param)
                    # Ambil ID order yang memiliki setidaknya satu item dari toko yang ditentukan
                    order_ids = OrderItem.objects.filter(product__shop_id=shop_id_val).values_list('order_id', flat=True).distinct()
                    return base_queryset.filter(id__in=order_ids)
                except ValueError:
                    return base_queryset.none() # Atau base_queryset jika ingin admin tetap lihat semua jika param salah
            return base_queryset # Admin melihat semua jika tidak ada filter toko yang valid
        
        # Jika ini adalah permintaan untuk detail objek tunggal (misalnya, retrieve, update, cancel_order)
        # kita bisa sedikit lebih permisif di sini dan membiarkan permission object-level
        # (IsShopOwnerOfOrderOrCustomer atau IsOrderOwner) melakukan validasi akhir.
        # Ini karena get_object() akan memanggil get_queryset() lalu memfilter berdasarkan PK,
        # baru kemudian check_object_permissions().
        if self.action != 'list': # Untuk retrieve, update, partial_update, destroy, cancel_order
            # Untuk pemilik toko, kita ingin pastikan dia bisa mengambil order tokonya
            # meskipun dia bukan `order.user`.
            # Untuk customer, dia juga bisa mengambil ordernya sendiri.
            # Kita bisa saja mengembalikan base_queryset di sini dan membiarkan
            # IsShopOwnerOfOrderOrCustomer yang melakukan semua pekerjaan.
            # Atau, kita bisa melakukan pra-filter yang lebih luas.
            # Untuk saat ini, kita coba kembalikan base_queryset dan biarkan permission yang bekerja.
            # Namun, ini bisa berisiko jika permission tidak ketat.
            # Alternatif yang lebih aman:
            if hasattr(user, 'shop') and user.shop:
                # Jika pengguna adalah pemilik toko, kembalikan semua order yang MUNGKIN terkait dengannya ATAU dibuat olehnya
                shop_order_ids = OrderItem.objects.filter(product__shop=user.shop).values_list('order_id', flat=True).distinct()
                # Gabungkan order milik user dan order yang terkait dengan tokonya
                return base_queryset.filter(
                    models.Q(user=user) | models.Q(id__in=shop_order_ids)
                ).distinct()
            else:
                # Jika bukan pemilik toko, hanya order miliknya
                return base_queryset.filter(user=user)

        # Untuk action 'list':
        # Pengguna biasa (bukan staff) HANYA melihat order miliknya sendiri
        # ATAU jika dia adalah pemilik toko, dia melihat order tokonya (jika ada shop_id_param)
        shop_id_param = self.request.query_params.get('shop_id')
        if shop_id_param: # Biasanya untuk ShopDashboardPage menampilkan order tokonya
            if hasattr(user, 'shop') and user.shop and str(user.shop.id) == str(shop_id_param):
                order_ids = OrderItem.objects.filter(product__shop_id=user.shop.id).values_list('order_id', flat=True).distinct()
                return base_queryset.filter(id__in=order_ids)
            else:
                # Jika user (bukan admin) meminta daftar order toko lain
                return base_queryset.none()
        else: # Tidak ada shop_id_param, berarti user biasa ingin lihat daftar ordernya sendiri
            return base_queryset.filter(user=user)
    
    def perform_create(self, serializer):
        # Customer yang membuat order adalah user yang sedang login
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='cancel-order') # Permission sudah diatur di get_permissions
    def cancel_order(self, request, pk=None):
        order = self.get_object() # get_object akan menjalankan permission check (IsOrderOwner)
        
        # Validasi status tambahan di dalam action (best practice)
        if order.status not in ['pending', 'confirmed', 'pending_whatsapp']: # pending_whatsapp ditambahkan
            return Response(
                {'detail': f'Order with status "{order.status}" cannot be cancelled by the customer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Logika pembatalan
        order.status = 'cancelled'
        for item in order.items.all():
            product = item.product
            if not product.available: # Jika produk jadi tidak available karena order ini
                product.available = True # Kembalikan jadi available
                product.save()
        order.save()
        return Response(RentalOrderSerializer(order, context={'request': request}).data)

    # Metode perform_update dan perform_partial_update tidak perlu di-override secara eksplisit
    # jika permission IsShopOwnerOfOrderOrCustomer sudah menangani hak akses dengan benar
    # dan serializer RentalOrderSerializer sudah bisa menghandle update field 'status'.
# ----------------------------------------------------
# VIEWS BARU UNTUK KERANJANG (CART)
# ----------------------------------------------------

class UserCartDetailView(APIView):
    """
    View untuk mengambil detail keranjang belanja milik pengguna yang sedang login.
    Akan merespons GET request ke /api/v1/cart/ (misalnya).
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartSerializer # Untuk dokumentasi API otomatis

    def get(self, request, *args, **kwargs):
        """
        Mengembalikan detail keranjang belanja pengguna saat ini.
        Jika keranjang belum ada, keranjang baru akan dibuat.
        """
        cart, created = Cart.objects.get_or_create(user=request.user)
        if created:
            print(f"[UserCartDetailView DEBUG] Cart created for user: {request.user.username}")
        else:
            print(f"[UserCartDetailView DEBUG] Cart retrieved for user: {request.user.username}")
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

class CartItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet untuk mengelola item-item dalam keranjang belanja (CartItem).
    Pengguna hanya bisa mengakses item dalam keranjangnya sendiri.
    """
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Memastikan user hanya bisa melihat/mengelola item di keranjangnya sendiri.
        """
        user_cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return CartItem.objects.filter(cart=user_cart).select_related('product', 'product__shop')

    def create(self, request, *args, **kwargs):
        """
        Menambahkan item ke keranjang. Jika item dengan produk dan periode sewa yang sama
        sudah ada, maka kuantitasnya akan ditambahkan.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_cart, _ = Cart.objects.get_or_create(user=request.user)
        product = serializer.validated_data.get('product')
        start_date = serializer.validated_data.get('start_date')
        end_date = serializer.validated_data.get('end_date')
        quantity_to_add = serializer.validated_data.get('quantity', 1)

        if not product.available:
            raise ValidationError({"product": f"Product '{product.name}' is not available for rent."})

        # Coba cari item yang sama (produk dan periode sewa)
        cart_item, created = CartItem.objects.get_or_create(
            cart=user_cart,
            product=product,
            start_date=start_date,
            end_date=end_date,
            defaults={'quantity': quantity_to_add}
        )

        if not created:
            # Jika item sudah ada, tambahkan kuantitasnya
            cart_item.quantity += quantity_to_add
            cart_item.save()
            print(f"[CartItemViewSet DEBUG] Updated quantity for existing CartItem {cart_item.id} to {cart_item.quantity}")
        else:
            # Jika item baru dibuat oleh get_or_create, tidak perlu save lagi karena defaults sudah diterapkan
            print(f"[CartItemViewSet DEBUG] Created new CartItem {cart_item.id} with quantity {cart_item.quantity}")
        
        # Serialisasi item yang (mungkin baru diupdate atau baru dibuat) untuk respons
        response_serializer = self.get_serializer(cart_item)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK, headers=headers)

    def perform_update(self, serializer):
        """
        Saat mengupdate item (misalnya PATCH untuk kuantitas), simpan perubahan.
        Validasi dasar (seperti end_date > start_date) ada di serializer.
        """
        # Pastikan item yang diupdate adalah milik cart user (sudah ditangani get_queryset untuk retrieve)
        print(f"[CartItemViewSet DEBUG] Updating CartItem {serializer.instance.id} with data: {serializer.validated_data}")
        serializer.save()
        print(f"[CartItemViewSet DEBUG] CartItem {serializer.instance.id} updated. New quantity: {serializer.instance.quantity}")


    def perform_destroy(self, instance):
        """
        Saat menghapus item dari keranjang.
        """
        print(f"[CartItemViewSet DEBUG] Deleting CartItem {instance.id} for user {self.request.user.username}")
        instance.delete()
        print(f"[CartItemViewSet DEBUG] CartItem {instance.id} deleted.")


    @action(detail=False, methods=['post'], url_path='clear-cart')
    def clear_cart(self, request):
        """
        Menghapus semua item dari keranjang pengguna saat ini.
        """
        user_cart, created = Cart.objects.get_or_create(user=request.user)
        if not created and user_cart.items.exists(): # Hanya hapus jika cart ada dan punya item
            print(f"[CartItemViewSet DEBUG] Clearing all items from cart {user_cart.id} for user {request.user.username}")
            user_cart.items.all().delete()
            print(f"[CartItemViewSet DEBUG] Cart {user_cart.id} cleared.")
            return Response({"detail": "Cart cleared successfully."}, status=status.HTTP_204_NO_CONTENT)
        elif created:
            print(f"[CartItemViewSet DEBUG] Cart was just created for user {request.user.username}, nothing to clear.")
            return Response({"detail": "Cart is already empty (was just created)."}, status=status.HTTP_200_OK)
        else: # Cart ada tapi sudah kosong
            print(f"[CartItemViewSet DEBUG] Cart {user_cart.id} for user {request.user.username} is already empty.")
            return Response({"detail": "Cart is already empty."}, status=status.HTTP_200_OK)