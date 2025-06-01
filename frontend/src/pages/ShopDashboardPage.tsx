// frontend/src/pages/ShopDashboardPage.tsx
import React, { useState, useEffect, useCallback } from 'react'; // Tambahkan useCallback
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Package, DollarSign, User as UserIcon, Plus,
  ChevronDown, Search, Edit, Trash, ArrowUpRight,
  Store as IconStore, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppProduct, ShopOrder, Shop, Category as CategoryType } from '../types';
import { apiClient } from '../utils/apiClient';

const ShopDashboardPage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.log("[ShopDashboard] Initial render. User from context:", user, "Auth loading:", authLoading, "Is authenticated:", isAuthenticated);

  const [activeTab, setActiveTab] = useState(() => {
    const locationState = location.state as { tab?: string };
    return locationState?.tab || 'dashboard';
  });

  const [shopProducts, setShopProducts] = useState<AppProduct[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [shopDetails, setShopDetails] = useState<Shop | null>(null);
  const [allApiCategories, setAllApiCategories] = useState<CategoryType[]>([]);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  const [shopSettingsForm, setShopSettingsForm] = useState<{
    name?: string;
    description?: string;
    location?: string;
    phoneNumber?: string;
    address?: string;
    zip_code?: string;
    business_type?: string;
    categoryInput?: string[];
  }>({
    name: '', description: '', location: '', phoneNumber: '',
    address: '', zip_code: '', business_type: '', categoryInput: []
  });

  // Pindahkan deklarasi loadDataFromAPI ke luar useEffect dan bungkus dengan useCallback
  const loadDataFromAPI = useCallback(async (currentShopIdParam?: string) => {
    // Gunakan currentShopIdParam jika ada, jika tidak, coba dari user.shopId
    const shopIdToLoad = currentShopIdParam || user?.shopId;

    console.log("[ShopDashboard_LOAD_DATA_CALLBACK] Called. Shop ID to load:", shopIdToLoad);

    if (!shopIdToLoad || !isAuthenticated) { // Ditambahkan !isAuthenticated untuk keamanan
      setIsLoadingData(false);
      console.warn("[ShopDashboard_LOAD_DATA_CALLBACK] Pre-condition failed: No shopId to load or not authenticated.", { shopIdToLoad, isAuthenticated });
      if (isAuthenticated && user && !shopIdToLoad) {
          setDataLoadError("Your shop ID is not available. Please try re-logging or contact support if this persists after shop creation.");
      }
      return;
    }

    setIsLoadingData(true);
    setDataLoadError(null); // Reset error sebelum load baru
    console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Starting data load for shopId: ${shopIdToLoad}`);

    try {
      console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Fetching shop details for shopId: ${shopIdToLoad}`);
      const shopDetailsData: Shop = await apiClient.get(`/shops/${shopIdToLoad}/`);
      console.log("[ShopDashboard_LOAD_DATA_CALLBACK] Raw shopDetailsData from API:", shopDetailsData);

      if (shopDetailsData && shopDetailsData.id) {
        setShopDetails(shopDetailsData);
        setShopSettingsForm({
          name: shopDetailsData.name,
          description: shopDetailsData.description,
          location: shopDetailsData.location,
          phoneNumber: shopDetailsData.phoneNumber || '',
          address: shopDetailsData.address || '',
          zip_code: shopDetailsData.zip_code || '',
          business_type: shopDetailsData.business_type || '',
          categoryInput: shopDetailsData.categories?.map(cat => cat.name) || [],
        });
        console.log("[ShopDashboard_LOAD_DATA_CALLBACK] Shop details successfully set:", shopDetailsData);
      } else {
        setShopDetails(null);
        console.warn(`[ShopDashboard_LOAD_DATA_CALLBACK] Shop details not found or invalid from API for shopId: ${shopIdToLoad}. Response:`, shopDetailsData);
        setDataLoadError("Shop details could not be loaded from the server.");
      }

      console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Fetching shop products for shopId: ${shopIdToLoad}`);
      const productsData: AppProduct[] = await apiClient.get(`/shops/${shopIdToLoad}/products/`);
      setShopProducts(productsData || []);
      console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Loaded ${productsData?.length || 0} products.`, productsData);

      console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Fetching shop orders for shopId: ${shopIdToLoad}`);
      const ordersData: ShopOrder[] = await apiClient.get(`/orders/?shop_id=${shopIdToLoad}`);
      setShopOrders(ordersData || []);
      console.log(`[ShopDashboard_LOAD_DATA_CALLBACK] Loaded ${ordersData?.length || 0} orders.`, ordersData);
      
      console.log("[ShopDashboard_LOAD_DATA_CALLBACK] Fetching all categories for settings form.");
      const categoriesData: CategoryType[] = await apiClient.get('/categories/');
      setAllApiCategories(categoriesData || []);
      console.log("[ShopDashboard_LOAD_DATA_CALLBACK] All categories loaded for settings:", categoriesData);

    } catch (error: any) {
      console.error(`[ShopDashboard_LOAD_DATA_CALLBACK] Error loading data for shopId ${shopIdToLoad}:`, error);
      setDataLoadError(`Error fetching dashboard data: ${error.message || 'Unknown error'}`);
      setShopDetails(null);
      setShopProducts([]);
      setShopOrders([]);
      setAllApiCategories([]);
    } finally {
      setIsLoadingData(false);
      console.log("[ShopDashboard_LOAD_DATA_CALLBACK] Data loading process finished. isLoadingData set to false.");
    }
  // Dependensi untuk useCallback: user (untuk user.shopId), isAuthenticated.
  // Jika apiClient atau fungsi lain yang dipanggil dari luar juga bisa berubah, tambahkan juga.
  }, [user, isAuthenticated]); // Jangan sertakan navigate atau location di sini jika tidak diperlukan langsung oleh logika loadDataFromAPI


  useEffect(() => {
    let isMounted = true; // isMounted hanya relevan untuk cleanup async operations dalam effect ini, bukan untuk loadDataFromAPI
    
    console.log(
      "[ShopDashboard_EFFECT] Main effect triggered. User:", user, 
      "Shop ID:", user?.shopId, 
      "IsAuthenticated:", isAuthenticated, 
      "AuthLoading:", authLoading,
      "Location Key:", location.key,
      "Location State:", location.state
    );

    if (!authLoading) {
      if (isAuthenticated && user?.shopId) {
        console.log(`[ShopDashboard_EFFECT] Conditions met for initial load. User authenticated with shopId: ${user.shopId}. Calling loadDataFromAPI.`);
        loadDataFromAPI(user.shopId); 
      } else {
        console.log("[ShopDashboard_EFFECT] Conditions NOT met for initial API call after auth. isAuthenticated:", isAuthenticated, "user:", !!user, "user.shopId:", user?.shopId);
        if (isMounted) setIsLoadingData(false);
        if (isAuthenticated && user && !user.shopId) {
           console.log("[ShopDashboard_EFFECT] User is authenticated but doesn't have a shopId yet.");
        }
      }
    } else {
      console.log("[ShopDashboard_EFFECT] Auth is still loading, initial data load deferred.");
    }

    // Penanganan refresh flag
    const currentRefreshFlags = {
        refreshProducts: location.state?.refreshProducts,
        refreshOrders: location.state?.refreshOrders,
        refreshRentals: location.state?.refreshRentals, // atau refreshShopData jika itu yang dipakai
    };

    if (Object.values(currentRefreshFlags).some(flag => flag)) {
        const { refreshProducts, refreshOrders, refreshRentals, tab, ...restState } = location.state || {};
        if (isMounted && (refreshProducts || refreshOrders || refreshRentals)) { // Cek isMounted di sini karena ada async operation (loadDataFromAPI)
            console.log("[ShopDashboard_EFFECT] Refresh flag detected, preparing to re-load data from API.", currentRefreshFlags);
            if (!authLoading && isAuthenticated && user?.shopId) { // Hanya reload jika user dan shopId valid
                console.log("[ShopDashboard_EFFECT] Calling loadDataFromAPI due to refresh flag with shopId:", user.shopId);
                loadDataFromAPI(user.shopId);
            } else {
                console.log("[ShopDashboard_EFFECT] Refresh flag, but conditions for API call not met during refresh check.");
            }
        }
        // Membersihkan state navigasi hanya jika ada flag refresh
        // Lakukan ini di luar pengecekan isMounted untuk loadDataFromAPI agar state selalu dibersihkan
        navigate(location.pathname, { state: restState, replace: true });
    }

    return () => {
      isMounted = false; // Ini akan menghentikan set state di dalam async ops jika komponen unmount sebelum selesai
      console.log("[ShopDashboard_EFFECT] Cleanup. Component unmounted or dependencies changed.");
    };
  }, [user, isAuthenticated, authLoading, location.key, location.state, navigate, loadDataFromAPI]); // Tambahkan loadDataFromAPI sebagai dependensi


  // ... (Sisa fungsi handler seperti handleItemSelect, handleDeleteSelected, dll. TETAP SAMA) ...
  const handleItemSelect = (productId: string) => {
    setSelectedItems(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedItems(e.target.checked ? filteredProducts.map(p => p.id) : []);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0 || !user?.shopId) return;
    setIsSubmitting(true);
    console.log("[ShopDashboard] Attempting to delete products:", selectedItems);
    try {
      for (const productIdToDelete of selectedItems) {
        await apiClient.delete(`/products/${productIdToDelete}/`);
        console.log(`[ShopDashboard] Product ${productIdToDelete} deleted via API.`);
      }
      // Re-fetch products after deletion
      if (user?.shopId) {
        console.log("[ShopDashboard] Re-fetching products after deletion.");
        const productsData: AppProduct[] = await apiClient.get(`/shops/${user.shopId}/products/`);
        setShopProducts(productsData || []);
      }
      setSelectedItems([]);
      setShowDeleteModal(false);
      alert(`${selectedItems.length} product(s) deleted successfully.`);
    } catch (error: any) {
      console.error("[ShopDashboard] Error deleting products via API:", error);
      let errorMessage = "Failed to delete products.";
       if (error.response && error.response.data) {
         errorMessage += ` Server says: ${JSON.stringify(error.response.data)}`;
       }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = shopProducts.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = product.name.toLowerCase().includes(searchLower);
    const categoryMatch = product.category && product.category.toLowerCase().includes(searchLower);
    const matchesSearch = nameMatch || categoryMatch;
    const productStatus = product.status || (product.available ? 'available' : 'rented');
    const matchesStatus = statusFilter === 'all' || productStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = shopOrders.filter(order => {
    const searchLower = orderSearchQuery.toLowerCase();
    return order.id.toLowerCase().includes(searchLower) ||
           order.customerName.toLowerCase().includes(searchLower) ||
           order.items.some(item => item.name.toLowerCase().includes(searchLower));
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleShopSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShopSettingsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategorySettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setShopSettingsForm(prev => {
        const currentCategories = prev.categoryInput || [];
        if (checked) {
            return { ...prev, categoryInput: [...currentCategories, value] };
        } else {
            return { ...prev, categoryInput: currentCategories.filter(catName => catName !== value) };
        }
    });
  };

  const handleShopSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopDetails || !user || !user.shopId || allApiCategories.length === 0) {
        alert("Cannot update shop: critical information missing or API categories not loaded.");
        return;
    }
    setIsSubmitting(true);
    console.log("[ShopDashboard] Submitting shop settings. Form data:", shopSettingsForm);

    const categoryIdsToSubmit = shopSettingsForm.categoryInput
      ?.map(catName => {
          const foundCat = allApiCategories.find(apiCat => apiCat.name === catName);
          if (!foundCat) console.warn(`[ShopDashboard] Category name "${catName}" from form not found in API categories.`);
          return foundCat ? Number(foundCat.id) : null;
      })
      .filter(id => id !== null) as number[];
    console.log("[ShopDashboard] Category IDs to submit:", categoryIdsToSubmit);

    const payload: {
        name?: string; description?: string; location?: string;
        phone_number?: string; address?: string; zip_code?: string;
        business_type?: string; category_ids?: number[];
    } = {
      name: shopSettingsForm.name,
      description: shopSettingsForm.description,
      location: shopSettingsForm.location,
      phone_number: shopSettingsForm.phoneNumber,
      address: shopSettingsForm.address,
      zip_code: shopSettingsForm.zip_code,
      business_type: shopSettingsForm.business_type,
      category_ids: categoryIdsToSubmit,
    };
    
    Object.keys(payload).forEach(key => {
      const K = key as keyof typeof payload;
      if (payload[K] === undefined || payload[K] === '') {
        if (K !== 'category_ids') {
             delete payload[K];
        } else if (Array.isArray(payload[K]) && (payload[K] as any[]).length === 0) {
            // Tetap kirim array kosong jika itu yang diinginkan backend untuk reset kategori
        }
      }
    });
    console.log("[ShopDashboard] Payload for API PATCH:", payload);

    try {
      const updatedShopFromApi: Shop = await apiClient.patch(`/shops/${user.shopId}/`, payload);
      console.log("[ShopDashboard] Shop settings updated via API, response:", updatedShopFromApi);

      setShopDetails(updatedShopFromApi); // Update detail toko dengan data terbaru
      setShopSettingsForm({ // Update juga form dengan data terbaru
          name: updatedShopFromApi.name,
          description: updatedShopFromApi.description,
          location: updatedShopFromApi.location,
          phoneNumber: updatedShopFromApi.phoneNumber || '',
          address: updatedShopFromApi.address || '',
          zip_code: updatedShopFromApi.zip_code || '',
          business_type: updatedShopFromApi.business_type || '',
          categoryInput: updatedShopFromApi.categories?.map(cat => cat.name) || [],
      });
      alert('Shop settings saved!');
    } catch (error: any) {
      console.error("[ShopDashboard] Error updating shop settings via API:", error);
      let errorMessage = "Failed to save shop settings.";
      if (error.response && error.response.data) {
        errorMessage += ` Details: ${JSON.stringify(error.response.data, null, 2)}`;
      } else if (error.message) {
        errorMessage += ` Message: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Bagian Render ---
  if (authLoading) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" /> Authenticating...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8"><IconStore className="h-16 w-16 text-primary-600 mx-auto" /><h2 className="mt-6 text-3xl font-bold text-gray-900">Shop Dashboard</h2><p className="mt-2 text-gray-600">Please log in to access your shop dashboard.</p></div>
        <button onClick={() => navigate('/login', { state: { returnTo: '/shop-dashboard' } })} className="btn-primary">Log in to Continue</button>
      </div>
    );
  }

  if (user && !user.hasShop && !user.shopId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8"><IconStore className="h-16 w-16 text-primary-600 mx-auto" /><h2 className="mt-6 text-3xl font-bold text-gray-900">No Shop Found</h2><p className="mt-2 text-gray-600">You haven't created a shop yet. Create one to access the dashboard.</p></div>
        <button onClick={() => navigate('/create-shop')} className="btn-primary">Create Your Shop</button>
      </div>
    );
  }
  
  if (isLoadingData) {
    return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" /> Loading dashboard data...</div>;
  }
  
  if (user && user.hasShop && user.shopId && !shopDetails && dataLoadError && !isLoadingData) {
    return (
        <div className="text-center py-20">
            <p className="text-red-600 font-semibold">Failed to load shop information.</p>
            <p className="text-gray-600 mt-2">{dataLoadError}</p>
            <p className="text-gray-500 mt-1">Please try again or contact support.</p>
            <button 
              onClick={() => { 
                console.log("[ShopDashboard_RENDER_ERROR_BUTTON] Retry Load button clicked. Attempting to reload data..."); 
                if(user?.shopId) loadDataFromAPI(user.shopId); 
              }} 
              className="btn-primary mt-4 mr-2"
            >
              Retry Load
            </button>
            <button onClick={() => window.location.reload()} className="btn-secondary mt-4">Full Page Refresh</button>
        </div>
    );
  }
  
  if (user && user.hasShop && user.shopId && !shopDetails && !isLoadingData && !dataLoadError) {
    console.error("[ShopDashboard_RENDER_ERROR_STUCK] User has shopId, loading finished, no specific dataLoadError, BUT shopDetails is STILL NULL. This is the stuck loading state. User:", user);
    return (
        <div className="text-center py-20">
            <p className="text-red-600 font-semibold">Failed to load shop information.</p>
            <p className="text-gray-600 mt-2">The application could not retrieve your shop details, even though you seem to have a shop.</p>
            <p className="text-gray-500 mt-1">This might be a temporary issue or an issue with your shop data. Please try again. If the problem persists, check the console for errors or contact support.</p>
            <button 
              onClick={() => { 
                console.log("[ShopDashboard_RENDER_STUCK_BUTTON] Retry Load button clicked. Attempting to reload data..."); 
                if(user?.shopId) loadDataFromAPI(user.shopId); 
              }} 
              className="btn-primary mt-4 mr-2"
            >
              Retry Load
            </button>
            <button onClick={() => window.location.reload()} className="btn-secondary mt-4">Full Page Refresh</button>
        </div>
    );
  }

  const handleAddNewProduct = () => {
    navigate('/shop-dashboard/add-product', { state: { shopId: user?.shopId, shopName: shopDetails?.name } });
  };
  const handleEditProduct = (productId: string) => {
    navigate(`/shop-dashboard/edit-product/${productId}`, { state: { shopId: user?.shopId, shopName: shopDetails?.name } });
  };

  const totalRevenue = filteredOrders.reduce((sum, order) => order.status === 'completed' ? sum + order.total : sum, 0);
  const activeRentalsCount = shopProducts.filter(p => p.status === 'rented' || (p.hasOwnProperty('available') && !p.available)).length;

  // ... (Sisa JSX sama seperti sebelumnya)
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-8">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {shopDetails?.name || "Your Shop"} Dashboard
              </h1>
              <p className="text-primary-100">Manage your rental shop and products</p>
            </div>
            <button 
              onClick={handleAddNewProduct} 
              className="mt-4 md:mt-0 inline-flex items-center bg-white text-primary-700 hover:bg-gray-100 font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              disabled={isSubmitting || isLoadingData || !shopDetails}
            >
              <Plus size={18} className="mr-1" /> Add New Product
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="flex overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'dashboard' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('products')} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'products' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Products ({shopProducts.length})</button>
            <button onClick={() => setActiveTab('orders')} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'orders' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Orders ({filteredOrders.length})</button>
            <button onClick={() => setActiveTab('settings')} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'settings' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Shop Settings</button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
                <div className="p-3 rounded-md bg-primary-100 text-primary-600 mr-4"><Package size={24} /></div>
                <div><p className="text-sm font-medium text-gray-500">Total Products</p><h3 className="text-2xl font-semibold">{shopProducts.length}</h3></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
                <div className="p-3 rounded-md bg-blue-100 text-blue-600 mr-4"><DollarSign size={24} /></div>
                <div><p className="text-sm font-medium text-gray-500">Revenue (Completed)</p><h3 className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</h3></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
                <div className="p-3 rounded-md bg-amber-100 text-amber-600 mr-4"><ArrowUpRight size={24} /></div>
                <div><p className="text-sm font-medium text-gray-500">Active Rentals</p><h3 className="text-2xl font-semibold">{activeRentalsCount}</h3></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
                <div className="p-3 rounded-md bg-purple-100 text-purple-600 mr-4"><UserIcon size={24} /></div>
                <div><p className="text-sm font-medium text-gray-500">Total Orders</p><h3 className="text-2xl font-semibold">{shopOrders.length}</h3></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-6">Revenue Overview</h3>
                <div className="h-64 flex items-center justify-center text-gray-400"><span>Chart Placeholder (LineChart)</span></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-6">Product Categories</h3>
                <div className="h-64 flex items-center justify-center text-gray-400"><span>Chart Placeholder (PieChart)</span></div>
              </div>
            </div>
             <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-semibold">Recent Orders</h3>
                <button 
                  onClick={() => setActiveTab('orders')} 
                  className="text-primary-600 text-sm font-medium hover:text-primary-700"
                  disabled={isSubmitting || isLoadingData}
                >View All</button>
              </div>
              <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.slice(0, 3).map((order) => ( <tr key={order.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.date).toLocaleDateString()}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'active' || order.status === 'confirmed' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.total.toFixed(2)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="font-semibold">Your Products ({filteredProducts.length})</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative"><input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full sm:w-auto"/><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                  <div className="relative w-full sm:w-40"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input appearance-none w-full pr-8"><option value="all">All Status</option><option value="available">Available</option><option value="rented">Rented Out</option></select><ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" /></div>
                  <button 
                    onClick={handleAddNewProduct} 
                    className="btn-primary whitespace-nowrap"
                    disabled={isSubmitting || isLoadingData || !shopDetails}
                  ><Plus size={16} className="mr-1" /> Add Product</button>
                </div>
              </div>
            </div>
            {selectedItems.length > 0 && (<div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between"><span className="text-sm text-gray-700">{selectedItems.length} item(s) selected</span><button onClick={() => setShowDeleteModal(true)} className="text-red-600 text-sm font-medium hover:text-red-700 flex items-center" disabled={isSubmitting || isLoadingData}><Trash size={16} className="mr-1" /> Delete Selected</button></div>)}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" checked={filteredProducts.length > 0 && selectedItems.length === filteredProducts.length} onChange={handleSelectAll} disabled={filteredProducts.length === 0 || isSubmitting || isLoadingData} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/></th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rentals</th><th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (<tr key={product.id} className="hover:bg-gray-50"><td className="pl-6 pr-3 py-4 whitespace-nowrap"><input type="checkbox" checked={selectedItems.includes(product.id)} onChange={() => handleItemSelect(product.id)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/></td><td className="px-3 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-100"><img src={product.images?.[0] || 'https://via.placeholder.com/40x40.png?text=N/A'} alt={product.name} className="h-10 w-10 object-cover" /></div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{product.name}</div></div></div></td><td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td><td className="px-3 py-4 whitespace-nowrap text-sm font-medium">${product.price.toFixed(2)}</td><td className="px-3 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(product.status || (product.available ? 'available' : 'rented')) === 'available' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{(product.status || (product.available ? 'available' : 'rented')) === 'available' ? 'Available' : 'Rented Out'}</span></td><td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{product.total_individual_rentals || 0}</td><td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end space-x-2"><button onClick={() => handleEditProduct(product.id)} className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50" title="Edit Product" disabled={isSubmitting || isLoadingData}><Edit size={16} /></button><button onClick={() => {setSelectedItems([product.id]); setShowDeleteModal(true);}} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete Product" disabled={isSubmitting || isLoadingData}><Trash size={16} /></button></div></td></tr>))}
                </tbody>
              </table>
            </div>
            {filteredProducts.length === 0 && (<div className="text-center py-8"><Package size={32} className="mx-auto text-gray-400 mb-2" /><p className="text-gray-500">No products found matching your criteria in this shop.</p>{searchQuery && <p className="text-xs text-gray-400 mt-1">Try a different search term or adjust filters.</p>}{shopProducts.length === 0 && !searchQuery && statusFilter ==='all' && (<p className="mt-4">You haven't added any products to your shop yet. <button onClick={handleAddNewProduct} className="text-primary-600 hover:underline ml-1 font-medium" disabled={isSubmitting || isLoadingData || !shopDetails}>Add your first product!</button></p>)}</div>)}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="font-semibold text-lg">Order History ({filteredOrders.length})</h3>
                <div className="relative w-full md:w-64">
                  <input type="text" placeholder="Search by Order ID, Customer, Item" value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} className="input pl-10 w-full"/><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12"><Package size={48} className="mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3><p className="text-gray-600">{orderSearchQuery ? "No orders match your search." : "This shop has no orders yet."}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (<tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.items.map(item => item.name).join(', ')}>{order.items.map(item => item.name).join(', ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'active' || order.status === 'confirmed' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' :  order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.total.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <Link to={`/shop-dashboard/orders/${order.id}`} className="text-primary-600 hover:text-primary-700">View Details</Link>
                        </td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b"><h3 className="font-semibold text-lg">Shop Settings</h3></div>
            <form onSubmit={handleShopSettingsSubmit}>
              <div className="p-6 space-y-6">
                {shopDetails && !isLoadingData && !authLoading ? (
                  <>
                    <div><label htmlFor="shopNameSetting" className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label><input id="shopNameSetting" type="text" name="name" value={shopSettingsForm.name || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopDescriptionSetting" className="block text-sm font-medium text-gray-700 mb-1">Shop Description</label><textarea id="shopDescriptionSetting" name="description" rows={4} value={shopSettingsForm.description || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"></textarea></div>
                    <div><label htmlFor="shopLocationSetting" className="block text-sm font-medium text-gray-700 mb-1">Location (City, State/Country)</label><input id="shopLocationSetting" type="text" name="location" value={shopSettingsForm.location || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopPhoneSetting" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input id="shopPhoneSetting" type="tel" name="phoneNumber" value={shopSettingsForm.phoneNumber || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopAddressSetting" className="block text-sm font-medium text-gray-700 mb-1">Full Address</label><input id="shopAddressSetting" type="text" name="address" value={shopSettingsForm.address || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopZipSetting" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label><input id="shopZipSetting" type="text" name="zip_code" value={shopSettingsForm.zip_code || ''} onChange={handleShopSettingsChange} className="input w-full md:w-1/3"/></div>
                    <div><label htmlFor="shopBusinessTypeSetting" className="block text-sm font-medium text-gray-700 mb-1">Business Type</label><select id="shopBusinessTypeSetting" name="business_type" value={shopSettingsForm.business_type || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"><option value="">Select type...</option><option value="individual">Individual</option><option value="registered_business">Registered Business</option><option value="non_profit">Non-Profit</option></select></div>
                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-2">Shop Categories</p>
                      {allApiCategories.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {allApiCategories.map(category => (
                            <label key={category.id} className="flex items-center text-sm">
                              <input
                                type="checkbox"
                                value={category.name}
                                checked={(shopSettingsForm.categoryInput || []).includes(category.name)}
                                onChange={handleCategorySettingsChange}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                              />
                              {category.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{(isLoadingData || authLoading) ? "Loading categories..." : "No categories available. Please ensure categories are set up in the system."}</p>
                      )}
                    </div>
                  </>
                ) : (<div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary-500 mx-auto"/> Loading shop settings...</div>)}
              </div>
              <div className="px-6 py-4 bg-gray-50 text-right border-t">
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isSubmitting || isLoadingData || !shopDetails}
                >
                    {isSubmitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2 inline-block"/>Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete {selectedItems.length} selected {selectedItems.length === 1 ? 'product' : 'products'}? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleDeleteSelected} className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2 inline-block"/>Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboardPage;