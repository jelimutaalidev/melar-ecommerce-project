// frontend/src/pages/ProfilePage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// OrderStatus diimpor, AppProduct dihapus. Shop dipertahankan karena User bisa punya Shop.
import type { User as AuthUserType, UserRental, Shop, OrderItem, OrderStatus } from '../types';
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer';
import { format } from 'date-fns';
import { apiClient } from '../utils/apiClient';

// Icons: UserIcon, Mail, Phone, MapPin, Lock, Store, Edit (bukan Edit3), Save, AlertTriangle, CheckCircle, XCircle, LogOut, ShoppingBag, Building, Loader2
// Package dihapus, Trash2 dihapus (AlertTriangle digunakan untuk delete account)
import {
  User as UserIcon, Mail, Phone, MapPin, Lock, Store, Edit, Save, AlertTriangle, CheckCircle, XCircle,
  LogOut, ShoppingBag, Building, Loader2
} from 'lucide-react';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateObj = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return format(dateObj, 'PP');
};

const placeholderImage = 'https://via.placeholder.com/96x96.png?text=No+Image';

// Menggunakan nama ProfileFormData agar tidak konflik dengan tipe User dari ../types
interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, updateUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMountedRef = useRef(true);

  const [activeTab, setActiveTab] = useState<'profile' | 'rentals' | 'security'>('profile');
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);


  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // Mengganti nama state dari rentalHistory ke userRentalsFromApi untuk kejelasan
  const [userRentalsFromApi, setUserRentalsFromApi] = useState<UserRental[]>([]);
  const [isLoadingRentals, setIsLoadingRentals] = useState(false); // Inisialisasi false
  const [rentalFetchError, setRentalFetchError] = useState<string | null>(null);


  useEffect(() => {
    isMountedRef.current = true;
    if (user) {
      setProfileData({
        name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
    const locationState = location.state as { tab?: string };
    if (locationState?.tab) {
        setActiveTab(locationState.tab as 'profile' | 'rentals' | 'security');
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [user, location.state]);

  const fetchUserRentals = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    if (!isMountedRef.current) return;

    setIsLoadingRentals(true);
    setRentalFetchError(null);
    console.log("[ProfilePage] Fetching user rentals from API...");

    try {
      const fetchedOrdersFromApi: any[] = await apiClient.get('/orders/');
      console.log("[ProfilePage] Raw orders from API for rental history:", JSON.stringify(fetchedOrdersFromApi, null, 2));

      if (!isMountedRef.current) return;

      const mappedRentals: UserRental[] = fetchedOrdersFromApi.map((order: any): UserRental => {
        const firstItemApi = order.items && order.items.length > 0 ? order.items[0] : null;
        const firstProductFromItem = firstItemApi?.product; // product adalah objek di dalam item

        const processedOrderItems: OrderItem[] = (order.items || []).map((itemApi: any): OrderItem => ({
          productId: String(itemApi.product?.id || itemApi.product_id || ''),
          name: itemApi.product_name || itemApi.product?.name || 'Unknown Product',
          quantity: parseInt(String(itemApi.quantity), 10) || 1,
          pricePerDay: parseFloat(String(itemApi.price_per_day_at_rental || itemApi.product?.price || 0)),
          image: itemApi.product_image || placeholderImage, // Gunakan product_image dari item serializer
          startDate: itemApi.start_date,
          endDate: itemApi.end_date,
          item_total: parseFloat(String(itemApi.item_total || 0)),
        }));
        
        let displayProductName = 'N/A';
        if (processedOrderItems.length > 1) {
            displayProductName = `${processedOrderItems[0].name} & ${processedOrderItems.length - 1} more`;
        } else if (processedOrderItems.length === 1) {
            displayProductName = processedOrderItems[0].name;
        }
        
        const shopNameFromItem = firstProductFromItem?.shop_name || firstProductFromItem?.owner?.name || 'Unknown Shop';
        const shopIdFromItem = String(firstProductFromItem?.shop_id || firstProductFromItem?.owner?.id || '');
        const imageFromFirstItem = firstItemApi?.product_image || placeholderImage;


        return {
          id: String(order.id),
          orderId: String(order.id),
          product: displayProductName,
          shopName: shopNameFromItem,
          shopId: shopIdFromItem,
          image: imageFromFirstItem,
          status: order.status || 'unknown',
          startDate: firstItemApi?.start_date || order.start_date || '',
          endDate: firstItemApi?.end_date || order.end_date || '',
          total: parseFloat(String(order.total_price)) || 0,
          items: processedOrderItems,
          customerId: String(user.id),
          displayDate: order.created_at || order.date,
        };
      }).sort((a, b) => {
        // Perbaikan sorting, pastikan displayDate ada sebelum new Date()
        const timeA = a.displayDate ? new Date(a.displayDate).getTime() : 0;
        const timeB = b.displayDate ? new Date(b.displayDate).getTime() : 0;
        
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1; // undefined/null dates go last
        if (!timeB) return -1;
        return timeB - timeA; // Sort descending (newest first)
      });

      if (isMountedRef.current) {
        setUserRentalsFromApi(mappedRentals); // Menggunakan state yang baru
        console.log("[ProfilePage] Mapped user rentals from API:", JSON.stringify(mappedRentals, null, 2));
      }
    } catch (error: any) {
      console.error("Error fetching user rentals:", error);
      if (isMountedRef.current) {
        setRentalFetchError(error.message || "Failed to fetch rental history.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingRentals(false);
      }
    }
  }, [user, isAuthenticated]); // Dependencies yang benar

  useEffect(() => {
    const locationState = location.state as { refreshRentals?: boolean };
    if (activeTab === 'rentals' || locationState?.refreshRentals) {
        if (isAuthenticated && user) {
            fetchUserRentals();
            if (locationState?.refreshRentals) {
                navigate(location.pathname, { state: { ...locationState, refreshRentals: false }, replace: true });
            }
        }
    }
  }, [activeTab, isAuthenticated, user, fetchUserRentals, location.state, navigate, location.pathname]);


  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const updatePayload: Partial<AuthUserType> = {};
      const currentNameParts = (user.name || '').split(' ');
      const currentFirstName = currentNameParts[0] || '';
      const currentLastName = currentNameParts.slice(1).join(' ') || '';

      const formNameParts = profileData.name.trim().split(' ');
      const formFirstName = formNameParts[0] || '';
      const formLastName = formNameParts.slice(1).join(' ') || '';

      if (profileData.email !== user.email) updatePayload.email = profileData.email;
      if (formFirstName !== (user.first_name || currentFirstName)) updatePayload.first_name = formFirstName;
      if (formLastName !== (user.last_name || currentLastName)) updatePayload.last_name = formLastName;

      // Untuk phone dan address, pastikan field ini ada di tipe AuthUserType dan ditangani oleh updateUser di AuthContext
      if (profileData.phone !== (user.phone || '')) updatePayload.phone = profileData.phone;
      if (profileData.address !== (user.address || '')) updatePayload.address = profileData.address;
      
      if (Object.keys(updatePayload).length > 0) {
        await updateUser(updatePayload); // updateUser dari AuthContext
        alert('Profile updated successfully!');
      } else {
        alert('No changes detected.');
      }
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMsg = error.response?.data?.detail || 
                       (error.response?.data && typeof error.response.data === 'object' 
                          ? Object.values(error.response.data).flat().join(' ') 
                          : error.message || 'Failed to update profile. Please try again.');
      alert(errorMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      alert("New passwords don't match!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }
    setIsUpdatingProfile(true);
    try {
        await apiClient.post('/auth/password/change/', {
            new_password1: passwordData.newPassword,
            new_password2: passwordData.confirmNewPassword,
            old_password: passwordData.currentPassword,
        });
        alert('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error: any) {
        console.error("Error changing password:", error);
        const errorMsg = error.response?.data?.detail || 
                         (error.response?.data && typeof error.response.data === 'object' 
                            ? Object.values(error.response.data).flat().join(' ') 
                            : 'Failed to change password. Please try again.');
        alert(errorMsg);
    } finally {
        setIsUpdatingProfile(false);
    }
  };
  
  const _handleLogout = async () => { // Diberi nama _handleLogout untuk menghindari konflik dengan error TS2304
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and all your data including shops and products will be removed.')) {
      localStorage.removeItem('authToken'); 
      localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_IN_USER);
      if (user.id) {
        localStorage.removeItem(`${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${user.id}`);
        // Komentari bagian SHOP_DETAILS_PREFIX karena tidak ada di LOCAL_STORAGE_KEYS Anda
        // const shopKey = Object.keys(localStorage).find(key => key.startsWith(LOCAL_STORAGE_KEYS.SHOP_DETAILS_PREFIX) && localStorage.getItem(key)?.includes(`"owner":"${user.id}"`));
        // if (shopKey) localStorage.removeItem(shopKey);
      }
      
      logout(); // Panggil logout tanpa argumen
      alert('Account related local data cleared. Please contact support for full backend data deletion.');
      navigate('/');
    }
  };

   const getStatusIconAndColorClass = (statusParam: OrderStatus | undefined) => { // Menggunakan OrderStatus
    const status = statusParam || 'unknown'; // Default jika undefined
    switch (status.toLowerCase()) {
      case 'active':
      case 'rented_out':
      case 'confirmed':
        return { icon: <CheckCircle size={16} className="mr-1 text-green-600" />, colorClass: 'bg-green-100 text-green-700' };
      case 'completed':
        return { icon: <CheckCircle size={16} className="mr-1 text-blue-600" />, colorClass: 'bg-blue-100 text-blue-700' };
      case 'cancelled':
        return { icon: <XCircle size={16} className="mr-1 text-red-600" />, colorClass: 'bg-red-100 text-red-700' };
      case 'pending':
      case 'pending_whatsapp':
        return { icon: <AlertTriangle size={16} className="mr-1 text-yellow-600" />, colorClass: 'bg-yellow-100 text-yellow-700' };
      default:
        return { icon: <ShoppingBag size={16} className="mr-1 text-gray-700" />, colorClass: 'bg-gray-100 text-gray-700' };
    }
  };

  if (authLoading && !user) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6 text-center">You need to be logged in to view your profile.</p>
        <Link to="/login" state={{ returnTo: location.pathname }} className="btn-primary">
          Go to Login
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Account</h1>
          <p className="text-primary-100">
            Manage your profile and rental history
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                    <UserIcon size={32} className="text-primary-600" />
                  </div>
                  <h2 className="font-semibold text-lg">{profileData.name || user.username}</h2>
                  <p className="text-gray-500 text-sm">{profileData.email || user.email}</p>
                  
                  {user.hasShop ? (
                    <Link 
                      to="/shop-dashboard" 
                      className="mt-3 text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center"
                    >
                      <Store className="h-4 w-4 mr-1" />
                      Manage Shop
                    </Link>
                  ) : (
                    <Link 
                      to="/create-shop" 
                      className="mt-3 text-sm text-green-600 font-medium hover:text-green-700 flex items-center"
                    >
                      <Building size={16} className="mr-1" /> Create Shop
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                {[
                    { id: 'profile', label: 'Profile Information', icon: UserIcon },
                    { id: 'rentals', label: 'Rental History', icon: ShoppingBag },
                    { id: 'security', label: 'Security', icon: Lock },
                ].map((tabItem) => (
                    <button 
                    key={tabItem.id}
                    onClick={() => setActiveTab(tabItem.id as 'profile' | 'rentals' | 'security')}
                    className={`flex items-center w-full px-4 py-2 rounded-md text-left mb-1 ${
                        activeTab === tabItem.id 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'hover:bg-gray-50 text-gray-700'
                    } transition-colors duration-150`}
                    >
                    <tabItem.icon size={18} className="mr-3" />
                    {tabItem.label}
                    </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-xl">Profile Information</h2>
                  {!isEditingProfile && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="btn-secondary btn-sm flex items-center"
                    >
                      <Edit size={14} className="mr-1" /> Edit {/* Menggunakan Edit */}
                    </button>
                  )}
                </div>
                
                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input type="text" name="name" id="name" value={profileData.name} onChange={handleProfileInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input type="email" name="email" id="email" value={profileData.email} onChange={handleProfileInputChange} className="input w-full" />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="tel" name="phone" id="phone" value={profileData.phone} onChange={handleProfileInputChange} className="input w-full" placeholder="e.g., 08123456789" />
                    </div>
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <textarea name="address" id="address" value={profileData.address} onChange={handleProfileInputChange} rows={3} className="input w-full" placeholder="e.g., Jl. Merdeka No. 10, Kota Bandung" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button type="button" onClick={() => { setIsEditingProfile(false); if(user) setProfileData({name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(), email: user.email || '', phone: user.phone || '', address: user.address || ''});}} className="btn-secondary" disabled={isUpdatingProfile}>Cancel</button>
                      <button type="submit" className="btn-primary flex items-center" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="animate-spin h-4 w-4 mr-2 inline-block"/>}
                        <Save size={16} className="mr-2" /> Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-center">
                        <UserIcon size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Full Name</h3>
                          <p className="font-medium text-gray-800">{profileData.name || user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Email Address</h3>
                          <p className="font-medium text-gray-800">{profileData.email || user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Phone size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Phone Number</h3>
                          <p className="font-medium text-gray-500 italic">{profileData.phone || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin size={20} className="text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Address</h3>
                          <p className="font-medium text-gray-500 italic whitespace-pre-line">{profileData.address || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'rentals' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="font-semibold text-xl">Rental History</h2>
                </div>
                {isLoadingRentals ? (
                    <div className="p-10 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
                        <p className="text-gray-600">Loading your rental history...</p>
                    </div>
                ) : rentalFetchError ? (
                    <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-md m-4">
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            <p className="font-medium">Error loading rentals:</p>
                        </div>
                        <p className="text-sm ml-7">{rentalFetchError}</p>
                        <button onClick={fetchUserRentals} className="btn-secondary btn-sm mt-3 ml-7">Try Again</button>
                    </div>
                ) : userRentalsFromApi.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {userRentalsFromApi.map((rental) => {
                       const statusStyle = getStatusIconAndColorClass(rental.status);
                       return (
                        <div key={rental.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row gap-4">
                              <img 
                                src={rental.image || placeholderImage}
                                alt={rental.product} 
                                className="w-full md:w-24 h-32 md:h-24 object-cover rounded-md bg-gray-100 flex-shrink-0"
                              />
                              <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                                  <div className="mb-2 md:mb-0">
                                      <h3 className="font-semibold text-gray-800">{rental.product}</h3>
                                      <p className="text-sm text-gray-500">Shop: 
                                        {rental.shopId ? (
                                            <Link to={`/shops/${rental.shopId}`} className="hover:underline text-primary-600">{rental.shopName}</Link>
                                        ) : (
                                            rental.shopName || 'N/A'
                                        )}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        Period: {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                                      </p>
                                  </div>
                                  <div className="mt-2 md:mt-0 text-left md:text-right">
                                      <p className="font-bold text-lg text-gray-800">${rental.total.toFixed(2)}</p>
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${statusStyle.colorClass}`}>
                                        {statusStyle.icon}
                                        <span className="ml-1">{rental.status ? rental.status.charAt(0).toUpperCase() + rental.status.slice(1).replace('_', ' ') : 'Unknown'}</span>
                                      </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Order ID: {rental.orderId}</p>
                                {rental.items && rental.items.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-500 mb-1">Items:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {rental.items.map((item, idx) => (
                                                <li key={item.productId + idx} className="text-xs text-gray-600">
                                                    {item.name} (Qty: {item.quantity})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="mt-3 flex flex-wrap gap-3">
                                  <Link to={`/profile/orders/${rental.orderId}`} className="btn-secondary btn-sm text-xs">
                                    View Details
                                  </Link>
                                  {/* Tambahkan tombol lain jika perlu */}
                                </div>
                              </div>
                            </div>
                        </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <ShoppingBag size={40} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">You haven't rented any products yet.</p>
                    <Link to="/products" className="btn-primary mt-6">
                      Browse Products
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="font-semibold text-xl">Security</h2>
                </div>
                <div className="p-6">
                  <div className="mb-8 pb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordInputChange} className="input w-full" required disabled={isUpdatingProfile} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInputChange} className="input w-full" required disabled={isUpdatingProfile}/>
                        <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordInputChange} className="input w-full" required disabled={isUpdatingProfile}/>
                      </div>
                      <button type="submit" className="btn-primary" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="animate-spin h-4 w-4 mr-2 inline-block"/>}
                        Update Password
                      </button>
                    </form>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Permanently delete your account and all of your data. This action cannot be undone.
                    </p>
                    <button 
                      onClick={handleDeleteAccount}
                      className="btn bg-red-600 hover:bg-red-700 text-white flex items-center"
                    >
                      <AlertTriangle size={16} className="mr-2" /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
             <div className="mt-10 pt-6 border-t text-center">
                {/* Menggunakan _handleLogout untuk menghindari konflik nama jika ada */}
                <button onClick={_handleLogout} className="btn-secondary text-sm flex items-center justify-center mx-auto">
                    <LogOut size={16} className="mr-2"/> Log Out
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;