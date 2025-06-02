// frontend/src/context/CartContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { AppProduct } from '../types';
import { apiClient } from '../utils/apiClient'; 
import { useAuth } from './AuthContext'; 

export interface CartItem {
  id: string; 
  product: { 
    id: string;
    name: string;
    image: string; 
    price: number;
    category?: string;
    owner?: { id: string; name: string }; // Ini akan diisi dengan shopId dan shopName
    shopId?: string; // Ini akan diisi dengan shopId
  };
  rentalPeriod: {
    startDate: string;
    endDate: string;
  };
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    productToAdd: AppProduct, 
    rentalPeriod: { startDate: string; endDate: string },
    quantity?: number
  ) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>; 
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
  const [isLoading, setIsLoading] = useState(false); // Inisialisasi bisa true jika loadCart dipanggil di awal
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const processApiCartItem = (apiItem: any): CartItem => {
    // Log data mentah yang diterima dari API per item
    console.log("[CartContext DEBUG] processApiCartItem - RAW apiItem from cart's items array:", JSON.stringify(apiItem, null, 2));
    
    // Asumsi: 'product_detail' adalah field dari CartItemSerializer yang berisi data dari ProductInfoForCartSerializer
    const productDataFromApi = apiItem.product_detail; 

    if (!productDataFromApi) {
      console.error("[CartContext DEBUG] processApiCartItem: CRITICAL - 'product_detail' field is MISSING in apiItem. Check CartItemSerializer on backend. Full apiItem:", JSON.stringify(apiItem));
      // Fallback jika product_detail tidak ada sama sekali
      return {
        id: String(apiItem.id || `fallback-id-${Math.random().toString(36).substring(7)}`),
        product: {
          id: 'unknown-pid', name: 'Product Data Error', image: '', price: 0,
          shopId: 'unknown-sid', owner: { id: 'unknown-sid', name: 'Unknown Shop (Data Error)' },
        },
        quantity: Number(apiItem.quantity || 0),
        rentalPeriod: { startDate: apiItem.start_date || '', endDate: apiItem.end_date || '' },
      };
    }
    
    // Ambil shop_id dan shop_name dari productDataFromApi
    // Jika backend mengirim 'shop_id' dan 'shop_name' di dalam product_detail, ini akan bekerja.
    const shopIdFromProductDetail = String(productDataFromApi.shop_id || `MISSING_SHOP_ID_IN_PD_${productDataFromApi.id}`); 
    const shopNameFromProductDetail = productDataFromApi.shop_name || `MISSING_SHOP_NAME_IN_PD_${productDataFromApi.id}`;

    console.log(`[CartContext DEBUG] processApiCartItem - For CartItem ID: ${apiItem.id}, Product Detail from API (productDataFromApi):`, JSON.stringify(productDataFromApi, null, 2));
    console.log(`[CartContext DEBUG] processApiCartItem - Extracted from product_detail -> shop_id: ${productDataFromApi.shop_id} (becomes ${shopIdFromProductDetail})`);
    console.log(`[CartContext DEBUG] processApiCartItem - Extracted from product_detail -> shop_name: ${productDataFromApi.shop_name} (becomes ${shopNameFromProductDetail})`);

    return {
      id: String(apiItem.id),
      product: {
        id: String(productDataFromApi.id),
        name: productDataFromApi.name || 'Unknown Product',
        image: productDataFromApi.main_image || '', 
        price: parseFloat(productDataFromApi.price as any || 0),
        category: productDataFromApi.category_name || productDataFromApi.category, 
        owner: { 
          id: shopIdFromProductDetail,
          name: shopNameFromProductDetail,
        },
        shopId: shopIdFromProductDetail, // Mengisi shopId dengan shop_id dari product_detail
      },
      quantity: Number(apiItem.quantity),
      rentalPeriod: {
        startDate: apiItem.start_date,
        endDate: apiItem.end_date,
      },
    };
  };

  const loadCart = async () => {
    if (!isAuthenticated || !user?.id) {
      console.log("[CartContext DEBUG] loadCart: User not authenticated or user.id missing. Clearing items state.");
      setItems([]);
      setIsLoading(false); // Penting untuk set false jika tidak ada aksi fetch
      return;
    }
    console.log("[CartContext DEBUG] loadCart: Setting isLoading to true for user:", user.id);
    setIsLoading(true);
    setError(null);
    try {
      // API call ke /api/v1/cart/ (UserCartDetailView)
      const cartApiResponse: { items: any[] } = await apiClient.get('/cart/'); 
      console.log("[CartContext DEBUG] loadCart: RAW cart data fetched from API (/cart/):", JSON.stringify(cartApiResponse, null, 2));
      
      const processedItems = (Array.isArray(cartApiResponse?.items) ? cartApiResponse.items : []).map(processApiCartItem);
      setItems(processedItems);
      console.log("[CartContext DEBUG] loadCart: PROCESSED cart items set to state:", JSON.stringify(processedItems, null, 2));

    } catch (err: any) {
      console.error("[CartContext DEBUG] loadCart: Error fetching cart from API:", err.response?.data || err.message);
      setError(err.response?.data?.detail || err.message || 'Failed to load cart.');
      setItems([]); // Kosongkan item jika ada error saat load
    } finally {
      setIsLoading(false);
      console.log("[CartContext DEBUG] loadCart: Finished. isLoading set to false.");
    }
  };

   useEffect(() => {
    // Hanya panggil loadCart jika user terautentikasi dan ada objek user.id
    if(isAuthenticated && user?.id) { 
        console.log("[CartContext DEBUG] Auth state changed (isAuthenticated or user.id). User authenticated. Calling loadCart for user ID:", user.id);
        loadCart();
    } else {
        console.log("[CartContext DEBUG] Auth state changed (isAuthenticated or user.id). User not authenticated or user object not ready. Clearing items.");
        setItems([]); // Kosongkan items jika tidak ada user terautentikasi
    }
  }, [isAuthenticated, user?.id]); // Dependensi pada user.id


  const addItem = async (
    productToAdd: AppProduct,
    rentalPeriod: { startDate: string; endDate: string },
    quantity: number = 1
  ) => {
    if (!isAuthenticated || !user) {
      alert("Please log in to add items to your cart.");
      console.warn("[CartContext DEBUG] addItem: User not authenticated.");
      throw new Error("User not authenticated");
    }

    setIsLoading(true);
    setError(null);
    const payload = {
      product_id: productToAdd.id, 
      quantity: quantity,
      start_date: rentalPeriod.startDate,
      end_date: rentalPeriod.endDate,
    };
    console.log("[CartContext DEBUG] addItem: Payload to send:", payload);

    try {
      // Panggilan API ke endpoint CartItemViewSet untuk membuat item
      const response = await apiClient.post('/cart-items/', payload); 
      console.log("[CartContext DEBUG] addItem: Response from backend after adding item:", response);
      await loadCart(); // Muat ulang seluruh keranjang untuk mendapatkan ID item keranjang dari backend & konsistensi
    } catch (err: any) {
      console.error("[CartContext DEBUG] addItem: Error adding item to backend:", err.response?.data || err.message);
      const apiErrorMessage = err.response?.data?.product?.[0] || err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || err.message || 'Failed to add item to cart.';
      setError(apiErrorMessage);
      throw new Error(apiErrorMessage); 
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (cartItemId: string) => { 
    if (!isAuthenticated) return; 
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] removeItem: Attempting to remove item ID:", cartItemId);
    try {
      await apiClient.delete(`/cart-items/${cartItemId}/`);
      await loadCart(); 
    } catch (err: any) {
      console.error("[CartContext DEBUG] removeItem: Error removing item:", err.response?.data || err.message);
      setError(err.response?.data?.detail || err.message || 'Failed to remove item.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (!isAuthenticated) return; 

    if (quantity < 1) {
      await removeItem(cartItemId); 
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] updateQuantity: Attempting to update item ID:", cartItemId, "to quantity:", quantity);
    try {
      await apiClient.patch(`/cart-items/${cartItemId}/`, { quantity });
      await loadCart(); 
    } catch (err: any) {
      console.error("[CartContext DEBUG] updateQuantity: Error updating quantity:", err.response?.data || err.message);
      setError(err.response?.data?.detail || err.message || 'Failed to update item quantity.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      setItems([]); 
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log("[CartContext DEBUG] clearCart: Attempting to clear cart on backend.");
    try {
      await apiClient.post('/cart-items/clear-cart/', {});
      setItems([]); 
      console.log("[CartContext DEBUG] clearCart: Cart cleared on backend and frontend state updated.");
    } catch (err: any) {
      console.error("[CartContext DEBUG] clearCart: Error clearing cart:", err.response?.data || err.message);
      setError(err.response?.data?.detail || err.message || 'Failed to clear cart.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const getRentalDaysForCalc = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 1;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (start.toDateString() === end.toDateString()) { days = 1; } else { days +=1; }
      return Math.max(1, days);
    } catch (e) { return 1; }
  };

  const totalPrice = items.reduce((total, item) => {
    if (!item.product || typeof item.product.price !== 'number' || typeof item.quantity !== 'number') {
        console.warn("[CartContext DEBUG] totalPrice: Skipping item due to missing/invalid price or quantity", JSON.stringify(item));
        return total;
    }
    const rentalDays = getRentalDaysForCalc(item.rentalPeriod.startDate, item.rentalPeriod.endDate);
    return total + (item.product.price * rentalDays * item.quantity);
  }, 0);


  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      loadCart,
      totalItems,
      totalPrice,
      isLoading,
      error
    }}>
      {children}
    </CartContext.Provider>
  );
};