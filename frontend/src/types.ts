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
  shop?: Shop; // Jika Anda ingin menyertakan detail shop di sini
  phone?: string;
  address?: string;
}

export interface Category {
  id: string | number;
  name: string;
  description?: string;
}

export interface HomePageCategoryDisplay {
  id: string;
  name: string;
  count: number;
  image: string;
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
  phone_number?: string;
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
  user: string | { id: string | number; username: string; first_name?: string; last_name?: string; };
  rating: number;
  comment: string;
  created_at: string;
  id?: string | number;
}

// Tambahkan interface ini di frontend/src/types.ts
export interface ProductImage {
  id: number | string;
  image: string;
  alt_text?: string | null;
  order?: number;
}

export interface AppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: ProductImage[]; // <--- UBAH MENJADI INI
  category: string;
  category_name?: string;
  rating: number;
  available: boolean;
  owner: { // Ini owner_info dari serializer (info toko)
    id: string; // ID Toko
    name: string; // Nama Toko
  };
  shopId?: string; // ID Toko, bisa sama dengan owner.id
  shop_name?: string; // Nama Toko
  reviews: any[];
  status?: 'available' | 'rented' | 'maintenance' | 'archived';
  total_individual_rentals?: number;
}


export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerDay: number;
  image?: string;
  startDate?: string;
  endDate?: string;
  item_total?: number;
  // Tambahkan product detail jika API mengirimkannya secara nested di OrderItem
  product?: Partial<AppProduct>; // Untuk akses shopId dari produk di dalam item
}

export interface RentalPeriod {
  startDate: string;
  endDate: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'rented_out'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'pending_whatsapp';

// Perbarui ShopOrder agar sesuai dengan RentalOrderSerializer
export interface ShopOrder {
  id: string;
  items: OrderItem[];
  total_price: number; // Dari backend
  status: OrderStatus;
  date: string; // Akan diisi dari created_at

  // Field dari checkout/billing (disimpan di RentalOrder)
  first_name?: string;
  last_name?: string;
  email_at_checkout?: string;
  phone_at_checkout?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;

  payment_reference?: string;
  created_at?: string; // Dari backend
  updated_at?: string; // Dari backend

  // Informasi customer (user yang membuat order)
  user?: Partial<User>; // Backend mengirim objek user
  customerId?: string; // Bisa diisi dari user.id
  customerName?: string; // Bisa diisi dari user.name atau first_name + last_name

  // Informasi toko (jika order terkait satu toko spesifik, atau ambil dari item pertama)
  shopId?: string; // ID Toko utama pesanan (jika ada)
  shopName?: string; // Nama Toko utama pesanan (jika ada)

  // Periode sewa keseluruhan (jika ada, atau ambil dari item)
  rentalPeriod?: RentalPeriod;
}

export interface UserRental {
  id: string;
  orderId: string;
  product: string;
  shopName: string;
  shopId?: string;
  image: string;
  status: OrderStatus;
  startDate: string;
  endDate: string;
  total: number; // Ini akan diisi dari ShopOrder.total_price
  items: OrderItem[];
  customerId: string;
  displayDate?: string;
}