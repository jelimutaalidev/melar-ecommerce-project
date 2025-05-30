// src/pages/ShopDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Link dihapus dari sini
import { ArrowLeft, MapPin, Star, Package, Store } from 'lucide-react'; // 'Store' ditambahkan
import type { Shop, AppProduct } from '../types'; 
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; 
import ProductCard from '../components/products/ProductCard';

const ShopDetailPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopProducts, setShopProducts] = useState<AppProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    if (shopId) {
      // Ambil detail toko
      const shopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
      const allShops: Shop[] = shopsString ? JSON.parse(shopsString) : [];
      const foundShop = allShops.find(s => s.id === shopId);
      setShop(foundShop || null);

      // Ambil produk milik toko ini
      const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopId}`;
      const productsString = localStorage.getItem(shopProductsKey);
      const products: AppProduct[] = productsString ? JSON.parse(productsString) : [];
      setShopProducts(products);
    }
    setIsLoading(false);
  }, [shopId]);

  if (isLoading) {
    return <div className="text-center py-10">Loading shop details...</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Shop Not Found</h2>
        <p className="text-gray-600 mb-6">The shop you're looking for doesn't exist or has been removed.</p>
        <button 
          onClick={() => navigate('/shops')}
          className="btn-primary"
        >
          Browse Shops
        </button>
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
            <Store size={48} className="text-gray-500" /> {/* Ikon Store digunakan di sini */}
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
            <span>{shop.rating.toFixed(1)}</span>
            <span className="text-gray-500 ml-2">({shop.totalRentals} rentals)</span>
          </div>
          <p className="text-gray-700 mb-4">{shop.description}</p>
          <div className="flex flex-wrap gap-2">
            {shop.categories.map(category => (
              <span 
                key={category} 
                className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {category}
              </span>
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
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    images: product.images, 
                    rating: product.rating || 0,
                    available: product.available,
                    category: product.category,
                  }} 
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