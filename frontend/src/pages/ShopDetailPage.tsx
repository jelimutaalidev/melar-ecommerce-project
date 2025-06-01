// src/pages/ShopDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } // Link diimpor kembali jika dibutuhkan, misal untuk nama kategori
from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Package, Store, Loader2 } from 'lucide-react'; // Loader2 ditambahkan
import type { Shop, AppProduct, Category as CategoryType } from '../types'; // CategoryType diimpor untuk type hinting
import { apiClient } from '../utils/apiClient'; // IMPORT apiClient
import ProductCard from '../components/products/ProductCard';

const ShopDetailPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopProducts, setShopProducts] = useState<AppProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopAndProducts = async () => {
      if (shopId) {
        setIsLoading(true);
        setError(null);
        console.log(`[ShopDetailPage DEBUG] Attempting to fetch shop ID: ${shopId} and its products from API...`);
        try {
          // 1. Fetch shop details
          // Kita asumsikan API mengembalikan objek Shop sesuai tipe di types.ts, tapi kita tetap parsing
          const fetchedShopData: any = await apiClient.get(`/shops/${shopId}/`);
          console.log("[ShopDetailPage DEBUG] Shop details fetched from API:", fetchedShopData);

          if (!fetchedShopData || Object.keys(fetchedShopData).length === 0) {
            throw new Error(`Shop with ID ${shopId} not found or API returned invalid data.`);
          }
          
          const processedShop: Shop = {
            id: String(fetchedShopData.id),
            name: fetchedShopData.name || 'Unknown Shop',
            description: fetchedShopData.description || '',
            location: fetchedShopData.location || 'N/A',
            rating: parseFloat(fetchedShopData.rating as any) || 0,
            totalRentals: parseInt(fetchedShopData.totalRentals as any, 10) || 0,
            image: fetchedShopData.image || null,
            categories: Array.isArray(fetchedShopData.categories) 
                ? fetchedShopData.categories.map((cat: any) => ({
                    id: String(cat.id), // Pastikan ID kategori adalah string atau number sesuai tipe Category
                    name: cat.name || 'Unnamed Category',
                    description: cat.description
                  } as CategoryType)) 
                : [],
            ownerId: String(fetchedShopData.owner_id || fetchedShopData.owner?.id || ''), // Sesuaikan dengan field owner dari API
            phoneNumber: fetchedShopData.phone_number,
            address: fetchedShopData.address,
            zip_code: fetchedShopData.zip_code,
            business_type: fetchedShopData.business_type,
            product_count: parseInt(fetchedShopData.product_count as any, 10) || 0,
            // created_at dan updated_at bisa ditambahkan jika perlu dan ada di tipe Shop
          };
          setShop(processedShop);
          console.log("[ShopDetailPage DEBUG] Processed shop set to state:", processedShop);

          // 2. Fetch shop products
          // Kita asumsikan API mengembalikan array AppProduct, tapi kita tetap parsing
          const fetchedProductsData: any[] = await apiClient.get(`/shops/${shopId}/products/`);
          console.log("[ShopDetailPage DEBUG] Shop products fetched from API:", fetchedProductsData);

          const validProducts = Array.isArray(fetchedProductsData) ? fetchedProductsData : [];
          const processedProducts: AppProduct[] = validProducts.map(p => ({
            id: String(p.id),
            name: p.name || 'Unnamed Product',
            description: p.description || '',
            price: parseFloat(p.price as any),
            images: Array.isArray(p.images) ? p.images : [],
            // Backend AppProductSerializer mengirim 'category' sebagai nama string dan 'owner_info'
            category: p.category || 'Uncategorized', // Langsung gunakan string nama kategori dari serializer
            rating: parseFloat(p.rating as any) || 0,
            available: p.available !== undefined ? p.available : true,
            owner: p.owner_info ? { // Mapping dari owner_info
              id: String(p.owner_info.id),
              name: p.owner_info.name
            } : { id: String(processedShop.id), name: processedShop.name }, // Fallback
            shopId: String(processedShop.id), // Set shopId produk ke ID toko yang sedang dilihat
            total_individual_rentals: parseInt(p.total_individual_rentals as any, 10) || 0,
            status: p.status || (p.available ? 'available' : 'rented'), // Handle status
            reviews: Array.isArray(p.reviews) ? p.reviews : [],
          }));
          setShopProducts(processedProducts);
          console.log("[ShopDetailPage DEBUG] Processed shop products set to state:", processedProducts);

        } catch (err: any) {
          console.error(`[ShopDetailPage DEBUG] Error fetching shop data or products for ID ${shopId}:`, err);
          const errorMessage = err.response?.data?.detail || err.message || 'Failed to load shop details or products.';
          setError(errorMessage);
          setShop(null);
          setShopProducts([]);
        } finally {
          setIsLoading(false);
          console.log(`[ShopDetailPage DEBUG] Finished fetching for shop ID: ${shopId}. isLoading set to false.`);
        }
      } else {
        console.warn("[ShopDetailPage DEBUG] No shopId found in params. Cannot fetch shop details.");
        setShop(null);
        setShopProducts([]);
        setIsLoading(false);
      }
    };

    fetchShopAndProducts();
  }, [shopId]);

  if (isLoading) {
    return (
        <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading shop details...</p>
        </div>
    );
  }

  if (error) {
     return (
      <div className="bg-gray-50 min-h-screen pb-16 fade-in">
          <div className="bg-white border-b">
                <div className="container-custom py-3">
                    <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-primary-600 transition-colors">
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </button>
                </div>
            </div>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
            <Store size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-red-600">Error Loading Shop</h2>
            <p className="text-gray-600 mb-6 max-w-md text-center">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate('/shops')} className="btn-primary">
                    Browse Shops
                </button>
                <button onClick={() => { setIsLoading(true); setError(null); const event = new PopStateEvent('popstate'); window.dispatchEvent(event); navigate(0); }} className="btn-secondary">
                    Try Again
                </button>
            </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="bg-gray-50 min-h-screen pb-16 fade-in">
        <div className="bg-white border-b">
            <div className="container-custom py-3">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-primary-600 transition-colors">
                    <ArrowLeft size={16} className="mr-2" /> Back
                </button>
            </div>
        </div>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center">
            <Store size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Shop Not Found</h2>
            <p className="text-gray-600 mb-6">The shop you're looking for (ID: {shopId}) doesn't exist or has been removed.</p>
            <button
            onClick={() => navigate('/shops')}
            className="btn-primary"
            >
            Browse Shops
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Shops
          </button>
        </div>
      </div>

      <div className="relative h-48 md:h-64 bg-gray-200">
        {shop.image ? (
          <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <Store size={48} className="text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>

      <div className="container-custom -mt-16">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8 relative">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{shop.name}</h1>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <MapPin size={16} className="mr-1" /> {shop.location}
          </div>
          <div className="flex items-center text-amber-500 mb-4">
            <Star size={18} className="fill-current mr-1" />
            <span>{(shop.rating || 0).toFixed(1)}</span> {/* Pastikan ada fallback jika rating undefined */}
            <span className="text-gray-500 ml-2">({shop.totalRentals || 0} rentals)</span> {/* Pastikan ada fallback */}
          </div>
          <p className="text-gray-700 mb-4">{shop.description}</p>
          <div className="flex flex-wrap gap-2">
            {/* shop.categories adalah array objek Category */}
            {shop.categories.map((category: CategoryType) => ( // Eksplisit tipe CategoryType
              <Link // Ubah menjadi Link jika ingin bisa diklik untuk filter
                to={`/products?category=${encodeURIComponent(category.name)}`}
                key={category.id}
                className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-primary-200"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Products from {shop.name}</h2>
          {shopProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shopProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product} // Langsung kirim objek produk yang sudah diproses
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">This shop doesn't have any products listed yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopDetailPage;