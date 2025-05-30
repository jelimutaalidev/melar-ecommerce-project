// frontend/src/pages/AddProductPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import ProductForm from '../components/products/ProductForm'; // Path diperbaiki
import type { AppProduct } from '../types'; // Path diperbaiki
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; // Path diperbaiki
import { useAuth } from '../context/AuthContext'; // Path diperbaiki

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const shopInfo = location.state as { shopId?: string, shopName?: string } | undefined;
  const shopId = user?.shopId || shopInfo?.shopId;
  const shopName = (user?.shop?.name) // Coba ambil dari user.shop.name dulu (jika user.shop ada)
                 || shopInfo?.shopName // Baru fallback ke location.state.shopName
                 || "Your Shop"; // Fallback paling akhir jika tidak ada

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddProduct = (productData: Omit<AppProduct, 'id' | 'owner' | 'shopId' | 'rating' | 'rentals' | 'reviews' | 'status'>) => {
    if (!shopId || !shopName) {
      alert("Shop information is missing. Cannot add product.");
      navigate('/shop-dashboard');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const newProduct: AppProduct = {
        ...productData,
        id: `prod_${shopId.slice(-4)}_${Date.now()}`, // ID lebih singkat
        shopId: shopId,
        owner: {
          id: shopId,
          name: shopName,
        },
        rating: 0,
        rentals: 0,
        available: productData.available !== undefined ? productData.available : true,
        status: productData.available !== undefined ? (productData.available ? 'available' : 'rented') : 'available',
        reviews: [],
        images: productData.images || [],
      };

      const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopId}`;
      const existingShopProductsString = localStorage.getItem(shopProductsKey);
      const shopProducts: AppProduct[] = existingShopProductsString ? JSON.parse(existingShopProductsString) : [];
      shopProducts.push(newProduct);
      localStorage.setItem(shopProductsKey, JSON.stringify(shopProducts));

      const allProductsString = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS);
      const allProducts: AppProduct[] = allProductsString ? JSON.parse(allProductsString) : [];
      allProducts.push(newProduct);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allProducts));

      setIsSubmitting(false);
      alert('Product added successfully!');
      navigate('/shop-dashboard', { state: { tab: 'products' } });
    }, 1000);
  };

  if (!shopId) {
      // Jika user belum login atau tidak punya shopId, mungkin arahkan atau tampilkan pesan
      // Ini untuk mencegah error jika shopId tidak ada saat render form
      return (
        <div className="container-custom py-10 text-center">
            <p>You need to be logged in and have a shop to add products.</p>
            <button onClick={() => navigate('/login')} className="btn-primary mt-4">Login</button>
        </div>
      );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate('/shop-dashboard', { state: { tab: 'products' }})}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Product List
          </button>
        </div>
      </div>
      <div className="container-custom py-8">
        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <div className="flex items-center mb-6">
            <PackagePlus size={28} className="text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold">Add New Product</h1>
          </div>
          <ProductForm
            onSubmit={handleAddProduct}
            isSubmitting={isSubmitting}
            submitButtonText="Add Product"
          />
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;