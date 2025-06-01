// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { User } from '../types'; //
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; //

const API_BASE_URL = 'http://localhost:8000/api/v1';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
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

const constructAppUser = (userDataFromApi: any, userProfileData: any | null): User | null => {
  console.log("[AuthContext] constructAppUser - userDataFromApi:", JSON.stringify(userDataFromApi));
  console.log("[AuthContext] constructAppUser - userProfileData:", JSON.stringify(userProfileData));

  // PERBAIKAN: Gunakan userDataFromApi.id (sesuai output log Anda)
  const userId = userDataFromApi?.id; 
  
  if (userId === null || userId === undefined) {
    console.error("[AuthContext] FATAL: User ID (id) from API is null or undefined!", userDataFromApi);
    return null; 
  }

  const firstName = userDataFromApi?.first_name || '';
  const lastName = userDataFromApi?.last_name || '';
  const shopIdFromProfile = userProfileData?.shop_id;

  return {
    id: String(userId), 
    username: userDataFromApi?.username,
    email: userDataFromApi?.email,
    name: `${firstName} ${lastName}`.trim() || userDataFromApi?.username || 'Unnamed User',
    first_name: firstName,
    last_name: lastName,
    hasShop: userProfileData?.has_shop ?? false,
    shopId: shopIdFromProfile ? String(shopIdFromProfile) : undefined,
    phone: userProfileData?.phone || userDataFromApi?.phone || '',
    address: userProfileData?.address || userDataFromApi?.address || '',
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("[AuthContext_INIT] Starting auth initialization...");
      const token = localStorage.getItem('authToken');
      if (token) {
        console.log("[AuthContext_INIT] Token found in localStorage:", token);
        try {
          const userDetailsResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
            headers: { 'Authorization': `Token ${token}` },
          });
          console.log("[AuthContext_INIT] User details API response status:", userDetailsResponse.status);

          if (userDetailsResponse.ok) {
            const userDataFromApi = await userDetailsResponse.json();
            console.log("[AuthContext_INIT] User details API response data:", JSON.stringify(userDataFromApi));
            let userProfileData = null;

            // PERBAIKAN: Gunakan userDataFromApi.id untuk fetch profile
            if (userDataFromApi && userDataFromApi.id) { 
              console.log(`[AuthContext_INIT] Fetching profile for user id: ${userDataFromApi.id}`);
              try {
                const profileResponse = await fetch(`${API_BASE_URL}/profiles/${userDataFromApi.id}/`, {
                  headers: { 'Authorization': `Token ${token}` }
                });
                console.log("[AuthContext_INIT] User profile API response status:", profileResponse.status);
                if (profileResponse.ok) {
                  userProfileData = await profileResponse.json();
                  console.log("[AuthContext_INIT] User profile API response data:", JSON.stringify(userProfileData));
                } else if (profileResponse.status !== 404) {
                  console.warn(`[AuthContext_INIT] Could not fetch profile for user ${userDataFromApi.id}. Status: ${profileResponse.status}`);
                } else {
                  console.log(`[AuthContext_INIT] User profile not found (404) for user ${userDataFromApi.id}, this might be normal.`);
                }
              } catch (profileError) {
                console.warn("[AuthContext_INIT] Error fetching user profile details during init:", profileError);
              }
            } else {
              console.warn("[AuthContext_INIT] userDataFromApi.id is missing, cannot fetch profile. userDataFromApi:", JSON.stringify(userDataFromApi));
            }
            
            const appUser = constructAppUser(userDataFromApi, userProfileData);
            if (appUser && appUser.id && appUser.id !== "undefined" && appUser.id !== "null") {
                setUser(appUser);
                setIsAuthenticated(true);
                localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(appUser));
                console.log("[AuthContext_INIT] Auth initialized successfully. User set:", JSON.stringify(appUser));
            } else {
                console.error("[AuthContext_INIT] Failed to construct valid appUser or appUser.id is invalid. Clearing auth.", appUser);
                localStorage.removeItem('authToken');
                localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
                setUser(null);
                setIsAuthenticated(false);
            }
          } else {
            console.warn("[AuthContext_INIT] User details API call not OK. Clearing token.");
            localStorage.removeItem('authToken');
            localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("[AuthContext_INIT] Error during auth initialization:", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log("[AuthContext_INIT] No token found in localStorage.");
      }
      setLoading(false);
      console.log("[AuthContext_INIT] Auth initialization finished. Loading set to false.");
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log("[AuthContext_LOGIN] Attempting login for email:", email);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log("[AuthContext_LOGIN] Login API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed. Invalid server response.'}));
        console.error("[AuthContext_LOGIN] Login API error data:", errorData);
        throw new Error(errorData.detail || Object.values(errorData).flat().join(' ') || 'Login failed.');
      }
      const data = await response.json();
      console.log("[AuthContext_LOGIN] Login API response data (token):", data);

      if (data.key) {
        localStorage.setItem('authToken', data.key);
        const userDetailsResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
          headers: { 'Authorization': `Token ${data.key}` },
        });
        console.log("[AuthContext_LOGIN] User details API response status (post-login):", userDetailsResponse.status);
        if (!userDetailsResponse.ok) {
            const errDet = await userDetailsResponse.text();
            console.error("[AuthContext_LOGIN] Failed to fetch user details post-login. Response:", errDet);
            throw new Error('Failed to fetch user details post-login.');
        }
        const userDataFromApi = await userDetailsResponse.json();
        console.log("[AuthContext_LOGIN] User details API data (post-login):", JSON.stringify(userDataFromApi));
        
        let userProfileData = null;
        // PERBAIKAN: Gunakan userDataFromApi.id untuk fetch profile
        if (userDataFromApi && userDataFromApi.id) { 
            console.log(`[AuthContext_LOGIN] Fetching profile for user id: ${userDataFromApi.id} (post-login)`);
            try {
                const profileResponse = await fetch(`${API_BASE_URL}/profiles/${userDataFromApi.id}/`, { 
                    headers: { 'Authorization': `Token ${data.key}` }
                });
                console.log("[AuthContext_LOGIN] Profile API response status (post-login):", profileResponse.status);
                if (profileResponse.ok) {
                    userProfileData = await profileResponse.json();
                    console.log("[AuthContext_LOGIN] Profile API data (post-login):", JSON.stringify(userProfileData));
                } else {
                     console.warn(`[AuthContext_LOGIN] Could not fetch profile post-login for user ${userDataFromApi.id}. Status: ${profileResponse.status}`);
                }
            } catch (profileError) { console.warn("[AuthContext_LOGIN] Error fetching profile post-login:", profileError); }
        } else {
            console.warn("[AuthContext_LOGIN] userDataFromApi.id is missing post-login, cannot fetch profile. userDataFromApi:", JSON.stringify(userDataFromApi));
        }
        
        const appUser = constructAppUser(userDataFromApi, userProfileData);
        if (appUser && appUser.id && appUser.id !== "undefined" && appUser.id !== "null") {
            setUser(appUser);
            setIsAuthenticated(true);
            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(appUser));
            console.log("[AuthContext_LOGIN] Login successful. User set:", JSON.stringify(appUser));
        } else {
            console.error("[AuthContext_LOGIN] Failed to construct valid appUser after login or appUser.id is invalid. Clearing auth.", appUser);
            await logout();
            throw new Error('Login processed but failed to set user data.');
        }
      } else {
        console.error("[AuthContext_LOGIN] Login successful, but no token (key) received.");
        throw new Error('Login successful, but no token received.');
      }
    } catch (error) {
      console.error("[AuthContext_LOGIN] Overall login error:", error);
      await logout(); 
      throw error;
    } finally {
        setLoading(false);
        console.log("[AuthContext_LOGIN] Login process finished. Loading set to false.");
    }
  };

  const register = async (name: string, email: string, password: string) => {
    console.log("[AuthContext_REGISTER] Attempting registration for email:", email, "name:", name);
    setLoading(true);
    const nameParts = name.trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    try {
      const registrationResponse = await fetch(`${API_BASE_URL}/auth/registration/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email, 
          email,
          password1: password, 
          password2: password, 
          first_name,
          last_name,
        }),
      });
      console.log("[AuthContext_REGISTER] Registration API response status:", registrationResponse.status);

      if (!registrationResponse.ok) {
        const errorData = await registrationResponse.json().catch(() => ({ detail: 'Registration failed. Invalid server response.' }));
        console.error("[AuthContext_REGISTER] Registration API error data:", errorData);
        throw new Error(errorData.detail || Object.values(errorData).flat().join(' ') || 'Registration failed.');
      }
      
      console.log("[AuthContext_REGISTER] Registration successful on backend. Attempting auto-login...");
      await login(email, password);
      console.log("[AuthContext_REGISTER] Auto-login after registration successful.");

    } catch (error) {
      console.error("[AuthContext_REGISTER] Registration/Auto-login process error:", error);
      throw error; 
    } finally {
        setLoading(false);
        console.log("[AuthContext_REGISTER] Registration process finished. Loading set to false.");
    }
  };

  const logout = async () => {
    console.log("[AuthContext_LOGOUT] Attempting logout.");
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const logoutResponse = await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
        });
        console.log("[AuthContext_LOGOUT] Logout API response status:", logoutResponse.status);
      } catch (error) { console.error("[AuthContext_LOGOUT] Logout API call failed (token might be already invalid):", error); }
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
    console.log("[AuthContext_LOGOUT] User logged out, auth state cleared.");
  };
  
  const updateUserHasShop = (hasShopStatus: boolean, shopIdValue?: string) => {
    console.log("[AuthContext] updateUserHasShop called. hasShopStatus:", hasShopStatus, "shopIdValue:", shopIdValue);
    setUser(currentUser => {
      if (currentUser) {
        if (!currentUser.id || currentUser.id === "undefined" || currentUser.id === "null") {
            console.error("[AuthContext] updateUserHasShop - currentUser has invalid ID, aborting update. Current user:", JSON.stringify(currentUser));
            return currentUser;
        }
        console.log("[AuthContext] updateUserHasShop - currentUser before update:", JSON.stringify(currentUser));
        const newShopId = hasShopStatus && shopIdValue ? String(shopIdValue) : undefined;
        
        if (hasShopStatus && (!shopIdValue || shopIdValue === "undefined" || shopIdValue === "null" || shopIdValue.trim() === "")) {
            console.error(`[AuthContext] updateUserHasShop - Attempted to set hasShop to true but shopIdValue is invalid or empty: '${shopIdValue}'. Aborting shopId update for user: ${currentUser.id}`);
            const updatedUserWithoutValidShopId = {
                ...currentUser,
                hasShop: hasShopStatus, // Tetap update hasShop jika diminta
                                        // tapi jangan set shopId jika invalid.
            };
             localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(updatedUserWithoutValidShopId));
            return updatedUserWithoutValidShopId;
        }

        const updatedUser = {
          ...currentUser,
          hasShop: hasShopStatus,
          shopId: newShopId
        };
        console.log("[AuthContext] updateUserHasShop - updatedUser:", JSON.stringify(updatedUser));
        localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(updatedUser));
        return updatedUser;
      }
      console.warn("[AuthContext] updateUserHasShop - currentUser is null, cannot update.");
      return null;
    });
  };

  const updateUser = async (updatedUserInfo: Partial<User>) => {
    console.log("[AuthContext_UPDATE_USER] Attempting to update user. Current user:", JSON.stringify(user), "Update info:", JSON.stringify(updatedUserInfo));
    if (!user || !user.id || user.id === "undefined" || user.id === "null" || !isAuthenticated) {
        console.error("[AuthContext_UPDATE_USER] User not authenticated or user ID is invalid.");
        throw new Error("User not authenticated or user ID is invalid.");
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.error("[AuthContext_UPDATE_USER] Auth token not found.");
        throw new Error("Auth token not found.");
    }

    const userUpdatePayload: any = {};
    if (updatedUserInfo.email && updatedUserInfo.email !== user.email) {
      userUpdatePayload.email = updatedUserInfo.email;
    }
    
    if (updatedUserInfo.name && updatedUserInfo.name !== user.name) {
        const nameParts = updatedUserInfo.name.trim().split(' ');
        userUpdatePayload.first_name = nameParts[0] || '';
        userUpdatePayload.last_name = nameParts.slice(1).join(' ') || '';
    }
    
    const profileUpdatePayload: any = {};
    if (updatedUserInfo.phone !== undefined && updatedUserInfo.phone !== user.phone) {
        profileUpdatePayload.phone = updatedUserInfo.phone;
    }
    if (updatedUserInfo.address !== undefined && updatedUserInfo.address !== user.address) {
        profileUpdatePayload.address = updatedUserInfo.address;
    }
    
    console.log("[AuthContext_UPDATE_USER] User update payload:", JSON.stringify(userUpdatePayload));
    console.log("[AuthContext_UPDATE_USER] Profile update payload:", JSON.stringify(profileUpdatePayload));

    try {
      let userDataChanged = false;
      // Hanya kirim PUT jika ada perubahan field User Django atau jika endpoint mengharapkannya
      // Untuk dj-rest-auth /auth/user/ PUT, biasanya semua field User diperlukan.
      if (Object.keys(userUpdatePayload).length > 0 || (updatedUserInfo.name && updatedUserInfo.name !== user.name)) {
          console.log("[AuthContext_UPDATE_USER] Sending user update to /auth/user/");
          const fullUserPayloadForPut = {
            username: user.username, // username diperlukan oleh serializer UserDetailsSerializer
            email: userUpdatePayload.email !== undefined ? userUpdatePayload.email : user.email,
            first_name: userUpdatePayload.first_name !== undefined ? userUpdatePayload.first_name : user.first_name,
            last_name: userUpdatePayload.last_name !== undefined ? userUpdatePayload.last_name : user.last_name,
          };

          const userUpdateResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
              method: 'PUT', 
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(fullUserPayloadForPut), 
          });
          console.log("[AuthContext_UPDATE_USER] User update API response status:", userUpdateResponse.status);
          if (!userUpdateResponse.ok) {
              const errorData = await userUpdateResponse.json().catch(() => ({ detail: 'User update failed.' }));
              console.error("Backend error (User update):", errorData);
              throw new Error(`Failed to update user details: ${JSON.stringify(errorData)}`);
          }
          userDataChanged = true;
      }

      let profileDataChanged = false;
      const numericUserId = parseInt(user.id, 10); // Pastikan ID numerik untuk URL profil
      if (isNaN(numericUserId)) {
          console.error("[AuthContext_UPDATE_USER] Cannot update profile, user.id is not a valid number:", user.id);
      } else if (Object.keys(profileUpdatePayload).length > 0) {
          console.log(`[AuthContext_UPDATE_USER] Sending profile update to /profiles/${numericUserId}/`);
          const profileUpdateResponse = await fetch(`${API_BASE_URL}/profiles/${numericUserId}/`, {
              method: 'PATCH',
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(profileUpdatePayload),
          });
          console.log("[AuthContext_UPDATE_USER] Profile update API response status:", profileUpdateResponse.status);
           if (!profileUpdateResponse.ok) {
              const errorData = await profileUpdateResponse.json().catch(() => ({ detail: 'Profile update failed.' }));
              console.error("Backend error (Profile update):", errorData);
              throw new Error(`Failed to update user profile: ${JSON.stringify(errorData)}`);
          }
          profileDataChanged = true;
      }
      
      if (userDataChanged || profileDataChanged) {
        console.log("[AuthContext_UPDATE_USER] Re-fetching user data after update.");
        const finalUserResponse = await fetch(`${API_BASE_URL}/auth/user/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!finalUserResponse.ok) throw new Error('Failed to re-fetch user data after update.');
        const finalUserDataFromApi = await finalUserResponse.json();
        console.log("[AuthContext_UPDATE_USER] Re-fetched user data:", JSON.stringify(finalUserDataFromApi));

        let finalUserProfileData = null;
        if (finalUserDataFromApi && finalUserDataFromApi.id) { 
              try {
                  const finalProfileResponse = await fetch(`${API_BASE_URL}/profiles/${finalUserDataFromApi.id}/`, {
                      headers: { 'Authorization': `Token ${token}` }
                  });
                  if (finalProfileResponse.ok) {
                    finalUserProfileData = await finalProfileResponse.json();
                    console.log("[AuthContext_UPDATE_USER] Re-fetched profile data:", JSON.stringify(finalUserProfileData));
                  }
              } catch (profileError) { console.warn("[AuthContext_UPDATE_USER] Error re-fetching user profile post-update:", profileError); }
          }
        const finalAppUser = constructAppUser(finalUserDataFromApi, finalUserProfileData);
        
        if (finalAppUser && finalAppUser.id && finalAppUser.id !== "undefined" && finalAppUser.id !== "null") {
            setUser(finalAppUser);
            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(finalAppUser));
            console.log("[AuthContext_UPDATE_USER] User state updated with re-fetched data:", JSON.stringify(finalAppUser));
        } else {
            console.error("[AuthContext_UPDATE_USER] Failed to construct valid appUser from re-fetched data or ID is invalid.", finalAppUser);
        }
      } else {
        console.log("[AuthContext_UPDATE_USER] No actual data changed, no re-fetch needed.");
      }

    } catch (error) {
      console.error("[AuthContext_UPDATE_USER] Overall error updating user:", error);
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