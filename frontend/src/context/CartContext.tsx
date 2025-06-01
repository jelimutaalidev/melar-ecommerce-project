// frontend/src/context/CartContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { AppProduct } from '../types'; // Impor AppProduct
import { apiClient } from '../utils/apiClient'; // Pastikan apiClient diimpor
import { useAuth } from './AuthContext'; // Impor useAuth untuk mendapatkan user

// Tipe CartItem di frontend. Ini mungkin perlu disesuaikan agar cocok
// dengan data yang dikembalikan oleh CartItemSerializer di backend.
// Khususnya bagian 'product' bisa jadi lebih sederhana atau butuh mapping.
export interface CartItem {
  id: string; // ID dari CartItem di backend
  product: { // Sesuaikan dengan ProductInfoForCartSerializer atau data produk yang relevan
    id: string;
    name: string;
    image: string; // URL gambar utama
    price: number;
    category?: string;
    owner?: { id: string; name: string };
    shopId?: string;
    // tambahkan field lain dari AppProduct jika dibutuhkan di tampilan keranjang
  };
  rentalPeriod: {
    startDate: string;
    endDate: string;
  };
  quantity: number;
  // subtotal?: number; // Mungkin dikirim dari backend atau dihitung di frontend
  // added_at?: string; // Mungkin dikirim dari backend
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    productToAdd: AppProduct, // Menggunakan AppProduct penuh untuk info lengkap
    rentalPeriod: { startDate: string; endDate: string },
    quantity?: number
  ) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>; // Fungsi untuk memuat cart dari backend
  totalItems: number;
  totalPrice: number;
  isLoading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Fungsi untuk memproses item dari API agar sesuai dengan tipe CartItem frontend
  const processApiCartItem = (apiItem: any): CartItem => {
    // Di sini kita asumsikan apiItem.product adalah objek yang dikirim oleh ProductInfoForCartSerializer
    // atau detail produk yang relevan dari backend.
    return {
      id: String(apiItem.id), // ID dari CartItem itu sendiri
      product: {
        id: String(apiItem.product_detail?.id || apiItem.product?.id),
        name: apiItem.product_detail?.name || apiItem.product?.name || 'Unknown Product',
        image: apiItem.product_detail?.main_image || apiItem.product?.main_image || (Array.isArray(apiItem.product?.images) ? apiItem.product.images[0] : '') || '',
        price: parseFloat(apiItem.product_detail?.price as any || apiItem.product?.price as any || 0),
        category: apiItem.product_detail?.category || apiItem.product?.category,
        // Untuk owner dan shopId, sesuaikan dengan bagaimana backend mengirimkannya dalam konteks CartItem
        // Jika product_detail tidak punya owner/shopId, mungkin perlu dari product object utama jika ada
        owner: apiItem.product_detail?.owner || apiItem.product?.owner_info, // Sesuaikan dengan struktur backend Anda
        shopId: apiItem.product_detail?.shop_id || apiItem.product?.shop_id || apiItem.product_detail?.owner?.id,
      },
      quantity: Number(apiItem.quantity),
      rentalPeriod: {
        startDate: apiItem.start_date, // Pastikan nama field dari backend benar
        endDate: apiItem.end_date,     // Pastikan nama field dari backend benar
      },
      // subtotal: parseFloat(apiItem.subtotal as any || 0),
      // added_at: apiItem.added_at
    };
  };

  const loadCart = async () => {
    if (!isAuthenticated || !user) {
      console.log("[CartContext DEBUG] loadCart: User not authenticated. Clearing/loading guest cart (if any).");
      setItems([]); // Atau localStorage.getItem('guestCart')
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] loadCart: Attempting to fetch cart from API for user:", user.id);
    try {
      // GET /api/v1/cart/ (dari UserCartDetailView) akan mengembalikan objek Cart
      // yang berisi list 'items'
      const cartApiResponse: { items: any[] } = await apiClient.get('/cart/'); // Endpoint untuk UserCartDetailView
      console.log("[CartContext DEBUG] loadCart: Cart data fetched from API:", cartApiResponse);
      
      const processedItems = (Array.isArray(cartApiResponse?.items) ? cartApiResponse.items : []).map(processApiCartItem);
      setItems(processedItems);
      console.log("[CartContext DEBUG] loadCart: Processed cart items set to state:", processedItems);

    } catch (err: any) {
      console.error("[CartContext DEBUG] loadCart: Error fetching cart from API:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to load cart.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Hapus sinkronisasi otomatis localStorage jika sudah full backend
    // localStorage.setItem('cart', JSON.stringify(items));
    // Gantinya, panggil loadCart saat user berubah atau login
    if(isAuthenticated) {
        loadCart();
    } else {
        setItems([]); // Kosongkan cart jika logout
        // Hapus juga guest cart dari localStorage jika ada
        // localStorage.removeItem('guestCart');
    }
  }, [isAuthenticated, user]); // Dependensi pada user juga

  const addItem = async (
    productToAdd: AppProduct,
    rentalPeriod: { startDate: string; endDate: string },
    quantity: number = 1
  ) => {
    if (!isAuthenticated || !user) {
      alert("Please log in to add items to your cart.");
      // Logika untuk guest cart bisa ditambahkan di sini jika diinginkan
      console.warn("[CartContext DEBUG] addItem: User not authenticated.");
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] addItem: User authenticated. Attempting to add to backend. Product ID:", productToAdd.id, "Payload:", {
      product_id: productToAdd.id,
      quantity,
      start_date: rentalPeriod.startDate,
      end_date: rentalPeriod.endDate,
    });

    try {
      const payload = {
        product_id: productToAdd.id, // Sesuai CartItemSerializer (write_only field)
        quantity: quantity,
        start_date: rentalPeriod.startDate,
        end_date: rentalPeriod.endDate,
      };
      // POST ke /api/v1/cart-items/ (dari CartItemViewSet)
      const response = await apiClient.post('/cart-items/', payload);
      console.log("[CartContext DEBUG] addItem: Response from backend after adding item:", response);
      await loadCart(); // Reload seluruh cart untuk konsistensi
    } catch (err: any) {
      console.error("[CartContext DEBUG] addItem: Error adding item to backend:", err);
      setError(err.response?.data?.detail || err.response?.data?.product?.[0] || err.message || 'Failed to add item to cart.');
      // Throw error agar bisa ditangkap di ProductDetailPage jika perlu
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (cartItemId: string) => { // cartItemId adalah ID dari CartItem di backend
    if (!isAuthenticated) return; // Atau handle guest cart
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] removeItem: Attempting to remove item ID:", cartItemId);
    try {
      await apiClient.delete(`/cart-items/${cartItemId}/`);
      await loadCart(); // Reload seluruh cart
    } catch (err: any) {
      console.error("[CartContext DEBUG] removeItem: Error removing item:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to remove item.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (!isAuthenticated) return; // Atau handle guest cart

    if (quantity < 1) {
      await removeItem(cartItemId); // Jika kuantitas < 1, anggap hapus item
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] updateQuantity: Attempting to update item ID:", cartItemId, "to quantity:", quantity);
    try {
      // PATCH ke /api/v1/cart-items/{cartItemId}/
      await apiClient.patch(`/cart-items/${cartItemId}/`, { quantity });
      await loadCart(); // Reload seluruh cart
    } catch (err: any) {
      console.error("[CartContext DEBUG] updateQuantity: Error updating quantity:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to update item quantity.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      setItems([]); // Untuk guest, langsung kosongkan
      // localStorage.removeItem('guestCart');
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] clearCart: Attempting to clear cart on backend.");
    try {
      // POST ke /api/v1/cart-items/clear-cart/
      await apiClient.post('/cart-items/clear-cart/', {});
      setItems([]); // Langsung kosongkan di frontend juga
    } catch (err: any) {
      console.error("[CartContext DEBUG] clearCart: Error clearing cart:", err);
      setError(err.response?.data?.detail || err.message || 'Failed to clear cart.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const totalPrice = items.reduce((total, item) => {
    if (!item.product || typeof item.product.price !== 'number' || typeof item.quantity !== 'number') return total;

    const startDate = new Date(item.rentalPeriod.startDate);
    const endDate = new Date(item.rentalPeriod.endDate);
    let rentalDays = 0;
    if (startDate && endDate && startDate <= endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (startDate.toDateString() === endDate.toDateString()) {
            rentalDays = 1;
        } else {
            rentalDays +=1;
        }
        rentalDays = Math.max(1, rentalDays);
    } else {
        rentalDays = 1;
    }
    return total + (item.product.price * rentalDays * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      loadCart, // expose loadCart
      totalItems,
      totalPrice,
      isLoading, // expose isLoading
      error      // expose error
    }}>
      {children}
    </CartContext.Provider>
  );
};