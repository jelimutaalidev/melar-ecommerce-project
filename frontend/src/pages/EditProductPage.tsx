// frontend/src/pages/EditProductPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Loader2 } from 'lucide-react';
import ProductForm, { ProductFormData } from '../components/products/ProductForm';
import type { AppProduct } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

const EditProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  useAuth();

  const [product, setProduct] = useState<AppProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError('Product ID is missing in the URL.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // PERBAIKAN: Mengubah cara pemanggilan tipe dari generic menjadi type assertion
      const data = await apiClient.get(`/products/${productId}/`) as AppProduct;
      
      const formattedProduct: AppProduct = {
        ...data,
        id: String(data.id),
        price: parseFloat(String(data.price)),
        images: Array.isArray(data.images) ? data.images : [],
        category: data.category ? String(data.category) : '',
        owner: data.owner || { id: String(data.shopId), name: String(data.shop_name) }
      };

      setProduct(formattedProduct);

    } catch (err: any) {
      console.error('[EditProductPage] Error fetching product:', err);
      if (err.response && err.response.status === 404) {
        setError('Product not found. It may have been deleted.');
      } else {
        setError('Failed to load product data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleEditProduct = async (formData: ProductFormData) => {
    if (!product || !productId) {
      alert('Cannot update product: critical information missing.');
      return;
    }

    setIsSubmitting(true);
    const submissionData = new FormData();

    submissionData.append('name', formData.name);
    submissionData.append('description', formData.description);
    submissionData.append('price', String(formData.price));
    submissionData.append('available', String(formData.available));
    if (formData.category_id) {
        submissionData.append('category_id', String(formData.category_id));
    }
    
    if (formData.images && formData.images.length > 0) {
      const newImageFiles = formData.images.filter(img => img instanceof File);
      newImageFiles.forEach((file: File) => {
        submissionData.append('images', file);
      });
    }

    try {
      await apiClient.patch(`/products/${productId}/`, submissionData);
      alert('Product updated successfully!');
      navigate('/shop-dashboard', { state: { tab: 'products', refreshProducts: true } });

    } catch (err: any) {
      console.error('[EditProductPage] Error updating product:', err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'An unknown error occurred.';
      alert(`Failed to update product: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-4 text-lg text-gray-700">Loading Product Data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-10 text-center">
        <p className="text-lg text-red-600 font-semibold">{error}</p>
        <button
            onClick={() => navigate('/shop-dashboard', { state: { tab: 'products' } })}
            className="mt-4 btn-secondary"
          >
            Back to Product List
        </button>
      </div>
    );
  }
  
  if (!product) {
     return (
        <div className="container-custom py-10 text-center">
            <p className="text-lg text-gray-600">Could not find the product to edit.</p>
        </div>
     );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate('/shop-dashboard', { state: { tab: 'products' } })}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors font-medium"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Product List
          </button>
        </div>
      </div>
      <div className="container-custom py-8">
        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <div className="flex items-center mb-6 border-b pb-4">
            <Edit3 size={28} className="text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">Edit Product</h1>
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
