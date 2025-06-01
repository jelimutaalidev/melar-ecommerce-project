// frontend/src/pages/AddProductPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PackagePlus, Loader2 } from 'lucide-react';
import ProductForm, { ProductFormData } from '../components/products/ProductForm';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const shopInfoFromState = location.state as { shopId?: string, shopName?: string } | undefined;
  const currentShopId = user?.shopId || shopInfoFromState?.shopId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddProduct = async (productFormData: ProductFormData) => {
    setError(null);
    if (!currentShopId) {
      const errMsg = "Shop information is missing. Cannot add product. Ensure you are logged in and have an active shop.";
      console.error("[AddProductPage] " + errMsg, { userId: user?.id, currentShopId, userShopId: user?.shopId, shopInfoFromState });
      setError(errMsg);
      return;
    }
    if (!productFormData.category_id) { // Validasi tambahan sebelum kirim
        setError("Category is required. Please select a category for the product.");
        return;
    }

    setIsSubmitting(true);

    const payload = {
      name: productFormData.name,
      description: productFormData.description,
      price: productFormData.price,
      category_id: productFormData.category_id ? Number(productFormData.category_id) : null,
      available: productFormData.available,
      images_input: productFormData.images, // Kirim sebagai 'images_input' jika serializer backend Anda mengharapkannya
      shop_id: parseInt(currentShopId, 10),
    };

    // Hapus category_id dari payload jika null dan backend Anda tidak ingin menerimanya
    if (payload.category_id === null) {
        delete (payload as any).category_id;
    }

    console.log("[AddProductPage] Submitting product to API. Payload:", JSON.stringify(payload, null, 2));

    try {
      const newProductFromApi = await apiClient.post('/products/', payload);
      console.log("[AddProductPage] Product added successfully via API:", newProductFromApi);

      alert('Product added successfully!');
      // Arahkan ke dashboard produk dengan flag refreshProducts agar ShopDashboardPage mengambil data baru
      navigate('/shop-dashboard', { state: { tab: 'products', refreshProducts: true } });

    } catch (err: any) {
      console.error("[AddProductPage] Error adding product via API:", err);
      let errorMessage = 'Failed to add product.';
      if (err.response && err.response.data && typeof err.response.data === 'object') {
        const backendErrors = err.response.data;
        const messages = Object.entries(backendErrors)
          .map(([field, e]) => {
            const errorMessages = Array.isArray(e) ? e.join(', ') : String(e);
            return `${field}: ${errorMessages}`;
          })
          .join(' | ');
        errorMessage += ` Details: ${messages}`;
      } else if (err.message) {
        errorMessage += ` Message: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        console.log("[AddProductPage] User not authenticated, redirecting to login.");
        navigate('/login', { state: { returnTo: location.pathname }});
      } else if (!currentShopId) {
        console.warn("[AddProductPage] User authenticated but shopId is not available after auth loading.");
        // Error akan ditangani oleh blok render di bawah
      }
    }
  }, [authLoading, isAuthenticated, currentShopId, navigate, location.pathname]);
  
  if (authLoading) {
      return <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />Loading authentication status...</div>;
  }
  
  if (!isAuthenticated) {
      return <div className="text-center py-10">Please login to add products. Redirecting...</div>;
  }

  if (!currentShopId && !authLoading) { // Cek lagi setelah authLoading selesai
      return (
        <div className="container-custom py-10 text-center">
            <p className="text-red-500 font-semibold">Cannot add product: Your shop information is not available.</p>
            <p className="text-gray-600 mt-2">Please ensure you have created a shop, or try logging out and back in.</p>
            <button onClick={() => navigate('/create-shop')} className="btn-primary mt-4 mr-2">Create Shop</button>
            <button onClick={() => navigate('/shop-dashboard')} className="btn-secondary mt-4">Go to Dashboard</button>
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
            disabled={isSubmitting}
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
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p className="font-semibold">Error:</p>
              <p className="whitespace-pre-wrap">{error}</p>
            </div>
          )}
          {/* Hanya render ProductForm jika currentShopId ada (meskipun sudah dicek di atas) */}
          {currentShopId ? (
            <ProductForm
              onSubmit={handleAddProduct}
              isSubmitting={isSubmitting}
              submitButtonText="Add Product"
            />
          ) : (
            <p className="text-center text-gray-600">Loading shop information or shop not found...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;