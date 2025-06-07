// frontend/src/components/products/ProductForm.tsx

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { UploadCloud, X, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { AppProduct, Category, ProductImage } from '../../types';
import { apiClient } from '../../utils/apiClient';

// Tipe data untuk form, fokus pada apa yang dikirim ke parent.
export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  available: boolean;
  images: File[]; // Hanya untuk file BARU yang akan diunggah
}

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: AppProduct | null;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting,
  submitButtonText = "Submit Product",
}) => {
  // State untuk data teks dalam form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    available: true,
  });

  // State terpisah untuk gambar
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // State lainnya
  const [apiCategories, setApiCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData | 'general' | 'images', string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const categoriesData: Category[] = await apiClient.get('/categories/');
        setApiCategories(categoriesData || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setFormErrors(prev => ({ ...prev, general: "Failed to load categories." }));
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!initialData || apiCategories.length === 0) {
      return;
    }

    // --- PERBAIKAN KRUSIAL ---
    // Sekarang kita menggunakan `initialData.category_name` yang dikirim dari parent.
    const productCategoryName = initialData.category_name || '';
    let foundCategoryId = '';
    
    // Jika ada nama kategori, cari objek kategori yang cocok di dalam daftar API.
    if (productCategoryName) {
      const foundCategory = apiCategories.find(cat => cat.name === productCategoryName);
      if (foundCategory) {
        // Jika ditemukan, kita ambil ID-nya.
        foundCategoryId = String(foundCategory.id);
      }
    }

    setFormData({
      name: initialData.name || '',
      description: initialData.description || '',
      price: String(initialData.price) || '',
      category_id: foundCategoryId, // <- Set ID yang ditemukan
      available: initialData.available !== undefined ? initialData.available : true,
    });

    if (initialData.images && Array.isArray(initialData.images)) {
      setExistingImages(initialData.images);
    }
  }, [initialData, apiCategories]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormErrors(prev => ({ ...prev, [name]: undefined, general: undefined }));
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormErrors(prev => ({ ...prev, images: undefined }));
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const MAX_TOTAL_IMAGES = 5;
    const currentImageCount = existingImages.length + newImageFiles.length;
    
    if (filesArray.length + currentImageCount > MAX_TOTAL_IMAGES) {
      setFormErrors(prev => ({ ...prev, images: `You can only upload a total of ${MAX_TOTAL_IMAGES} images.`}));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    for (const file of filesArray) {
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setNewImageFiles(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const removeNewImage = (indexToRemove: number) => {
    const urlToRevoke = imagePreviews[indexToRemove];
    URL.revokeObjectURL(urlToRevoke);
    
    setNewImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };
  
  const removeExistingImage = (idToRemove: number | string) => {
    setExistingImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalData: ProductFormData = {
      ...formData,
      price: String(formData.price),
      category_id: String(formData.category_id),
      images: newImageFiles,
    };
    await onSubmit(finalData);
  };
  
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       {formErrors.general && (
        <div className="p-3 mb-4 bg-red-100 text-red-700 border border-red-300 rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2 text-red-600 flex-shrink-0" />
            <span>{formErrors.general}</span>
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} 
               className={`input w-full ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`} 
               required disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleInputChange} 
                  className={`input w-full ${formErrors.description ? 'border-red-500' : 'border-gray-300'}`} 
                  required disabled={isSubmitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (per day) <span className="text-red-500">*</span></label>
          <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} 
                 className={`input w-full ${formErrors.price ? 'border-red-500' : 'border-gray-300'}`} 
                 required min="0" step="0.01" disabled={isSubmitting} />
        </div>
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="category_id" id="category_id" value={formData.category_id} onChange={handleInputChange} 
                  className={`input w-full ${formErrors.category_id ? 'border-red-500' : 'border-gray-300'}`} 
                  required disabled={isSubmitting || isLoadingCategories}>
            <option value="" disabled>{isLoadingCategories ? 'Loading...' : 'Select a category'}</option>
            {apiCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Images ({existingImages.length + newImageFiles.length} / 5)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-2">
          {existingImages.map((image) => (
            <div key={`existing-${image.id}`} className="relative group aspect-square border rounded-md overflow-hidden shadow-sm">
                <img
                  src={image.image}
                  alt={image.alt_text || `Existing Image`}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/300x300/E0E0E0/BDBDBD?text=Error')}
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(image.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-50 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove existing image"
                  disabled={isSubmitting}
                >
                  <Trash2 size={16} />
                </button>
            </div>
          ))}
          {imagePreviews.map((previewUrl, index) => (
            <div key={`new-${index}`} className="relative group aspect-square border rounded-md overflow-hidden shadow-sm">
                <img src={previewUrl} alt={`New Preview ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-50 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove new image"
                  disabled={isSubmitting}
                >
                  <X size={18} />
                </button>
            </div>
          ))}
          {(existingImages.length + newImageFiles.length) < 5 && (
            <div 
              className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-primary-400"
              onClick={() => !isSubmitting && fileInputRef.current?.click()}>
              <UploadCloud className="h-10 w-10 text-gray-400" />
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageChange} className="sr-only" />
            </div>
          )}
        </div>
        {formErrors.images && <p className="mt-1 text-xs text-red-600">{formErrors.images}</p>}
      </div>

      <div className="flex items-center">
        <input type="checkbox" name="available" id="available" checked={formData.available} onChange={handleInputChange} 
               className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" disabled={isSubmitting} />
        <label htmlFor="available" className="ml-2 block text-sm text-gray-700">Product is currently available</label>
      </div>
      <div className="pt-5 border-t">
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <><Loader2 className="animate-spin h-5 w-5 mr-2 inline-block"/>Processing...</> : submitButtonText}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
