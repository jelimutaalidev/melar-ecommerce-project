// src/pages/ShopsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Store, MapPin, Star, Loader2 } from 'lucide-react'; // Loader2 ditambahkan
import type { Shop } from '../types'; // AppProduct mungkin tidak lagi dibutuhkan langsung di sini
import { apiClient } from '../utils/apiClient'; // IMPORT apiClient
// Hapus: import { LOCAL_STORAGE_KEYS, dummyShops as initialDummyShopsArray } from '../data/dummyDataInitializer';

const ShopsPage: React.FC = () => {
  const [allFetchedShops, setAllFetchedShops] = useState<Shop[]>([]); // Ganti nama state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // State untuk error

  // Fungsi untuk memuat, memfilter, dan mengatur toko dari API
  const fetchShopsFromAPI = async () => {
    setIsLoading(true);
    setError(null);
    console.log("[ShopsPage DEBUG] Attempting to fetch shops from API...");
    try {
      // API call ke endpoint /shops/
      const fetchedShopsFromApi: Shop[] = await apiClient.get('/shops/');
      console.log("[ShopsPage DEBUG] Shops fetched successfully from API:", fetchedShopsFromApi);

      const validShops = Array.isArray(fetchedShopsFromApi) ? fetchedShopsFromApi : [];

      // Proses data: pastikan tipe data angka, dan filter toko yang punya produk
      const processedAndFilteredShops = validShops.map(shop => ({
        ...shop,
        id: String(shop.id), // Pastikan ID adalah string jika types.ts mengharapkannya
        rating: parseFloat(shop.rating as any) || 0,
        totalRentals: parseInt(shop.totalRentals as any, 10) || 0,
        // product_count sudah dikirim sebagai angka oleh serializer (IntegerField)
        // categories adalah array objek Category, sudah sesuai dengan types.ts
        // gambar (shop.image) seharusnya sudah URL absolut dari serializer jika ada
      })).filter(shop => shop.product_count > 0); // Filter hanya toko yang memiliki produk

      setAllFetchedShops(processedAndFilteredShops);
      console.log("[ShopsPage DEBUG] Processed and product-filtered shops set to state:", processedAndFilteredShops);

    } catch (err: any) {
      console.error("[ShopsPage DEBUG] Error fetching shops from API:", err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load shops. Please try again.';
      setError(errorMessage);
      setAllFetchedShops([]); // Kosongkan data jika error
    } finally {
      setIsLoading(false);
      console.log("[ShopsPage DEBUG] Shop fetching finished. isLoading set to false.");
    }
  };

  useEffect(() => {
    fetchShopsFromAPI();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      console.log("[ShopsPage DEBUG] Window focused, re-fetching shops.");
      fetchShopsFromAPI();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Tidak ada dependensi agar hanya setup sekali

  // Dapatkan kategori unik dari toko yang akan ditampilkan
  // `shop.categories` adalah array objek Category, jadi kita ambil `cat.name`
  const uniqueCategories = Array.from(
    new Set(allFetchedShops.flatMap(shop => shop.categories.map(cat => cat.name)))
  ).sort();

  // Filter toko lebih lanjut berdasarkan input pencarian dan kategori yang dipilih pengguna
  const filteredShopsToDisplay = allFetchedShops.filter(shop => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      shop.name.toLowerCase().includes(searchLower) ||
      shop.description.toLowerCase().includes(searchLower) ||
      shop.location.toLowerCase().includes(searchLower);

    // Sesuaikan filter kategori: cek apakah salah satu kategori toko cocok
    const matchesCategory = !selectedCategory || shop.categories.some(cat => cat.name === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
        <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading shops...</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen pb-16 fade-in">
        <div className="bg-primary-700 text-white py-10">
            <div className="container-custom">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse Shops</h1>
                <p className="text-primary-100">Discover trusted rental shops in your area</p>
            </div>
        </div>
        <div className="container-custom py-10 text-center">
          <Store size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-600">Error Loading Shops</h2>
          <p className="text-gray-600 mt-2 mb-4">{error}</p>
          <button
            onClick={() => fetchShopsFromAPI()} // Tombol untuk mencoba lagi
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
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
                  {/* Menggunakan uniqueCategories yang sudah diproses */}
                  {uniqueCategories.map(categoryName => (
                    <label key={categoryName} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        value={categoryName} // Value adalah nama kategori
                        checked={selectedCategory === categoryName}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{categoryName}</span>
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
                        {/* Menampilkan nama kategori dari objek kategori */}
                        {shop.categories.map(categoryObj => (
                          <span
                            key={categoryObj.id} // Gunakan ID kategori jika unik, atau namanya
                            className="bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-xs"
                          >
                            {categoryObj.name}
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
              <div className="text-center py-12 bg-white rounded-lg shadow-sm"> {/* Latar belakang ditambahkan */}
                <Store size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
                <p className="text-gray-600">
                  { (searchQuery || selectedCategory)
                    ? "Try adjusting your search or filters."
                    : "There are currently no shops with available products. Check back later!"
                  }
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