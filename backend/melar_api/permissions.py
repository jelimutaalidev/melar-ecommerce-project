# backend/melar_api/permissions.py
from rest_framework import permissions
# Pastikan Anda mengimpor model yang benar dari aplikasi Anda jika diperlukan untuk type hinting
# atau logika yang lebih kompleks di dalam permission, meskipun untuk kasus ini tidak langsung digunakan.
# from .models import UserProfile, Shop, ProductReview, RentalOrder, AppProduct

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Assumes the model instance has an 'owner' attribute that refers to a User,
    or a 'user' attribute that refers to a User (for UserProfile).
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the object.
        # Check for 'owner' attribute first (e.g., for Shop)
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        # Check for 'user' attribute (e.g., for UserProfile, ProductReview)
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        # Fallback or raise error if no owner/user attribute is found
        return False


class IsShopOwnerOrReadOnlyForProduct(permissions.BasePermission):
    """
    Custom permission for AppProduct.
    Allows read access to anyone.
    Allows write access (create, update, delete) only to the owner of the shop
    the product belongs to, or admin users.
    """
    def has_permission(self, request, view):
        # Allow read-only methods for anyone.
        if request.method in permissions.SAFE_METHODS:
            return True
        # For write methods (POST, PUT, PATCH, DELETE), user must be authenticated.
        # Further object-level checks for PUT, PATCH, DELETE are done in has_object_permission.
        # For POST (create), the check is typically done in view's perform_create or serializer.
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the shop.
        # obj here is an AppProduct instance.
        if obj.shop and hasattr(obj.shop, 'owner'):
            return obj.shop.owner == request.user
        return False


class IsReviewAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow authors of a review to edit or delete it.
    Read access is allowed to anyone.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the author of the review.
        # obj here is a ProductReview instance, which has a 'user' field.
        return obj.user == request.user


class IsOrderOwner(permissions.BasePermission):
    """
    Custom permission to only allow a customer (user who placed the order)
    to access/modify their own order for specific actions like cancellation.
    Admin users can access all orders.
    """
    def has_object_permission(self, request, view, obj): # obj is RentalOrder
        if not request.user or not request.user.is_authenticated:
            return False
        # Admin users can access any order.
        if request.user.is_staff:
            return True

        # The owner of the order (customer) can access their own order.
        # obj here is a RentalOrder instance, which has a 'user' field.
        return obj.user == request.user


class IsShopOwnerOfOrderOrCustomer(permissions.BasePermission):
    """
    Allows access if the user is the customer who placed the order,
    OR if the user is the owner of the shop to which items in the order belong,
    OR if the user is staff.
    This is typically used for viewing or updating order status by shop owners.
    """
    def has_object_permission(self, request, view, obj): # obj is RentalOrder
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff: # Admin always has access
            return True

        # Check if the request.user is the customer who created the order
        if obj.user == request.user:
            return True

        # Check if the request.user is the owner of the shop for any item in the order
        # This assumes that 'obj' (RentalOrder) has a related manager 'items'
        # and each item has a 'product' which in turn has a 'shop' with an 'owner'.
        if hasattr(request.user, 'shop') and request.user.shop:
            # Check if any item in the order belongs to the current user's shop
            if obj.items.filter(product__shop=request.user.shop).exists():
                return True
        
        return False

# Anda bisa menambahkan kelas permission lain jika dibutuhkan, misalnya:
# class CanCreateShopPermission(permissions.BasePermission):
#     """
#     Permission to check if a user can create a shop.
#     (e.g., user is authenticated and does not already own a shop if using OneToOneField)
#     """
#     message = 'You are not allowed to create a shop or already own one.'

#     def has_permission(self, request, view):
#         if not request.user or not request.user.is_authenticated:
#             return False
#         # Check if user already has a shop (assuming OneToOneField from User to Shop via 'shop' related_name)
#         if hasattr(request.user, 'shop') and request.user.shop is not None:
#             return False # User already has a shop
#         return True
