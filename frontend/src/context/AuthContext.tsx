// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import type { User } from '../types';
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserHasShop: (hasShop: boolean, shopId?: string) => void;
  updateUser: (updatedUserInfo: Partial<User>) => void; // <-- TAMBAHKAN INI
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
      }
    }
  }, []);

  const login = async (email: string, _password: string) => {
    const allUsersString = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
    const allUsers: User[] = allUsersString ? JSON.parse(allUsersString) : [];
    
    const foundUser = allUsers.find(u => u.email === email);

    if (foundUser) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setUser(foundUser);
      setIsAuthenticated(true);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(foundUser));
    } else {
      throw new Error('User not found or invalid credentials');
    }
  };

  const register = async (name: string, email: string, _password: string) => {
    const allUsersString = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
    let allUsers: User[] = allUsersString ? JSON.parse(allUsersString) : [];

    if (allUsers.find(u => u.email === email)) {
        throw new Error('Email already registered.');
    }

    const newUser: User = {
      id: `user_new_${Date.now().toString()}`,
      name,
      email,
      hasShop: false,
      // Anda mungkin ingin menambahkan phone dan address sebagai string kosong atau undefined di sini
      phone: '', 
      address: '',
    };
    
    allUsers.push(newUser);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
  };

  const updateUserHasShop = (hasShop: boolean, shopId?: string) => {
    setUser(currentUser => {
      if (currentUser) {
        const updatedUser = { 
          ...currentUser, 
          hasShop, 
          shopId: hasShop ? (shopId || currentUser.shopId) : undefined
        };
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(updatedUser));
        
        const allUsersString = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
        let allUsers: User[] = allUsersString ? JSON.parse(allUsersString) : [];
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            allUsers[userIndex] = updatedUser;
            localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(allUsers));
        }
        return updatedUser;
      }
      return null;
    });
    // Pastikan status autentikasi tetap terjaga jika user masih ada
    if (user) setIsAuthenticated(true); 
  };

  // Implementasi fungsi updateUser
  const updateUser = (updatedUserInfo: Partial<User>) => {
    setUser(currentUser => {
      if (currentUser) {
        const newUserData = { ...currentUser, ...updatedUserInfo };
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(newUserData));
        
        // Update juga di daftar semua pengguna (melarUsers)
        const allUsersString = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
        let allUsers: User[] = allUsersString ? JSON.parse(allUsersString) : [];
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            allUsers[userIndex] = newUserData;
            localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(allUsers));
        }
        console.log("User data updated in context and localStorage:", newUserData);
        return newUserData;
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      register, 
      logout, 
      updateUserHasShop,
      updateUser // <-- Sertakan updateUser di sini
    }}>
      {children}
    </AuthContext.Provider>
  );
};