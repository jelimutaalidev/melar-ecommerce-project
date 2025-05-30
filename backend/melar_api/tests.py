# backend/melar_api/tests.py

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from .models import Category, Shop, AppProduct, ProductImage, UserProfile, ProductReview, RentalOrder, OrderItem
from decimal import Decimal # Untuk perbandingan harga yang presisi
import datetime # Untuk tanggal

# Helper function untuk membuat shop
def create_shop_for_user(client, user, shop_data):
    # client.force_authenticate(user=user) # Autentikasi dilakukan di dalam metode tes sebelum memanggil ini
    url = reverse('shop-list')
    return client.post(url, shop_data, format='json')

# Helper function untuk membuat product
def create_product_for_shop(client, user, shop_id, product_data):
    # client.force_authenticate(user=user)
    if 'shop_id' not in product_data:
        product_data['shop_id'] = shop_id
    url = reverse('appproduct-list')
    return client.post(url, product_data, format='json')


class CategoryAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(username='testadmin', email='admin@example.com', password='password123')
        self.normal_user = User.objects.create_user(username='testuser', email='user@example.com', password='password123')
        # UserProfile akan dibuat otomatis oleh signal

        self.category1 = Category.objects.create(name='Elektronik', description='Perangkat elektronik.')
        self.category2 = Category.objects.create(name='Fotografi', description='Peralatan fotografi.')
        self.list_create_url = reverse('category-list')

    def test_list_categories_unauthenticated(self):
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        category_names = [item['name'] for item in response.data]
        self.assertIn(self.category1.name, category_names)
        self.assertIn(self.category2.name, category_names)

    def test_create_category_unauthenticated(self):
        data = {'name': 'Pakaian', 'description': 'Baju dan celana'}
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_category_authenticated_non_admin(self):
        self.client.force_authenticate(user=self.normal_user)
        data = {'name': 'Perkakas', 'description': 'Alat tukang'}
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_category_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        data = {'name': 'Olahraga', 'description': 'Peralatan olahraga'}
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Category.objects.count(), 3)
        self.assertTrue(Category.objects.filter(name='Olahraga').exists())

    def test_retrieve_category(self):
        detail_url = reverse('category-detail', kwargs={'pk': self.category1.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.category1.name)

    def test_update_category_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse('category-detail', kwargs={'pk': self.category1.pk})
        updated_data = {'name': 'Elektronik Rumah Tangga', 'description': 'Perlengkapan elektronik untuk rumah'}
        response = self.client.put(detail_url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.category1.refresh_from_db()
        self.assertEqual(self.category1.name, 'Elektronik Rumah Tangga')
        self.assertEqual(self.category1.description, 'Perlengkapan elektronik untuk rumah')

    def test_delete_category_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        detail_url = reverse('category-detail', kwargs={'pk': self.category1.pk})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Category.objects.count(), 1)

    def test_update_category_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.normal_user)
        detail_url = reverse('category-detail', kwargs={'pk': self.category1.pk})
        updated_data = {'name': 'Coba Update'}
        response = self.client.put(detail_url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_category_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.normal_user)
        detail_url = reverse('category-detail', kwargs={'pk': self.category1.pk})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ShopAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='shopowner1', email='owner1@example.com', password='password123')
        self.user2 = User.objects.create_user(username='shopowner2', email='owner2@example.com', password='password123')
        self.admin_user = User.objects.create_superuser(username='adminshop', email='adminshop@example.com', password='password123')

        self.category_photo = Category.objects.create(name='Photography')
        self.category_outdoor = Category.objects.create(name='Outdoor Gear')

        self.shop_data_user1_payload = {
            'name': 'Toko Kamera Keren Milik User1',
            'description': 'Menyewakan berbagai kamera dan lensa.',
            'location': 'Jakarta Pusat, ID',
            'phone_number': '081234567890',
            'address': 'Jl. Fotografi No. 1',
            'zip_code': '10110',
            'business_type': 'individual',
            'category_ids': [self.category_photo.id]
        }
        self.client.force_authenticate(user=self.user1)
        response_shop1 = create_shop_for_user(self.client, self.user1, self.shop_data_user1_payload)
        self.assertEqual(response_shop1.status_code, status.HTTP_201_CREATED, response_shop1.data)
        self.shop1 = Shop.objects.get(id=response_shop1.data['id'])
        self.client.logout()


    def test_list_shops_unauthenticated(self):
        url = reverse('shop-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], self.shop1.name)

    def test_retrieve_shop_unauthenticated(self):
        url = reverse('shop-detail', kwargs={'pk': self.shop1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.shop1.name)
        self.assertIn(self.category_photo.name, [cat['name'] for cat in response.data['categories']])

    def test_create_shop_authenticated_user_no_shop_yet(self):
        self.client.force_authenticate(user=self.user2)
        new_shop_data = {
            'name': 'Toko Outdoor Cihuy Milik User2',
            'description': 'Perlengkapan naik gunung dan camping.',
            'location': 'Bandung, ID',
            'phone_number': '082233445566',
            'address': 'Jl. Alam No. 7',
            'zip_code': '40123',
            'business_type': 'individual',
            'category_ids': [self.category_outdoor.id]
        }
        response = create_shop_for_user(self.client, self.user2, new_shop_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Shop.objects.count(), 2)
        self.user2.refresh_from_db() # Refresh user untuk mendapatkan profile yang terupdate oleh signal
        self.assertTrue(self.user2.profile.has_shop)
        new_shop = Shop.objects.get(name=new_shop_data['name'])
        self.assertEqual(new_shop.owner, self.user2)

    def test_create_shop_user_already_owns_shop_forbidden(self):
        self.client.force_authenticate(user=self.user1)
        shop_data_duplicate = {
            'name': 'Toko Kamera Lain Gagal',
            'description': 'Ini toko kedua yang seharusnya gagal.',
            'location': 'Jakarta Selatan, ID',
            'category_ids': [self.category_photo.id]
        }
        response = create_shop_for_user(self.client, self.user1, shop_data_duplicate)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('You already own a shop.', response.data['detail'])

    def test_update_own_shop(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('shop-detail', kwargs={'pk': self.shop1.pk})
        updated_data = {'name': 'Toko Kamera User1 Diperbarui', 'location': 'Jakarta Barat, ID'}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.shop1.refresh_from_db()
        self.assertEqual(self.shop1.name, 'Toko Kamera User1 Diperbarui')

    def test_update_other_user_shop_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = reverse('shop-detail', kwargs={'pk': self.shop1.pk})
        updated_data = {'name': 'Toko Diretas'}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_own_shop(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('shop-detail', kwargs={'pk': self.shop1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Shop.objects.count(), 0)
        self.user1.refresh_from_db()
        self.assertFalse(self.user1.profile.has_shop)

    def test_delete_other_user_shop_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = reverse('shop-detail', kwargs={'pk': self.shop1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Shop.objects.count(), 1)


class AppProductAPITests(APITestCase):
    def setUp(self):
        self.owner_user = User.objects.create_user(username='productowner', email='prodowner@example.com', password='password123')
        self.another_user = User.objects.create_user(username='anotheruser', email='another@example.com', password='password123')

        self.category_electronics = Category.objects.create(name='Electronics')
        self.shop_owned = Shop.objects.create(
            owner=self.owner_user,
            name="Owner's Gadget Store",
            description="Gadgets for rent",
            location="Online"
        )
        self.shop_owned.categories.add(self.category_electronics)

        self.product1 = AppProduct.objects.create(
            shop=self.shop_owned,
            name="Kamera Mirrorless Alpha",
            description="Kamera canggih untuk profesional.",
            price=Decimal('75.00'), # Gunakan Decimal untuk harga
            category=self.category_electronics,
            available=True,
            rating=4.8
        )
        # Anda perlu mock file gambar jika ingin menguji upload atau tampilan gambar sebenarnya.
        # Untuk tes serializer, cukup pastikan relasi ProductImage ada jika serializer membutuhkannya.
        # Jika serializer Anda menghasilkan URL dari ImageField, Anda perlu setup MEDIA_ROOT sementara
        # atau mock URL-nya.
        # ProductImage.objects.create(product=self.product1, image='product_images/sample1.jpg', order=0)

    def test_list_products_unauthenticated(self):
        url = reverse('appproduct-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], self.product1.name)
        self.assertIn('images', response.data[0]) # Serializer harusnya mengembalikan 'images'
        self.assertIsInstance(response.data[0]['images'], list)


    def test_retrieve_product_unauthenticated(self):
        url = reverse('appproduct-detail', kwargs={'pk': self.product1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.product1.name)
        self.assertIn('images', response.data)


    def test_create_product_by_shop_owner(self):
        self.client.force_authenticate(user=self.owner_user)
        product_data = {
            'shop_id': self.shop_owned.id,
            'name': 'Speaker Bluetooth Pro',
            'description': 'Speaker portable dengan suara mantap.',
            'price': '25.00', # Serializer akan mengkonversi ke Decimal
            'category_id': self.category_electronics.id,
            'available': True
        }
        response = create_product_for_shop(self.client, self.owner_user, self.shop_owned.id, product_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(AppProduct.objects.count(), 2)
        new_product = AppProduct.objects.get(name='Speaker Bluetooth Pro')
        self.assertEqual(new_product.shop, self.shop_owned)

    def test_create_product_missing_shop_id(self):
        self.client.force_authenticate(user=self.owner_user)
        product_data = {
            'name': 'Speaker Bluetooth Tanpa Toko',
            'description': 'Ini tidak boleh berhasil.',
            'price': '20.00',
            'category_id': self.category_electronics.id,
        }
        url = reverse('appproduct-list')
        response = self.client.post(url, product_data, format='json')
        # Perbaikan dari sebelumnya: view akan raise ValidationError (400) jika shop_id missing
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('shop_id', response.data) # Error harusnya menyebutkan shop_id
        # Anda bisa lebih spesifik memeriksa pesan errornya
        self.assertIn("This field is required.", str(response.data['shop_id']))


    def test_create_product_for_other_user_shop_forbidden(self):
        self.client.force_authenticate(user=self.another_user)
        other_shop_data = {
            'owner_id': self.another_user.id, # Untuk serializer Shop
            'name': 'Another User Shop', 'description': 'Desc', 'location': 'Somewhere Else'
        }
        # Buat toko untuk another_user dulu
        create_shop_response = self.client.post(reverse('shop-list'), other_shop_data, format='json')
        self.assertEqual(create_shop_response.status_code, status.HTTP_201_CREATED, create_shop_response.data)
        # other_shop_id = create_shop_response.data['id']

        product_data = {
            'shop_id': self.shop_owned.id, # Mencoba membuat produk di toko milik self.owner_user
            'name': 'Produk Curian',
            'description': 'Deskripsi.',
            'price': '10.00',
            'category_id': self.category_electronics.id,
        }
        url = reverse('appproduct-list')
        response = self.client.post(url, product_data, format='json')
        # Karena self.another_user bukan owner dari self.shop_owned
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_own_product(self):
        self.client.force_authenticate(user=self.owner_user)
        url = reverse('appproduct-detail', kwargs={'pk': self.product1.pk})
        updated_data = {'name': 'Kamera Mirrorless Alpha Versi 2', 'price': '80.00', 'available': False}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.name, 'Kamera Mirrorless Alpha Versi 2')
        self.assertEqual(self.product1.price, Decimal('80.00'))
        self.assertFalse(self.product1.available)

    def test_update_other_user_product_forbidden(self):
        self.client.force_authenticate(user=self.another_user)
        url = reverse('appproduct-detail', kwargs={'pk': self.product1.pk})
        updated_data = {'name': 'Produk Diubah Secara Ilegal'}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_own_product(self):
        self.client.force_authenticate(user=self.owner_user)
        url = reverse('appproduct-detail', kwargs={'pk': self.product1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(AppProduct.objects.count(), 0)

    def test_delete_other_user_product_forbidden(self):
        self.client.force_authenticate(user=self.another_user)
        url = reverse('appproduct-detail', kwargs={'pk': self.product1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AppProduct.objects.count(), 1)


class ProductReviewAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='reviewer1', password='password123')
        self.user2 = User.objects.create_user(username='reviewer2', password='password123')
        self.owner_user = User.objects.create_user(username='shopowner_for_review', password='password123')

        self.category = Category.objects.create(name="Test Category for Review")
        self.shop = Shop.objects.create(owner=self.owner_user, name="Test Shop for Review", location="Test Location")
        self.product = AppProduct.objects.create(shop=self.shop, name="Test Product for Review", price=Decimal("10.00"), category=self.category)

        self.review1_by_user1 = ProductReview.objects.create(product=self.product, user=self.user1, rating=5, comment="Sangat bagus!")
        self.list_create_url = reverse('productreview-list')

    def test_list_reviews_for_product(self):
        # List semua review (bisa difilter by product_id di query params)
        response = self.client.get(f"{self.list_create_url}?product_id={self.product.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['comment'], "Sangat bagus!")

    def test_create_review_authenticated(self):
        self.client.force_authenticate(user=self.user2)
        data = {
            'product': self.product.id, # Kirim product ID
            'rating': 4,
            'comment': "Cukup baik."
        }
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(ProductReview.objects.count(), 2)
        self.assertTrue(ProductReview.objects.filter(user=self.user2, comment="Cukup baik.").exists())

    def test_create_review_unauthenticated_forbidden(self):
        data = {'product': self.product.id, 'rating': 3, 'comment': "Tidak bisa review."}
        response = self.client.post(self.list_create_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_own_review(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('productreview-detail', kwargs={'pk': self.review1_by_user1.pk})
        updated_data = {'rating': 4, 'comment': "Ternyata oke saja."}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.review1_by_user1.refresh_from_db()
        self.assertEqual(self.review1_by_user1.comment, "Ternyata oke saja.")
        self.assertEqual(self.review1_by_user1.rating, 4)

    def test_update_other_user_review_forbidden(self):
        self.client.force_authenticate(user=self.user2)
        url = reverse('productreview-detail', kwargs={'pk': self.review1_by_user1.pk})
        updated_data = {'comment': "Review orang lain"}
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_own_review(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('productreview-detail', kwargs={'pk': self.review1_by_user1.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ProductReview.objects.count(), 0)


class RentalOrderAPITests(APITestCase):
    def setUp(self):
        self.user_renter = User.objects.create_user(username='renter', password='password123')
        self.shop_owner = User.objects.create_user(username='order_shop_owner', password='password123')
        self.admin_user = User.objects.create_superuser(username='orderadmin', password='password123')

        self.category = Category.objects.create(name="Order Category")
        self.shop = Shop.objects.create(owner=self.shop_owner, name="Order Shop", location="Order Location")
        self.product1 = AppProduct.objects.create(shop=self.shop, name="Product A for Order", price=Decimal("50.00"), category=self.category)
        self.product2 = AppProduct.objects.create(shop=self.shop, name="Product B for Order", price=Decimal("30.00"), category=self.category)

        self.list_create_url = reverse('rentalorder-list')

    def test_create_rental_order_authenticated(self):
        self.client.force_authenticate(user=self.user_renter)
        start_date = datetime.date.today()
        end_date = start_date + datetime.timedelta(days=2) # 3 hari rental

        order_data = {
            "first_name": "Test",
            "last_name": "Renter",
            "email_at_checkout": "renter@example.com",
            "phone_at_checkout": "0811111111",
            "billing_address": "Jl. Rental No. 1",
            "billing_city": "Jakarta",
            "billing_state": "DKI Jakarta",
            "billing_zip": "10000",
            "order_items_data": [
                {
                    "product_id": self.product1.id,
                    "quantity": 1,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                {
                    "product_id": self.product2.id,
                    "quantity": 2,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            ]
        }
        response = self.client.post(self.list_create_url, order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(RentalOrder.objects.count(), 1)
        order = RentalOrder.objects.first()
        self.assertEqual(order.user, self.user_renter)
        self.assertEqual(order.items.count(), 2)
        
        # Cek total harga (3 hari untuk product1, 3 hari untuk 2x product2)
        # Product1: 50 * 3 * 1 = 150
        # Product2: 30 * 3 * 2 = 180
        # Total = 150 + 180 = 330
        self.assertEqual(order.total_price, Decimal("330.00"))


    def test_create_rental_order_unauthenticated_forbidden(self):
        order_data = {"order_items_data": [{"product_id": self.product1.id, "quantity": 1, "start_date": "2025-06-01", "end_date": "2025-06-03"}]}
        response = self.client.post(self.list_create_url, order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_own_rental_orders(self):
        # Buat order dulu
        self.client.force_authenticate(user=self.user_renter)
        start_date = datetime.date.today()
        end_date = start_date + datetime.timedelta(days=1)
        order_data = {"order_items_data": [{"product_id": self.product1.id, "quantity": 1, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()}]}
        self.client.post(self.list_create_url, order_data, format='json')

        response = self.client.get(self.list_create_url) # User biasa tidak bisa list semua
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) # Karena permission untuk list hanya admin

        # User harus retrieve ordernya satu per satu jika tahu ID nya, atau kita buat endpoint khusus "my-orders"
        # Untuk sekarang, kita tes retrieve by ID
        order = RentalOrder.objects.get(user=self.user_renter)
        detail_url = reverse('rentalorder-detail', kwargs={'pk': order.pk})
        response_detail = self.client.get(detail_url)
        self.assertEqual(response_detail.status_code, status.HTTP_200_OK)


    def test_list_all_rental_orders_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_cancel_own_order(self):
        self.client.force_authenticate(user=self.user_renter)
        start_date = datetime.date.today()
        end_date = start_date + datetime.timedelta(days=1)
        order_data = {"status": "pending", "order_items_data": [{"product_id": self.product1.id, "quantity": 1, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()}]}
        create_response = self.client.post(self.list_create_url, order_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        order_id = create_response.data['id']

        cancel_url = reverse('rentalorder-cancel-order', kwargs={'pk': order_id})
        response = self.client.post(cancel_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], 'cancelled')
        order = RentalOrder.objects.get(id=order_id)
        self.assertEqual(order.status, 'cancelled')

    def test_cancel_other_user_order_forbidden(self):
        # Buat order dengan user_renter
        self.client.force_authenticate(user=self.user_renter)
        start_date = datetime.date.today()
        end_date = start_date + datetime.timedelta(days=1)
        order_data = {
            "status": "pending", # Pastikan status awal memungkinkan pembatalan
            "order_items_data": [{
                "product_id": self.product1.id,
                "quantity": 1,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }]
        }
        create_response = self.client.post(self.list_create_url, order_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED, create_response.data)
        order_id = create_response.data['id']
        self.client.logout()

        # Coba cancel dengan shop_owner (yang bukan pemilik order dan bukan admin)
        self.client.force_authenticate(user=self.shop_owner)
        cancel_url = reverse('rentalorder-cancel-order', kwargs={'pk': order_id})
        response = self.client.post(cancel_url)

        # PERBAIKAN: Harapkan HTTP 404 Not Found
        # karena get_queryset untuk user shop_owner tidak akan menemukan order milik user_renter,
        # sehingga get_object() akan gagal dengan 404 sebelum IsOrderOwner sempat dievaluasi pada objek.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) # <--- BARIS INI YANG DIPERBAIKI

        # Pastikan order tidak benar-benar tercancel
        order_asli = RentalOrder.objects.get(id=order_id)
        self.assertEqual(order_asli.status, "pending") # atau status awal saat dibuat