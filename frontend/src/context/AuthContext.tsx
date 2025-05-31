// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { User } from '../types'; // Pastikan path ini benar
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; // Pastikan path ini benar

// Definisikan Base URL API Anda di sini atau di file konfigurasi terpisah
const API_BASE_URL = 'http://localhost:8000/api/v1'; // Sesuaikan jika port backend Anda berbeda

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // Untuk status loading awal
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserHasShop: (hasShop: boolean, shopId?: string) => void;
  updateUser: (updatedUserInfo: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Fungsi helper untuk membuat objek User frontend dari data API
const constructAppUser = (userDataFromApi: any, userProfileData: any | null): User => {
  const firstName = userDataFromApi.first_name || '';
  const lastName = userDataFromApi.last_name || '';
  
  return {
    id: String(userDataFromApi.pk), // pk adalah primary key dari Django User
    username: userDataFromApi.username,
    email: userDataFromApi.email,
    name: `${firstName} ${lastName}`.trim() || userDataFromApi.username, // Gabungkan nama, fallback ke username
    first_name: firstName,
    last_name: lastName,
    hasShop: userProfileData?.has_shop ?? false, // Ambil dari UserProfile jika ada
    shopId: userProfileData?.shop_id ?? undefined, // Ambil dari UserProfile jika ada
    phone: userProfileData?.phone || userDataFromApi.phone || '', // Coba ambil dari profile dulu, baru dari user data (jika ada)
    address: userProfileData?.address || userDataFromApi.address || '', // Coba ambil dari profile dulu
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const userDetailsResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
            headers: { 'Authorization': `Token ${token}` },
          });

          if (userDetailsResponse.ok) {
            const userDataFromApi = await userDetailsResponse.json();
            let userProfileData = null;

            if (userDataFromApi.pk) {
                try {
                    const profileResponse = await fetch(`${API_BASE_URL}/profiles/${userDataFromApi.pk}/`, {
                        headers: { 'Authorization': `Token ${token}` }
                    });
                    if (profileResponse.ok) {
                        userProfileData = await profileResponse.json();
                    } else if (profileResponse.status !== 404) {
                        console.warn(`Could not fetch profile for user ${userDataFromApi.pk} during init. Status: ${profileResponse.status}`);
                    }
                } catch (profileError) {
                    console.warn("Error fetching user profile details during init:", profileError);
                }
            }
            
            const appUser = constructAppUser(userDataFromApi, userProfileData);
            setUser(appUser);
            setIsAuthenticated(true);
            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(appUser));
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
          }
        } catch (error) {
          console.error("Error initializing auth:", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed. Invalid server response.'}));
        throw new Error(errorData.detail || Object.values(errorData).flat().join(' ') || 'Login failed.');
      }
      const data = await response.json();

      if (data.key) {
        localStorage.setItem('authToken', data.key);
        const userDetailsResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
          headers: { 'Authorization': `Token ${data.key}` },
        });
        if (!userDetailsResponse.ok) throw new Error('Failed to fetch user details post-login.');
        const userDataFromApi = await userDetailsResponse.json();
        
        let userProfileData = null;
        if (userDataFromApi.pk) {
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/profiles/${userDataFromApi.pk}/`, {
                    headers: { 'Authorization': `Token ${data.key}` }
                });
                if (profileResponse.ok) userProfileData = await profileResponse.json();
            } catch (profileError) { console.warn("Error fetching profile post-login:", profileError); }
        }
        const appUser = constructAppUser(userDataFromApi, userProfileData);
        setUser(appUser);
        setIsAuthenticated(true);
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(appUser));
      } else {
        throw new Error('Login successful, but no token received.');
      }
    } catch (error) {
      console.error("Login error:", error);
      logout(); // Pastikan logout jika login gagal setelah dapat token tapi gagal fetch user
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const nameParts = name.trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    try {
      const registrationResponse = await fetch(`${API_BASE_URL}/auth/registration/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email, // Field 'username' di Django User model, diisi dengan email
          email,
          password1: password, // Mengirim 'password1' sesuai permintaan backend
          password2: password, // Konfirmasi password
          first_name,
          last_name,
        }),
      });

      if (!registrationResponse.ok) {
        const errorData = await registrationResponse.json().catch(() => ({ detail: 'Registration failed. Invalid server response.' }));
        throw new Error(errorData.detail || Object.values(errorData).flat().join(' ') || 'Registration failed.');
      }
      
      console.log("Registration successful on backend. Attempting auto-login...");

      // Coba auto-login setelah registrasi berhasil
      try {
        await login(email, password); // Panggil fungsi login yang sudah ada
        console.log("Auto-login after registration successful.");
      } catch (loginError) {
        console.error("Auto-login after registration failed:", loginError);
        throw new Error('Registration successful, but auto-login failed. Please log in manually.');
      }
    } catch (error) {
      console.error("Registration/Auto-login process error:", error);
      throw error;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
        });
      } catch (error) { console.error("Logout API call failed (token might be already invalid):", error); }
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
  };
  
  const updateUserHasShop = (hasShopStatus: boolean, shopIdValue?: string) => {
    setUser(currentUser => {
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          hasShop: hasShopStatus,
          shopId: hasShopStatus ? (shopIdValue || currentUser.shopId) : undefined
        };
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    });
  };

  const updateUser = async (updatedUserInfo: Partial<User>) => {
    if (!user || !user.id || !isAuthenticated) throw new Error("User not authenticated.");
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error("Auth token not found.");

    const userUpdatePayload: any = {};
    // Hanya sertakan field yang akan diupdate untuk User model
    if (updatedUserInfo.email && updatedUserInfo.email !== user.email) userUpdatePayload.email = updatedUserInfo.email;
    if (updatedUserInfo.name && updatedUserInfo.name !== user.name) {
        const nameParts = updatedUserInfo.name.trim().split(' ');
        userUpdatePayload.first_name = nameParts[0] || '';
        userUpdatePayload.last_name = nameParts.slice(1).join(' ') || '';
    } else { // Jika nama tidak diubah, kirim nama yang ada
        userUpdatePayload.first_name = user.first_name;
        userUpdatePayload.last_name = user.last_name;
    }
    // Username biasanya tidak diubah atau memerlukan proses khusus, jadi kita kirim yang ada
    userUpdatePayload.username = user.username;


    // Payload untuk UserProfileViewSet (/profiles/{id}/)
    const profileUpdatePayload: any = {};
    if (updatedUserInfo.phone !== undefined && updatedUserInfo.phone !== user.phone) {
        profileUpdatePayload.phone = updatedUserInfo.phone;
    }
    if (updatedUserInfo.address !== undefined && updatedUserInfo.address !== user.address) {
        profileUpdatePayload.address = updatedUserInfo.address;
    }
    
    try {
      // 1. Update data User via /auth/user/
      if (Object.keys(userUpdatePayload).length > 0 && (userUpdatePayload.email || userUpdatePayload.first_name !== undefined || userUpdatePayload.last_name !== undefined)) {
          const userUpdateResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
              method: 'PUT', 
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(userUpdatePayload), 
          });
          if (!userUpdateResponse.ok) {
              const errorData = await userUpdateResponse.json();
              console.error("Backend error (User update):", errorData);
              throw new Error(`Failed to update user details: ${JSON.stringify(errorData)}`);
          }
      }

      // 2. Update data UserProfile via /profiles/{id}/ jika ada perubahan
      if (Object.keys(profileUpdatePayload).length > 0) {
          const profileUpdateResponse = await fetch(`${API_BASE_URL}/profiles/${user.id}/`, {
              method: 'PATCH',
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(profileUpdatePayload),
          });
           if (!profileUpdateResponse.ok) {
              const errorData = await profileUpdateResponse.json();
              console.error("Backend error (Profile update):", errorData);
              throw new Error(`Failed to update user profile: ${JSON.stringify(errorData)}`);
          }
      }
      
      // 3. Re-fetch data user & profile yang terbaru untuk memastikan konsistensi
      const finalUserResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!finalUserResponse.ok) throw new Error('Failed to re-fetch user data after update.');
      const finalUserDataFromApi = await finalUserResponse.json();

      let finalUserProfileData = null;
       if (finalUserDataFromApi.pk) {
            try {
                const finalProfileResponse = await fetch(`${API_BASE_URL}/profiles/${finalUserDataFromApi.pk}/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (finalProfileResponse.ok) finalUserProfileData = await finalProfileResponse.json();
            } catch (profileError) { console.warn("Error re-fetching user profile post-update:", profileError); }
        }

      const finalAppUser = constructAppUser(finalUserDataFromApi, finalUserProfileData);
      
      setUser(finalAppUser);
      setIsAuthenticated(true); // Pastikan tetap authenticated
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(finalAppUser));

    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading, login, register, logout, updateUserHasShop, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};