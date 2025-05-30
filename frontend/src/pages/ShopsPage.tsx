// src/pages/ShopsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, MapPin, Star } from 'lucide-react';
// Pastikan path ke types.ts dan dummyDataInitializer.ts sudah benar
import type { Shop, AppProduct } from '../types'; 
import { LOCAL_STORAGE_KEYS, dummyShops as initialDummyShopsArray } from '../data/dummyDataInitializer'; 

const ShopsPage: React.FC = () => {
  // State untuk menyimpan toko yang akan ditampilkan setelah dicek memiliki produk
  const [relevantShops, setRelevantShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk memuat, memfilter, dan mengatur toko
  const loadAndSetDisplayShops = () => {
    setIsLoading(true);
    
    // 1. Ambil daftar semua toko yang ada di localStorage (yang seharusnya diisi oleh initializer)
    const allPersistedShopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
    const allPersistedShops: Shop[] = allPersistedShopsString ? JSON.parse(allPersistedShopsString) : [];

    // 2. Filter hanya untuk 5 toko dummy awal kita dan pastikan mereka ada di localStorage
    //    DAN memiliki produk yang tersimpan.
    const shopsToDisplay = initialDummyShopsArray // Ini adalah array 5 toko dari dummyDataInitializer.ts
      .map(dummyShop => {
        // Pastikan toko dummy ini ada di localStorage (seharusnya selalu ada jika initializer berjalan)
        const persistedShopData = allPersistedShops.find(ps => ps.id === dummyShop.id);
        return persistedShopData || null; // Kembalikan data dari localStorage, atau null jika tidak ditemukan
      })
      .filter((shop): shop is Shop => shop !== null) // Hilangkan yang null (seharusnya tidak terjadi)
      .filter(shop => {
        // Cek apakah toko ini memiliki produk di localStorage
        const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shop.id}`;
        const productsString = localStorage.getItem(shopProductsKey);
        const products: AppProduct[] = productsString ? JSON.parse(productsString) : [];
        return products.length > 0; // Hanya sertakan jika ada produk
      })
      .slice(0, 5); // Pastikan kita hanya mengambil maksimal 5 toko

    setRelevantShops(shopsToDisplay);
    setIsLoading(false);
  };

  // Memuat data toko saat komponen pertama kali dimuat
  useEffect(() => {
    loadAndSetDisplayShops();
  }, []);

  // Opsional: Listener untuk memuat ulang saat window mendapat fokus (untuk menangkap perubahan jika ada)
  useEffect(() => {
    const handleFocus = () => {
      loadAndSetDisplayShops();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Dapatkan kategori unik dari toko yang akan ditampilkan
  const categories = Array.from(
    new Set(relevantShops.flatMap(shop => shop.categories))
  ).sort();

  // Filter toko lebih lanjut berdasarkan input pencarian dan kategori yang dipilih pengguna
  const filteredShopsToDisplay = relevantShops.filter(shop => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      shop.name.toLowerCase().includes(searchLower) ||
      shop.description.toLowerCase().includes(searchLower) ||
      shop.location.toLowerCase().includes(searchLower);
    
    const matchesCategory = !selectedCategory || shop.categories.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <div className="text-center py-10">Loading shops...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Shops</h1>
          <p className="text-primary-100">
            Discover trusted rental shops in your area
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10 w-full"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={selectedCategory === ''}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">All Categories</span>
                  </label>
                  {categories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        value={category}
                        checked={selectedCategory === category}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shops Grid */}
          <div className="flex-1">
            {filteredShopsToDisplay.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredShopsToDisplay.map(shop => (
                  <Link 
                    key={shop.id}
                    to={`/shops/${shop.id}`}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={shop.image || 'https://via.placeholder.com/300x200.png?text=No+Image'} 
                        alt={shop.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold">{shop.name}</h2>
                        <div className="flex items-center text-amber-500">
                          <Star size={16} className="fill-current" />
                          <span className="ml-1 text-sm">{shop.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {shop.description}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <MapPin size={16} className="mr-1" />
                        {shop.location}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {shop.categories.map(category => (
                          <span 
                            key={category}
                            className="bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-xs"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {shop.totalRentals} successful rentals
                        </span>
                        <span className="text-primary-600 font-medium">
                          View Shop
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Store size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters, or ensure dummy shops have products.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopsPage;