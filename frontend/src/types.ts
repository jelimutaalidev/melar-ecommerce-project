// frontend/src/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  hasShop: boolean;
  shopId?: string;
  shop?: Shop; // Jika Anda memutuskan untuk menyematkan objek Shop
  phone?: string;
  address?: string;
}

// TAMBAHKAN/MODIFIKASI TIPE Category
export interface Category {
  id: string | number; // ID bisa berupa string atau number tergantung backend Anda
  name: string;
  description?: string; // Opsional, sesuaikan dengan serializer Anda
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  totalRentals: number;
  image: string | null;
  categories: Category[]; // MODIFIKASI: dari string[] menjadi Category[]
  ownerId: string; // Ini merujuk ke User.id pemilik
  phoneNumber?: string;
  address?: string;
  city?: string;       // Tetap ada jika Anda menggunakannya di frontend, meskipun backend mungkin menyimpannya dalam 'location'
  state?: string;      // Sama seperti city
  zip_code?: string;   // MODIFIKASI: dari zip menjadi zip_code
  business_type?: string; // MODIFIKASI: dari businessType menjadi business_type
}

export interface ProductReview {
  user: string; // Seharusnya ini bisa objek User atau string nama user
  rating: number;
  comment: string;
  date: string; // Sebaiknya gunakan tipe Date atau string ISO
}

export interface AppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string; // Ini akan menjadi NAMA kategori (string) dari backend setelah serialisasi
  rating: number;
  available: boolean;
  owner: { // Ini adalah owner_info dari serializer backend
    id: string; // Ini adalah shopId
    name: string; // Ini adalah shopName
  };
  shopId?: string; // ID toko tempat produk ini berada
  reviews?: ProductReview[];
  status?: 'available' | 'rented' | 'maintenance' | 'archived'; // Sesuaikan dengan backend jika ada
  total_individual_rentals?: number; // MODIFIKASI: dari rentals menjadi total_individual_rentals
}

export interface HomePageCategoryDisplay {
  id: string;
  name: string;
  count: number;
  image: string;
}

export interface OrderItem {
  productId: string; // ID produk
  name: string;      // Nama produk
  quantity: number;
  pricePerDay: number; // Harga per hari produk saat itu
  image?: string;    // URL gambar utama produk
  // Backend OrderItemSerializer juga memiliki: product, product_name, product_image, price_per_day_at_rental, start_date, end_date, item_total
  // Sesuaikan jika perlu lebih detail di sini.
}

export interface RentalPeriod {
  startDate: string;
  endDate: string;
}

export interface ShopOrder {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // Sebaiknya gunakan tipe Date atau string ISO
  items: OrderItem[];
  rentalPeriod: RentalPeriod; // Mungkin perlu disesuaikan jika rental period per item
  shopId: string;
  status: 'pending' | 'confirmed' | 'rented_out' | 'completed' | 'cancelled' | 'active'; // Sesuaikan
  total: number;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string; // Di sini bisa tetap 'zip' jika form billing menggunakan itu
  };
}

export interface UserRental {
  id: string; // ID dari UserRental itu sendiri (jika ada modelnya) atau OrderId
  orderId: string;
  product: string; // Bisa jadi array nama produk jika satu pesanan banyak item, atau nama produk utama
  shopName: string;
  shopId?: string;
  image: string; // Gambar produk utama atau representatif
  status: 'pending' | 'confirmed' | 'rented_out' | 'completed' | 'cancelled' | 'active'; // Sesuaikan
  startDate: string;
  endDate: string;
  total: number;
  items: OrderItem[]; // Daftar item dalam rental ini
  customerId: string;
}