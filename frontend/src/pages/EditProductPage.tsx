// frontend/src/pages/EditProductPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit3 } from 'lucide-react';
import ProductForm from '../components/products/ProductForm'; // Path diperbaiki
import type { AppProduct } from '../types'; // Path diperbaiki
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; // Path diperbaiki
import { useAuth } from '../context/AuthContext'; // Path diperbaiki

const EditProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Mengambil shopId dan shopName dari state yang dikirim melalui navigate, atau dari user context
  const shopInfo = location.state as { shopId?: string, shopName?: string } | undefined;
  const shopId = user?.shopId || shopInfo?.shopId;
  const shopName = (user?.shop?.name) // Coba ambil dari user.shop.name dulu (jika user.shop ada)
                 || shopInfo?.shopName // Baru fallback ke location.state.shopName
                 || "Your Shop"; // Fallback paling akhir jika tidak ada

  const [product, setProduct] = useState<AppProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!productId || !shopId) {
      alert('Product ID or Shop ID is missing. Redirecting to dashboard.');
      navigate('/shop-dashboard', { state: { tab: 'products' } });
      return;
    }
    const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopId}`;
    const storedProductsString = localStorage.getItem(shopProductsKey);
    const storedProducts: AppProduct[] = storedProductsString ? JSON.parse(storedProductsString) : [];
    const foundProduct = storedProducts.find(p => p.id === productId);

    if (foundProduct) {
      setProduct(foundProduct);
    } else {
      alert('Product not found in this shop or product ID is invalid.');
      navigate('/shop-dashboard', { state: { tab: 'products' } });
    }
    setIsLoading(false);
  }, [productId, shopId, navigate]);

  const handleEditProduct = (productData: Omit<AppProduct, 'id' | 'owner' | 'shopId' | 'rating' | 'rentals' | 'reviews' | 'status'>) => {
    if (!product || !shopId || !shopName) {
        alert("Cannot update product: critical information missing.");
        return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const updatedProduct: AppProduct = {
        ...product,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: productData.category,
        available: productData.available !== undefined ? productData.available : product.available,
        status: productData.available !== undefined ? (productData.available ? 'available' : 'rented') : product.status,
        images: productData.images || product.images || [], // Pertahankan gambar lama jika tidak ada yang baru
        owner: { // Pastikan owner tetap atau diupdate jika perlu (misal nama toko berubah)
            id: shopId,
            name: shopName,
        }
      };

      const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shopId}`;
      const existingShopProductsString = localStorage.getItem(shopProductsKey);
      let shopProducts: AppProduct[] = existingShopProductsString ? JSON.parse(existingShopProductsString) : [];
      shopProducts = shopProducts.map(p => (p.id === productId ? updatedProduct : p));
      localStorage.setItem(shopProductsKey, JSON.stringify(shopProducts));

      const allProductsString = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS);
      let allProducts: AppProduct[] = allProductsString ? JSON.parse(allProductsString) : [];
      allProducts = allProducts.map(p => (p.id === productId ? updatedProduct : p));
      localStorage.setItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS, JSON.stringify(allProducts));

      setIsSubmitting(false);
      alert('Product updated successfully!');
      navigate('/shop-dashboard', { state: { tab: 'products' } });
    }, 1000);
  };

  if (isLoading) {
    return <div className="container-custom py-10 text-center">Loading product data...</div>;
  }

  if (!product) {
    // Pesan ini akan ditampilkan jika produk tidak ditemukan setelah loading selesai
    // atau jika navigasi kembali ke dashboard belum sempat dijalankan oleh useEffect.
    return <div className="container-custom py-10 text-center">Product not found or you do not have permission to edit it.</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate('/shop-dashboard', { state: { tab: 'products' } })}
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
            <Edit3 size={28} className="text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold">Edit Product</h1>
          </div>
          <ProductForm
            onSubmit={handleEditProduct}
            initialData={product}
            isSubmitting={isSubmitting}
            submitButtonText="Save Changes"
          />
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;