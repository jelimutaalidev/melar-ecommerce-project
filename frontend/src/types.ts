// frontend/src/types.ts

export interface User {
  id: string;
  name: string; // Ini bisa jadi gabungan first_name dan last_name atau display name
  email: string;
  username?: string; // Biasanya ada dari Django User model
  first_name?: string; // <-- DARI API BACKEND (snake_case)
  last_name?: string;  // <-- DARI API BACKEND (snake_case)
  hasShop: boolean;
  shopId?: string;
  shop?: Shop; 
  phone?: string;   // Pastikan ini ada jika AuthContext mencoba mengisinya
  address?: string; // Pastikan ini ada jika AuthContext mencoba mengisinya
}

export interface Category {
  id: string | number; 
  name: string;
  description?: string;
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  totalRentals: number;
  image: string | null;
  categories: Category[]; 
  ownerId: string; 
  phone_number?: string; // Pastikan field ini ada jika Anda ingin menggunakannya untuk WA
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  business_type?: string;
  product_count: number; 
  created_at?: string; 
  updated_at?: string; 
}

export interface ProductReview {
  // Jika user adalah objek User sederhana dari backend (misal hanya id dan username)
  // Anda bisa mendefinisikan tipe UserBasicInfo di sini
  // Untuk sekarang, asumsikan user adalah string username atau ID user.
  user: string | { id: string | number; username: string; first_name?: string; last_name?: string; };
  rating: number;
  comment: string;
  date: string; 
  id?: string | number; // Review biasanya punya ID sendiri
}

export interface AppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string; // Nama kategori
  rating: number;
  available: boolean;
  owner: { // Ini adalah owner_info dari serializer backend (biasanya info toko)
    id: string; // ID Toko
    name: string; // Nama Toko
  };
  shopId?: string; // Bisa redundan jika owner.id adalah shopId, tapi bagus untuk kejelasan
  reviews?: ProductReview[];
  status?: 'available' | 'rented' | 'maintenance' | 'archived';
  total_individual_rentals?: number;
  // Tambahkan field lain yang mungkin dikirim oleh AppProductSerializer Anda
  shop_name?: string; // Dari AppProductSerializer
  category_name?: string; // Dari AppProductSerializer (meskipun category sudah ada)
  owner_info?: { id: string; name: string; }; // Jika API masih mengirim ini dan belum di-map ke 'owner'
}

export interface HomePageCategoryDisplay {
  id: string;
  name: string;
  count: number; // Jumlah toko atau produk dalam kategori ini
  image: string;
}

// Tipe untuk item di dalam pesanan (ShopOrder atau RentalOrder backend)
// Sesuaikan dengan OrderItemSerializer Anda di backend
export interface OrderItem {
  productId: string; 
  name: string;      
  quantity: number;
  pricePerDay: number; 
  image?: string;      
  // Tambahan dari OrderItem model backend Anda
  startDate?: string; // Jika setiap item bisa punya periode sewa sendiri
  endDate?: string;   // Jika setiap item bisa punya periode sewa sendiri
  item_total?: number; // Jika backend mengirimkan subtotal per item
}

export interface RentalPeriod {
  startDate: string;
  endDate: string;
}

// Definisikan tipe untuk status pesanan yang diizinkan
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'rented_out' // atau 'active' jika itu yang Anda gunakan
  | 'completed' 
  | 'cancelled' 
  | 'active'      // Sudah ada, pastikan konsisten dengan 'rented_out'
  | 'pending_whatsapp'; // <-- STATUS BARU DITAMBAHKAN

export interface ShopOrder { // Ini lebih seperti "Pesanan yang diterima oleh Toko"
  id: string;
  customerId: string; // ID User yang memesan
  customerName: string; // Nama User yang memesan
  date: string; 
  items: OrderItem[];
  // Jika semua item dalam satu ShopOrder HARUS memiliki periode sewa yang sama:
  rentalPeriod: RentalPeriod; 
  shopId: string; // ID Toko yang menerima pesanan ini
  status: OrderStatus; // Menggunakan tipe OrderStatus yang sudah didefinisikan
  total_price: number; // <--- UBAH INI
  shippingAddress?: { // Alamat pengiriman/billing dari form checkout
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string; 
  };
  // Field tambahan yang mungkin ada di RentalOrder backend Anda
  payment_reference?: string;
}

export interface UserRental { // Ini lebih seperti "Histori Sewa dari sisi Pengguna"
  id: string; 
  orderId: string; // Merujuk ke ID ShopOrder atau RentalOrder backend
  product: string; // Deskripsi produk (bisa nama, atau gabungan nama jika >1)
  shopName: string;
  shopId?: string;
  image: string; 
  status: OrderStatus; // Menggunakan tipe OrderStatus
  startDate: string;
  endDate: string;
  total: number;
  items: OrderItem[]; 
  customerId: string; // Untuk memastikan ini milik user yang login
  displayDate?: string;
}