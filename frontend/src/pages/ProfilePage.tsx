// frontend/src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, MapPin, Lock, Package, Store, Edit, Save, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import type { User, UserRental, Shop, AppProduct } from '../types';
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer';
import { format } from 'date-fns';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuth(); // Menggunakan updateUser dari context
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const locationState = location.state as { tab?: string };
    return locationState?.tab || 'profile';
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [profileData, setProfileData] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [rentalHistory, setRentalHistory] = useState<UserRental[]>([]);
  const [isLoadingRentals, setIsLoadingRentals] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user) {
      setIsLoadingRentals(true);
      const userRentalsKey = `${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${user.id}`;
      const storedRentalsString = localStorage.getItem(userRentalsKey);
      console.log(`[ProfilePage] Loading rentals from key: ${userRentalsKey}`, storedRentalsString); // Debugging
      try {
        const storedRentals: UserRental[] = storedRentalsString ? JSON.parse(storedRentalsString) : [];
        if (isMounted) setRentalHistory(storedRentals);
      } catch (error) {
        console.error("Failed to parse rental history:", error);
        if (isMounted) setRentalHistory([]);
      }
      if (isMounted) setIsLoadingRentals(false);

      if (location.state?.refreshRentals) {
        const { refreshRentals, ...restState } = location.state;
        if (isMounted) navigate(location.pathname, { state: restState, replace: true });
      }

    } else {
      if (isMounted) {
        setRentalHistory([]);
        setIsLoadingRentals(false);
      }
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, user, location.state?.refreshRentals, navigate]);


  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Membuat objek dengan hanya field yang diisi di form untuk update
    const changesToUpdate: Partial<User> = {};
    if (profileData.name !== user.name) changesToUpdate.name = profileData.name;
    if (profileData.email !== user.email) changesToUpdate.email = profileData.email; // Perlu validasi email jika diubah
    if (profileData.phone !== (user.phone || '')) changesToUpdate.phone = profileData.phone;
    if (profileData.address !== (user.address || '')) changesToUpdate.address = profileData.address;

    if (Object.keys(changesToUpdate).length > 0) {
        updateUser(changesToUpdate); // Memanggil updateUser dari AuthContext
        alert('Profile updated successfully!');
    } else {
        alert('No changes detected.');
    }
    setIsEditingProfile(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      alert("New passwords don't match!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }
    alert('Password changed successfully! (Simulated - Requires backend)');
    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  };
  
  const handleDeleteAccount = () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone and all your data including shops and products will be removed.')) {
      const allUsersString = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
      let allUsers: User[] = allUsersString ? JSON.parse(allUsersString) : [];
      allUsers = allUsers.filter(u => u.id !== user.id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(allUsers));

      if (user.hasShop && user.shopId) {
        const shopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
        let allShops: Shop[] = shopsString ? JSON.parse(shopsString) : [];
        allShops = allShops.filter(s => s.id !== user.shopId);
        localStorage.setItem(LOCAL_STORAGE_KEYS.SHOPS, JSON.stringify(allShops));

        localStorage.removeItem(`${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${user.shopId}`);
        
        const allProdsString = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS);
        if (allProdsString) {
            let allDisplayProds: AppProduct[] = JSON.parse(allProdsString);
            allDisplayProds = allDisplayProds.filter(p => p.shopId !== user.shopId);
            localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allDisplayProds));
        }
      }
      
      localStorage.removeItem(`${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${user.id}`);
      
      logout(); 
      alert('Account deleted successfully!');
      navigate('/');
    }
  };

   const getStatusIconAndColorClass = (status: string | undefined) => {
    if (!status) return { icon: <Package size={16} className="mr-1 text-gray-700" />, colorClass: 'bg-gray-100 text-gray-700' };
    switch (status.toLowerCase()) {
      case 'active':
      case 'disewa':
      case 'confirmed':
        return { icon: <CheckCircle size={16} className="mr-1" />, colorClass: 'bg-green-100 text-green-700' };
      case 'completed':
      case 'selesai':
        return { icon: <CheckCircle size={16} className="mr-1" />, colorClass: 'bg-blue-100 text-blue-700' };
      case 'cancelled':
      case 'dibatalkan':
        return { icon: <XCircle size={16} className="mr-1" />, colorClass: 'bg-red-100 text-red-700' };
      case 'pending':
      case 'menunggu konfirmasi':
        return { icon: <AlertTriangle size={16} className="mr-1" />, colorClass: 'bg-yellow-100 text-yellow-700' };
      default:
        return { icon: <Package size={16} className="mr-1" />, colorClass: 'bg-gray-100 text-gray-700' };
    }
  };

  if (!user) { // Seharusnya sudah ditangani oleh !isAuthenticated, tapi untuk keamanan
    return <div className="text-center py-10">User data not available. Please log in.</div>;
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
                  <h2 className="font-semibold text-lg">{user.name}</h2>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                  
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
                      className="mt-3 text-sm text-primary-600 font-medium hover:text-primary-700"
                    >
                      Create Shop
                    </Link>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center w-full px-4 py-2 rounded-md text-left mb-1 ${
                    activeTab === 'profile' 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors duration-150`}
                >
                  <UserIcon size={18} className="mr-3" />
                  Profile Information
                </button>
                
                <button 
                  onClick={() => setActiveTab('rentals')}
                  className={`flex items-center w-full px-4 py-2 rounded-md text-left mb-1 ${
                    activeTab === 'rentals' 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors duration-150`}
                >
                  <Package size={18} className="mr-3" />
                  Rental History
                </button>
                
                <button 
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center w-full px-4 py-2 rounded-md text-left ${
                    activeTab === 'security' 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors duration-150`}
                >
                  <Lock size={18} className="mr-3" />
                  Security
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b flex items-center justify-between"> {/* p-6 agar padding konsisten */}
                  <h2 className="font-semibold text-xl">Profile Information</h2> {/* text-xl */}
                  {!isEditingProfile && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="btn-secondary btn-sm flex items-center" // btn-sm untuk tombol lebih kecil
                    >
                      <Edit size={14} className="mr-1" /> Edit
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
                      <button type="button" onClick={() => { setIsEditingProfile(false); setProfileData({name: user.name, email: user.email, phone: user.phone || '', address: user.address || ''});}} className="btn-secondary">Cancel</button>
                      <button type="submit" className="btn-primary flex items-center">
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
                          <p className="font-medium text-gray-800">{user.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Email Address</h3>
                          <p className="font-medium text-gray-800">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Phone size={20} className="text-gray-400 mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Phone Number</h3>
                          <p className="font-medium text-gray-500 italic">{user.phone || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start"> {/* items-start untuk alamat panjang */}
                        <MapPin size={20} className="text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="text-xs text-gray-500">Address</h3>
                          <p className="font-medium text-gray-500 italic whitespace-pre-line">{user.address || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'rentals' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b"> {/* p-6 agar konsisten */}
                  <h2 className="font-semibold text-xl">Rental History</h2> {/* text-xl */}
                </div>
                
                {isLoadingRentals ? (
                    <div className="p-6 text-center text-gray-500">Loading rental history...</div>
                ) : rentalHistory.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {rentalHistory.map((rental) => {
                       const statusStyle = getStatusIconAndColorClass(rental.status);
                       return (
                        <div key={rental.id || rental.orderId} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="w-full md:w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                  <img 
                                  src={rental.image || 'https://via.placeholder.com/96x96.png?text=No+Image'} 
                                  alt={rental.product} 
                                  className="w-full h-full object-cover"
                                  />
                              </div>
                              
                              <div className="flex-1">
                                  <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                                    <div className="mb-2 md:mb-0">
                                        <h3 className="font-semibold text-gray-800">{rental.product}</h3>
                                        <p className="text-sm text-gray-500">Shop: <Link to={`/shops/${rental.shopId}`} className="hover:underline text-primary-600">{rental.shopName}</Link></p>
                                        <p className="text-sm text-gray-500">
                                        {format(new Date(rental.startDate), 'MMM dd, yyyy')} to {format(new Date(rental.endDate), 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-2 md:mt-0 text-left md:text-right">
                                        <p className="font-bold text-gray-800">${rental.total.toFixed(2)}</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${statusStyle.colorClass}`}>
                                          {statusStyle.icon}
                                          <span className="ml-1">{rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}</span>
                                        </span>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 flex flex-wrap gap-3">
                                    <Link to={`/profile/orders/${rental.orderId}`} className="btn-secondary btn-sm text-xs">
                                      View Details
                                    </Link>
                                    {rental.status === 'completed' && (
                                      <button className="btn-primary btn-sm text-xs">
                                        Write Review
                                      </button>
                                    )}
                                    {(rental.status === 'active' || rental.status === 'confirmed' || rental.status === 'pending') && (
                                      <button className="btn-secondary btn-sm text-xs text-red-600 border-red-300 hover:bg-red-50 hover:border-red-500">
                                        Cancel Rental
                                      </button>
                                    )}
                                  </div>
                              </div>
                            </div>
                        </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <Package size={40} className="text-gray-400 mx-auto mb-4" />
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
                <div className="p-6 border-b"> {/* p-6 agar konsisten */}
                  <h2 className="font-semibold text-xl">Security</h2> {/* text-xl */}
                </div>
                
                <div className="p-6">
                  <div className="mb-8 pb-6 border-b border-gray-200">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Change Password</h3> {/* text-lg */}
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordInputChange} className="input w-full" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInputChange} className="input w-full" required />
                        <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordInputChange} className="input w-full" required />
                      </div>
                      <button type="submit" className="btn-primary">
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
                      className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 btn flex items-center"
                    >
                      <AlertTriangle size={16} className="mr-2" /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;