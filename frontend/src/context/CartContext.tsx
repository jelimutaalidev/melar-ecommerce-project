// frontend/src/context/CartContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import type { AppProduct } from '../types'; // Impor AppProduct

// Definisikan CartItem di sini atau impor dari types.ts jika sudah dipindahkan
export interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  rentalPeriod: {
    startDate: string;
    endDate: string;
  };
  quantity: number;
  owner?: {
    id: string;
    name: string;
  };
  shopId?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Pick<AppProduct, 'id' | 'name' | 'images' | 'price' | 'owner' | 'shopId' | 'category'> & { rentalPeriod: { startDate: string, endDate: string } }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setItems(JSON.parse(storedCart));
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
        localStorage.removeItem('cart'); // Hapus jika korup
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (itemToAdd: Pick<AppProduct, 'id' | 'name' | 'images' | 'price' | 'owner' | 'shopId' | 'category'> & { rentalPeriod: { startDate: string, endDate: string } }) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        i => i.id === itemToAdd.id &&
        i.rentalPeriod.startDate === itemToAdd.rentalPeriod.startDate &&
        i.rentalPeriod.endDate === itemToAdd.rentalPeriod.endDate
      );
      
      if (existingItemIndex >= 0) {
        const newItems = [...prevItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + 1
        };
        return newItems;
      } else {
        return [...prevItems, { 
          id: itemToAdd.id,
          name: itemToAdd.name,
          image: itemToAdd.images[0] || '',
          price: itemToAdd.price,
          rentalPeriod: itemToAdd.rentalPeriod,
          quantity: 1,
          owner: itemToAdd.owner,
          shopId: itemToAdd.shopId,
          // category: itemToAdd.category // Anda bisa menambahkan category jika diperlukan di CartItem
        }];
      }
    });
  };

  const removeItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
        // Jika kuantitas menjadi 0 atau kurang, hapus item dari keranjang
        removeItem(id);
        return;
    };
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const totalPrice = items.reduce((total, item) => {
    const startDate = new Date(item.rentalPeriod.startDate);
    const endDate = new Date(item.rentalPeriod.endDate);
    let rentalDays = 0;
    if (startDate && endDate && startDate <= endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (startDate.toDateString() === endDate.toDateString()) {
            rentalDays = 1; // Minimal 1 hari jika tanggal sama
        } else {
            rentalDays +=1; // Inklusif jika tanggal berbeda
        }
        rentalDays = Math.max(1, rentalDays); // Pastikan minimal 1 hari
    } else {
        rentalDays = 1; // Fallback jika tanggal tidak valid
    }
    return total + (item.price * rentalDays * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart, 
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};