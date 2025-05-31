// frontend/src/types.ts

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string; // TAMBAHKAN: Karena API Django User model punya username
  first_name?: string; // TAMBAHKAN: Untuk menyimpan nama depan dari API
  last_name?: string; // TAMBAHKAN: Untuk menyimpan nama belakang dari API
  hasShop: boolean;
  shopId?: string;
  shop?: Shop; // Jika Anda memutuskan untuk menyematkan objek Shop
  phone?: string; // TAMBAHKAN INI
  address?: string; // TAMBAHKAN INI
}

export interface Shop {
  id: string;
  name: string;
  description: string;
  location: string;
  rating: number;
  totalRentals: number;
  image: string | null;
  categories: string[];
  ownerId: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  businessType?: string;
}

export interface ProductReview {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface AppProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
  available: boolean;
  owner: {
    id: string;
    name: string;
  };
  shopId?: string;
  reviews?: ProductReview[];
  status?: 'available' | 'rented' | 'maintenance' | 'archived';
  rentals?: number;
}

export interface HomePageCategoryDisplay {
  id: string;
  name: string;
  count: number;
  image: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  pricePerDay: number;
  image?: string;
}

export interface RentalPeriod {
  startDate: string;
  endDate: string;
}

export interface ShopOrder {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  items: OrderItem[];
  rentalPeriod: RentalPeriod;
  shopId: string;
  status: 'pending' | 'confirmed' | 'rented_out' | 'completed' | 'cancelled' | 'active';
  total: number;
  shippingAddress?: { // Opsional, jika Anda menyimpannya
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface UserRental {
  id: string;
  orderId: string;
  product: string; // Bisa jadi array nama produk jika satu pesanan banyak item
  shopName: string;
  shopId?: string;
  image: string; // Gambar produk utama atau representatif
  status: 'pending' | 'confirmed' | 'rented_out' | 'completed' | 'cancelled' | 'active';
  startDate: string;
  endDate: string;
  total: number;
  items: OrderItem[];
  customerId: string;
}