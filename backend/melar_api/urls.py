from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Membuat router dan mendaftarkan ViewSet kita
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user') # Opsional, hanya jika butuh list user
router.register(r'profiles', views.UserProfileViewSet, basename='userprofile')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'shops', views.ShopViewSet, basename='shop')
router.register(r'products', views.AppProductViewSet, basename='appproduct')
# router.register(r'product-images', views.ProductImageViewSet, basename='productimage') # Jika ingin API terpisah
router.register(r'reviews', views.ProductReviewViewSet, basename='productreview')
router.register(r'orders', views.RentalOrderViewSet, basename='rentalorder')
# router.register(r'order-items', views.OrderItemViewSet, basename='orderitem') # Biasanya tidak perlu

# URL API akan otomatis dibuat oleh router.
# Contoh: /api/categories/, /api/categories/{id}/, /api/shops/, /api/shops/{id}/products/
urlpatterns = [
    path('', include(router.urls)),
    # Anda bisa menambahkan URL non-router lainnya di sini jika perlu
]