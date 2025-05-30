// frontend/src/pages/ShopDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Package, DollarSign, User as UserIcon, Plus,
  ChevronDown, Search, Edit, Trash, ArrowUpRight,
  Store as IconStore
} from 'lucide-react'; // Menghapus MoreHorizontal karena tidak terpakai
import { useAuth } from '../context/AuthContext';
import type { AppProduct, ShopOrder, Shop } from '../types';
import { LOCAL_STORAGE_KEYS, dummyProductsForShops } from '../data/dummyDataInitializer';

const ShopDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const locationState = location.state as { tab?: string };
    return locationState?.tab || 'dashboard';
  });

  const [shopProducts, setShopProducts] = useState<AppProduct[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]); // State baru untuk pesanan toko
  const [shopDetails, setShopDetails] = useState<Shop | null>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [orderSearchQuery, setOrderSearchQuery] = useState(''); // Untuk pencarian di tab order

  const [shopSettingsForm, setShopSettingsForm] = useState<Partial<Shop>>({
    name: '', description: '', location: '', phoneNumber: '',
    address: '', zip: '', businessType: '', categories: []
  });

  const getShopProductsStorageKey = (): string | null => {
    return user?.shopId ? `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${user.shopId}` : null;
  };

  const getShopOrdersStorageKey = (): string | null => {
    return user?.shopId ? `${LOCAL_STORAGE_KEYS.SHOP_ORDERS_PREFIX}${user.shopId}` : null;
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = () => {
      if (!user || !user.shopId || !isAuthenticated) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // Load Shop Details
      const shopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
      const allShops: Shop[] = shopsString ? JSON.parse(shopsString) : [];
      const currentShop = allShops.find(s => s.id === user.shopId);
      if (isMounted) {
        setShopDetails(currentShop || null);
        if (currentShop) {
          setShopSettingsForm({
            name: currentShop.name,
            description: currentShop.description,
            location: currentShop.location,
            phoneNumber: currentShop.phoneNumber || '',
            address: currentShop.address || '',
            zip: currentShop.zip || '',
            businessType: currentShop.businessType || '',
            categories: currentShop.categories || [],
          });
        }
      }

      // Load Shop Products
      const shopProductsKey = getShopProductsStorageKey();
      if (shopProductsKey) {
        const storedShopProductsString = localStorage.getItem(shopProductsKey);
        try {
          const products = storedShopProductsString ? JSON.parse(storedShopProductsString) : [];
          if (products.length === 0 && dummyProductsForShops.some(dp => dp.shopId === user.shopId)) {
            const initialProductsForThisShop = dummyProductsForShops.filter(p => p.shopId === user.shopId);
            if (isMounted) setShopProducts(initialProductsForThisShop);
            localStorage.setItem(shopProductsKey, JSON.stringify(initialProductsForThisShop));
          } else {
            if (isMounted) setShopProducts(products);
          }
        } catch (e) {
          console.error("Error parsing shop products from localStorage", e);
          if (isMounted) setShopProducts([]);
        }
      } else {
        if (isMounted) setShopProducts([]);
      }

      // Load Shop Orders
      const shopOrdersKey = getShopOrdersStorageKey();
      if (shopOrdersKey) {
        const storedShopOrdersString = localStorage.getItem(shopOrdersKey);
        try {
          const orders = storedShopOrdersString ? JSON.parse(storedShopOrdersString) : [];
          if (isMounted) setShopOrders(orders);
          console.log(`[ShopDashboard] Loaded ${orders.length} orders for shop ${user.shopId} from key ${shopOrdersKey}`);
        } catch (e) {
          console.error("Error parsing shop orders from localStorage", e);
          if (isMounted) setShopOrders([]);
        }
      } else {
        if (isMounted) setShopOrders([]);
      }


      if (isMounted) setIsLoading(false);
    };

    loadData();

    if (location.state?.refreshProducts || location.state?.refreshOrders || location.state?.refreshRentals) {
        const { refreshProducts, refreshOrders, refreshRentals, ...restState } = location.state;
        if(isMounted) navigate(location.pathname, { state: restState, replace: true });
    }

    return () => { isMounted = false; };
  }, [user, isAuthenticated, location.state?.refreshProducts, location.state?.refreshOrders, navigate]);


  const handleItemSelect = (productId: string) => {
    setSelectedItems(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedItems(e.target.checked ? filteredProducts.map(p => p.id) : []);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0 || !user?.shopId) return;
    const shopProductsKey = getShopProductsStorageKey();
    if (!shopProductsKey) return;

    const updatedShopProducts = shopProducts.filter(p => !selectedItems.includes(p.id));
    setShopProducts(updatedShopProducts);
    localStorage.setItem(shopProductsKey, JSON.stringify(updatedShopProducts));

    const allProductsString = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS);
    if (allProductsString) {
      let allProducts: AppProduct[] = JSON.parse(allProductsString);
      allProducts = allProducts.filter(p => !(selectedItems.includes(p.id) && p.shopId === user.shopId));
      localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allProducts));
    }

    setSelectedItems([]);
    setShowDeleteModal(false);
    alert(`${selectedItems.length} product(s) deleted successfully.`);
    // Trigger re-fetch or re-render if needed, for example by updating location state
    navigate(location.pathname, { state: { ...location.state, refreshProducts: true, tab: 'products' }, replace: true });
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
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Urutkan dari terbaru


  const handleShopSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setShopSettingsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategorySettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setShopSettingsForm(prev => {
        const currentCategories = prev.categories || [];
        if (checked) {
            return { ...prev, categories: [...currentCategories, value] };
        } else {
            return { ...prev, categories: currentCategories.filter(cat => cat !== value) };
        }
    });
  };

  const handleShopSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopDetails || !user || !user.shopId) return;

    const shopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
    let allShops: Shop[] = shopsString ? JSON.parse(shopsString) : [];
    const shopIndex = allShops.findIndex(s => s.id === user.shopId);

    if (shopIndex > -1) {
        const originalShopName = allShops[shopIndex].name;
        const updatedShopData: Shop = {
            ...allShops[shopIndex],
            name: shopSettingsForm.name || allShops[shopIndex].name,
            description: shopSettingsForm.description || allShops[shopIndex].description,
            location: shopSettingsForm.location || allShops[shopIndex].location,
            phoneNumber: shopSettingsForm.phoneNumber || allShops[shopIndex].phoneNumber,
            address: shopSettingsForm.address || allShops[shopIndex].address,
            zip: shopSettingsForm.zip || allShops[shopIndex].zip,
            businessType: shopSettingsForm.businessType || allShops[shopIndex].businessType,
            categories: shopSettingsForm.categories && shopSettingsForm.categories.length > 0 ? shopSettingsForm.categories : allShops[shopIndex].categories,
        };
        allShops[shopIndex] = updatedShopData;
        localStorage.setItem(LOCAL_STORAGE_KEYS.SHOPS, JSON.stringify(allShops));
        setShopDetails(updatedShopData);

        if (shopSettingsForm.name && shopSettingsForm.name !== originalShopName) {
            const shopProductsKey = getShopProductsStorageKey();
            if (shopProductsKey) {
                let currentShopProds: AppProduct[] = JSON.parse(localStorage.getItem(shopProductsKey) || '[]');
                currentShopProds = currentShopProds.map(p => ({...p, owner: {...p.owner, name: updatedShopData.name}}));
                localStorage.setItem(shopProductsKey, JSON.stringify(currentShopProds));
                
                let allDisplayProds: AppProduct[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS) || '[]');
                allDisplayProds = allDisplayProds.map(p =>
                    p.shopId === updatedShopData.id ? {...p, owner: {...p.owner, name: updatedShopData.name}} : p
                );
                localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allDisplayProds));
            }
             navigate(location.pathname, { state: { ...location.state, refreshProducts: true, tab: 'settings' }, replace: true });
        }
        alert('Shop settings saved!');
    } else {
        alert('Error: Could not find shop to update.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8"><IconStore className="h-16 w-16 text-primary-600 mx-auto" /><h2 className="mt-6 text-3xl font-bold text-gray-900">Shop Dashboard</h2><p className="mt-2 text-gray-600">Please log in to access your shop dashboard.</p></div>
        <button onClick={() => navigate('/login', { state: { returnTo: '/shop-dashboard' } })} className="btn-primary">Log in to Continue</button>
      </div>
    );
  }

  if (user && !user.hasShop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8"><IconStore className="h-16 w-16 text-primary-600 mx-auto" /><h2 className="mt-6 text-3xl font-bold text-gray-900">No Shop Found</h2><p className="mt-2 text-gray-600">You haven't created a shop yet. Create one to access the dashboard.</p></div>
        <button onClick={() => navigate('/create-shop')} className="btn-primary">Create Your Shop</button>
      </div>
    );
  }

  if (isLoading) { return <div className="text-center py-20">Loading dashboard...</div>; }
  if (user && user.hasShop && !shopDetails && !isLoading) { return <div className="text-center py-20">Loading shop information... Please wait.</div>; }

  const handleAddNewProduct = () => {
    navigate('/shop-dashboard/add-product', { state: { shopId: user?.shopId, shopName: shopDetails?.name } });
  };
  const handleEditProduct = (productId: string) => {
    navigate(`/shop-dashboard/edit-product/${productId}`, { state: { shopId: user?.shopId, shopName: shopDetails?.name } });
  };

  const availableShopCategories = ['Electronics', 'Tools & Equipment', 'Photography', 'Outdoor Gear', 'Vehicles', 'Clothing', 'Sports Equipment', 'Party Supplies', 'Musical Instruments', 'Decorations'];

  const totalRevenue = filteredOrders.reduce((sum, order) => order.status === 'completed' ? sum + order.total : sum, 0);
  const activeRentalsCount = shopProducts.filter(p => p.status === 'rented' || !p.available).length;


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
            <button onClick={handleAddNewProduct} className="mt-4 md:mt-0 inline-flex items-center bg-white text-primary-700 hover:bg-gray-100 font-semibold px-4 py-2 rounded-md transition-colors">
              <Plus size={18} className="mr-1" /> Add New Product
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="flex overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'dashboard' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
            <button onClick={() => {setActiveTab('products'); navigate(location.pathname, { state: { ...location.state, refreshProducts: true, tab: 'products' }, replace: true }); }} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'products' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Products ({shopProducts.length})</button>
            <button onClick={() => {setActiveTab('orders'); navigate(location.pathname, { state: { ...location.state, refreshOrders: true, tab: 'orders'}, replace: true }); }} className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${activeTab === 'orders' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Orders ({filteredOrders.length})</button>
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
                <button onClick={() => {setActiveTab('orders'); navigate(location.pathname, { state: { ...location.state, refreshOrders: true, tab: 'orders' }, replace: true }); }} className="text-primary-600 text-sm font-medium hover:text-primary-700">View All</button>
              </div>
              <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.slice(0, 3).map((order) => ( <tr key={order.id} className="hover:bg-gray-50"><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td><td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'active' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm font-medium">${order.total.toFixed(2)}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          // ... (Konten Tab Products seperti sebelumnya, pastikan button delete memicu refreshProducts)
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="font-semibold">Your Products ({filteredProducts.length})</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative"><input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10 w-full sm:w-auto"/><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                  <div className="relative w-full sm:w-40"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input appearance-none w-full pr-8"><option value="all">All Status</option><option value="available">Available</option><option value="rented">Rented Out</option></select><ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" /></div>
                  <button onClick={handleAddNewProduct} className="btn-primary whitespace-nowrap"><Plus size={16} className="mr-1" /> Add Product</button>
                </div>
              </div>
            </div>
            {selectedItems.length > 0 && (<div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between"><span className="text-sm text-gray-700">{selectedItems.length} item(s) selected</span><button onClick={() => setShowDeleteModal(true)} className="text-red-600 text-sm font-medium hover:text-red-700 flex items-center"><Trash size={16} className="mr-1" /> Delete Selected</button></div>)}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" checked={filteredProducts.length > 0 && selectedItems.length === filteredProducts.length && filteredProducts.length > 0} onChange={handleSelectAll} disabled={filteredProducts.length === 0} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/></th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rentals</th><th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (<tr key={product.id} className="hover:bg-gray-50"><td className="pl-6 pr-3 py-4 whitespace-nowrap"><input type="checkbox" checked={selectedItems.includes(product.id)} onChange={() => handleItemSelect(product.id)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"/></td><td className="px-3 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-100"><img src={product.images?.[0] || 'https://via.placeholder.com/40x40.png?text=N/A'} alt={product.name} className="h-10 w-10 object-cover" /></div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{product.name}</div></div></div></td><td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td><td className="px-3 py-4 whitespace-nowrap text-sm font-medium">${product.price.toFixed(2)}</td><td className="px-3 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(product.status || (product.available ? 'available' : 'rented')) === 'available' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{(product.status || (product.available ? 'available' : 'rented')) === 'available' ? 'Available' : 'Rented Out'}</span></td><td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{product.rentals || 0}</td><td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end space-x-2"><button onClick={() => handleEditProduct(product.id)} className="text-primary-600 hover:text-primary-700 p-1 rounded hover:bg-primary-50" title="Edit Product"><Edit size={16} /></button><button onClick={() => {setSelectedItems([product.id]); setShowDeleteModal(true);}} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete Product"><Trash size={16} /></button></div></td></tr>))}
                </tbody>
              </table>
            </div>
            {filteredProducts.length === 0 && (<div className="text-center py-8"><Package size={32} className="mx-auto text-gray-400 mb-2" /><p className="text-gray-500">No products found matching your criteria in this shop.</p>{searchQuery && <p className="text-xs text-gray-400 mt-1">Try a different search term or adjust filters.</p>}{shopProducts.length === 0 && !searchQuery && statusFilter ==='all' && (<p className="mt-4">You haven't added any products to your shop yet. <button onClick={handleAddNewProduct} className="text-primary-600 hover:underline ml-1 font-medium">Add your first product!</button></p>)}</div>)}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="font-semibold text-lg">Order History ({filteredOrders.length})</h3>
                <div className="relative w-full md:w-64">
                  <input 
                    type="text" 
                    placeholder="Search by Order ID, Customer, Item" 
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="input pl-10 w-full"/>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.items.map(item => item.name).join(', ')}>{order.items.map(item => item.name).join(', ')}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'active' ? 'bg-green-100 text-green-800' : order.status === 'completed' ? 'bg-blue-100 text-blue-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
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
          // ... (Konten Tab Settings seperti sebelumnya)
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b"><h3 className="font-semibold text-lg">Shop Settings</h3></div>
            <form onSubmit={handleShopSettingsSubmit}>
              <div className="p-6 space-y-6">
                {shopDetails ? (
                  <>
                    <div><label htmlFor="shopNameSetting" className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label><input id="shopNameSetting" type="text" name="name" value={shopSettingsForm.name || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopDescriptionSetting" className="block text-sm font-medium text-gray-700 mb-1">Shop Description</label><textarea id="shopDescriptionSetting" name="description" rows={4} value={shopSettingsForm.description || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"></textarea></div>
                    <div><label htmlFor="shopLocationSetting" className="block text-sm font-medium text-gray-700 mb-1">Location (City, State/Country)</label><input id="shopLocationSetting" type="text" name="location" value={shopSettingsForm.location || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopPhoneSetting" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label><input id="shopPhoneSetting" type="tel" name="phoneNumber" value={shopSettingsForm.phoneNumber || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopAddressSetting" className="block text-sm font-medium text-gray-700 mb-1">Full Address</label><input id="shopAddressSetting" type="text" name="address" value={shopSettingsForm.address || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"/></div>
                    <div><label htmlFor="shopZipSetting" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label><input id="shopZipSetting" type="text" name="zip" value={shopSettingsForm.zip || ''} onChange={handleShopSettingsChange} className="input w-full md:w-1/3"/></div>
                    <div><label htmlFor="shopBusinessTypeSetting" className="block text-sm font-medium text-gray-700 mb-1">Business Type</label><select id="shopBusinessTypeSetting" name="businessType" value={shopSettingsForm.businessType || ''} onChange={handleShopSettingsChange} className="input w-full md:w-2/3"><option value="">Select type...</option><option value="individual">Individual</option><option value="registered_business">Registered Business</option><option value="non_profit">Non-Profit</option></select></div>
                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-2">Shop Categories</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableShopCategories.map(category => (
                          <label key={category} className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              value={category}
                              checked={(shopSettingsForm.categories || []).includes(category)}
                              onChange={handleCategorySettingsChange}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                            />
                            {category}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (<p>Loading shop details to edit...</p>)}
              </div>
              <div className="px-6 py-4 bg-gray-50 text-right border-t"><button type="submit" className="btn-primary" disabled={!shopDetails}>Save Changes</button></div>
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
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleDeleteSelected} className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 btn">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboardPage;