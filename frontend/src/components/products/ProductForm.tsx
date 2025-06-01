// frontend/src/components/products/ProductForm.tsx
import React, { useState, useEffect } from 'react'; // useRef tidak lagi dipakai jika hanya input URL
import type { AppProduct, Category as CategoryType } from '../../types'; //
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { apiClient } from '../../utils/apiClient'; //

// Tipe data untuk form, ini yang akan di-pass ke onSubmit
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category_id: string | number | ''; // ID kategori yang akan dikirim ke backend
  available: boolean;
  images: string[]; // Array URL gambar
}

interface ProductFormProps {
  onSubmit: (productData: ProductFormData) => Promise<void>; // onSubmit sekarang async
  initialData?: AppProduct | null; // Tipe data produk dari types.ts untuk mode edit
  isSubmitting: boolean;
  submitButtonText?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting,
  submitButtonText = "Submit"
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category_id: '', // Akan diisi dengan ID kategori
    available: true,
    images: [], // Akan menyimpan array URL gambar
  });
  const [apiCategories, setApiCategories] = useState<CategoryType[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');

  // 1. Fetch kategori dari API saat komponen dimuat
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const categoriesData: CategoryType[] = await apiClient.get('/categories/');
        setApiCategories(categoriesData || []);
        console.log("[ProductForm] Categories fetched:", categoriesData);
      } catch (error) {
        console.error("[ProductForm] Failed to fetch categories:", error);
        setApiCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // 2. Mengisi form jika ada initialData (untuk mode edit)
  useEffect(() => {
    if (initialData && apiCategories.length > 0) {
      console.log("[ProductForm] Populating form with initialData:", initialData);
      let mappedCategoryId: string | number = '';
      if (initialData.category) { // initialData.category adalah NAMA kategori
        const foundCategory = apiCategories.find(cat => cat.name === initialData.category);
        if (foundCategory) {
          mappedCategoryId = foundCategory.id;
        } else {
          console.warn(`[ProductForm] Initial category name "${initialData.category}" not found in fetched API categories.`);
        }
      }
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || 0,
        category_id: mappedCategoryId, // Gunakan ID kategori yang sudah dimap
        available: initialData.available !== undefined ? initialData.available : true,
        images: initialData.images || [], // Asumsi initialData.images adalah array URL
      });
    } else if (!initialData) {
      // Reset form untuk mode "Add Product" jika tidak ada initialData
      setFormData({ name: '', description: '', price: 0, category_id: '', available: true, images: [] });
    }
  }, [initialData, apiCategories]); // Jalankan ulang jika initialData atau apiCategories berubah

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'price' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim() && formData.images.length < 5) {
      if (!newImageUrl.startsWith('http://') && !newImageUrl.startsWith('https://')) {
        alert("Please enter a valid image URL (starting with http:// or https://).");
        return;
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }));
      setNewImageUrl('');
    } else if (formData.images.length >= 5) {
      alert("Maximum 5 images allowed.");
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) {
        alert("Please select a category for the product.");
        return;
    }
    if (formData.price < 0) {
        alert("Product price cannot be negative.");
        return;
    }
    console.log("[ProductForm] Submitting product form data:", formData);
    await onSubmit(formData); // onSubmit adalah async
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="input w-full" required disabled={isSubmitting} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleInputChange} className="input w-full" required disabled={isSubmitting} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (per day) <span className="text-red-500">*</span></label>
          <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} className="input w-full" required min="0" step="0.01" disabled={isSubmitting} />
        </div>
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select 
            name="category_id" 
            id="category_id" 
            value={formData.category_id} 
            onChange={handleInputChange} 
            className="input w-full" 
            required 
            disabled={isSubmitting || isLoadingCategories || apiCategories.length === 0}
          >
            <option value="">Select a category</option>
            {apiCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {isLoadingCategories && <p className="text-xs text-gray-500 mt-1">Loading categories...</p>}
          {!isLoadingCategories && apiCategories.length === 0 && <p className="text-xs text-red-500 mt-1">No categories found. Please add them in admin.</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (Max 5)</label>
        <div className="flex items-center gap-2 mb-2">
            <input 
                type="url" 
                value={newImageUrl} 
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input flex-grow"
                disabled={isSubmitting}
            />
            <button 
                type="button" 
                onClick={handleAddImageUrl} 
                className="btn-secondary p-2 shrink-0"
                disabled={isSubmitting || formData.images.length >= 5 || !newImageUrl.trim()}
            >
                <PlusCircle size={20} />
            </button>
        </div>
        {formData.images.length > 0 && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {formData.images.map((imageSrc, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={imageSrc} alt={`Preview ${index + 1}`} className="h-full w-full object-cover rounded-md border" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-70 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                  aria-label={`Remove image ${index + 1}`}
                  disabled={isSubmitting}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
         <p className="mt-1 text-xs text-gray-500">Provide direct URLs to your product images.</p>
      </div>

      <div>
        <label className="flex items-center">
          <input type="checkbox" name="available" checked={formData.available} onChange={handleInputChange} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" disabled={isSubmitting} />
          <span className="ml-2 text-sm text-gray-700">Product is currently available for rent</span>
        </label>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || isLoadingCategories || !formData.category_id}
          >
            {isSubmitting ? <><Loader2 className="animate-spin h-4 w-4 mr-2 inline-block"/>Submitting...</> : submitButtonText}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;