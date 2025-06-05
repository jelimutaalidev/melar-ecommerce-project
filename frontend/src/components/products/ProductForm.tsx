// frontend/src/components/products/ProductForm.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { UploadCloud, XCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { AppProduct, Category as CategoryType } from '../../types';
import { apiClient } from '../../utils/apiClient';

// Tipe data untuk form, PENTING: 'images' sekarang File[]
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category_id: string | number;
  available: boolean;
  images: File[]; // Array File objek gambar
}

interface ProductFormProps {
  onSubmit: (productData: ProductFormData) => Promise<void>;
  initialData?: AppProduct | null;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting,
  submitButtonText = "Submit Product"
}) => {
  console.log("[ProductForm DEBUG] Component rendered. InitialData:", initialData);
  const [formData, setFormData] = useState<Omit<ProductFormData, 'price' | 'category_id'> & { price: string | number; category_id: string | number; images: File[] }>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    available: true,
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryType[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData | 'general' | 'images', string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch kategori
  useEffect(() => {
    console.log("[ProductForm DEBUG] useEffect for fetching categories triggered.");
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const categoriesData: CategoryType[] = await apiClient.get('/categories/');
        setApiCategories(categoriesData || []);
        console.log("[ProductForm DEBUG] Categories fetched successfully:", categoriesData);
      } catch (error) {
        console.error("[ProductForm CRITICAL] Failed to fetch categories:", error);
        setApiCategories([]);
        setFormErrors(prev => ({ ...prev, general: "Failed to load categories. Please try again."}));
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // 2. Mengisi form jika ada initialData
  useEffect(() => {
    console.log("[ProductForm DEBUG] useEffect for initialData triggered. InitialData:", initialData, "ApiCategories loaded:", apiCategories.length > 0);
    if (initialData) {
      let mappedCategoryId: string | number = '';
      if (initialData.category && apiCategories.length > 0) {
        const foundCategory = apiCategories.find(cat => cat.name === initialData.category);
        if (foundCategory) {
          mappedCategoryId = foundCategory.id;
          console.log(`[ProductForm DEBUG] Mapped category "${initialData.category}" to ID: ${mappedCategoryId}`);
        } else {
          console.warn(`[ProductForm DEBUG] Initial category name "${initialData.category}" not found in API categories.`);
        }
      }

      const newFormData = {
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price !== undefined ? String(initialData.price) : '',
        category_id: mappedCategoryId,
        available: initialData.available !== undefined ? initialData.available : true,
        images: [], // Selalu mulai dengan array File kosong untuk unggahan baru
      };
      setFormData(newFormData);
      console.log("[ProductForm DEBUG] Form populated with initialData:", newFormData);
      
      const existingUrls = initialData.images || [];
      setExistingImageUrls(existingUrls);
      console.log("[ProductForm DEBUG] Existing image URLs set:", existingUrls);
      
      setImagePreviews([]); // Kosongkan pratinjau untuk file baru
    } else {
      console.log("[ProductForm DEBUG] No initialData, resetting form.");
      setFormData({ name: '', description: '', price: '', category_id: '', available: true, images: [] });
      setExistingImageUrls([]);
      setImagePreviews([]);
    }
  }, [initialData, apiCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    console.log(`[ProductForm DEBUG] Input change - Name: ${name}, Value: ${value}, Type: ${type}`);
    
    setFormErrors(prev => ({ ...prev, [name]: undefined, general: undefined }));

    setFormData(prev => {
      const newState = {
        ...prev,
        [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value
      };
      console.log("[ProductForm DEBUG] formData state after input change:", newState);
      return newState;
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("[ProductForm DEBUG] handleImageChange triggered.");
    setFormErrors(prev => ({ ...prev, images: undefined, general: undefined }));
    if (e.target.files) {
      const filesReceived = e.target.files;
      console.log("[ProductForm DEBUG] Files received from input:", filesReceived);
      const filesArray = Array.from(filesReceived);
      console.log("[ProductForm DEBUG] Files converted to array:", filesArray);
      
      const MAX_TOTAL_IMAGES = 5;
      const currentTotalImages = existingImageUrls.length + formData.images.length;
      const MAX_NEW_FILES = MAX_TOTAL_IMAGES - currentTotalImages;
      const MAX_SIZE_MB = 5;
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      if (filesArray.length > MAX_NEW_FILES) {
        const errorMsg = `You can upload a maximum of ${MAX_NEW_FILES} new image(s) (total ${MAX_TOTAL_IMAGES} images allowed including ${existingImageUrls.length} existing and ${formData.images.length} already selected new images). You tried to add ${filesArray.length}.`;
        console.warn("[ProductForm DEBUG] Image limit exceeded:", errorMsg);
        setFormErrors(prev => ({ ...prev, images: errorMsg}));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const validFiles: File[] = [];
      const newPreviewsPromises: Promise<string>[] = []; // Untuk menangani async ObjectURL creation (sebenarnya sync)

      for (const file of filesArray) {
        console.log(`[ProductForm DEBUG] Processing file: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
        if (!ALLOWED_TYPES.includes(file.type)) {
          const errorMsg = (formErrors.images ? formErrors.images + "\n" : "") + `File type not allowed: ${file.name}.`;
          console.warn("[ProductForm DEBUG] Invalid file type:", file.name, file.type);
          setFormErrors(prev => ({ ...prev, images:errorMsg}));
          continue; 
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          const errorMsg = (formErrors.images ? formErrors.images + "\n" : "") + `File too large: ${file.name}. Max ${MAX_SIZE_MB}MB.`;
          console.warn("[ProductForm DEBUG] File too large:", file.name, file.size);
          setFormErrors(prev => ({ ...prev, images: errorMsg }));
          continue;
        }
        validFiles.push(file);
        try {
            const objectURL = URL.createObjectURL(file);
            newPreviewsPromises.push(Promise.resolve(objectURL)); // Wrap in promise for consistency, though sync
            console.log(`[ProductForm DEBUG] Created object URL for ${file.name}: ${objectURL}`);
        } catch (error) {
            console.error(`[ProductForm CRITICAL] Error creating object URL for ${file.name}:`, error);
        }
      }

      if(validFiles.length > 0) {
        Promise.all(newPreviewsPromises).then(resolvedPreviews => {
            setFormData(prev => {
                const updatedImages = [...prev.images, ...validFiles];
                console.log("[ProductForm DEBUG] formData.images updated:", updatedImages);
                return { ...prev, images: updatedImages };
            });
            setImagePreviews(prev => {
                const updatedPreviews = [...prev, ...resolvedPreviews];
                console.log("[ProductForm DEBUG] imagePreviews updated:", updatedPreviews);
                return updatedPreviews;
            });
        }).catch(error => {
            console.error("[ProductForm CRITICAL] Error resolving all preview promises:", error);
        });
      } else {
         console.log("[ProductForm DEBUG] No valid files to add after filtering.");
      }

    } else {
      console.log("[ProductForm DEBUG] No files selected in input.");
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
        console.log("[ProductForm DEBUG] File input reset.");
    }
  };

  const removeNewImage = (indexToRemove: number) => {
    console.log(`[ProductForm DEBUG] removeNewImage called for index: ${indexToRemove}`);
    const urlToRevoke = imagePreviews[indexToRemove];
    if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
        console.log(`[ProductForm DEBUG] Revoked object URL: ${urlToRevoke}`);
    } else {
        console.warn(`[ProductForm DEBUG] No preview URL found at index ${indexToRemove} to revoke.`);
    }

    setFormData(prev => {
      const updatedImages = prev.images.filter((_, index) => index !== indexToRemove);
      console.log("[ProductForm DEBUG] formData.images after removing new image:", updatedImages);
      return { ...prev, images: updatedImages };
    });
    setImagePreviews(prev => {
      const updatedPreviews = prev.filter((_, index) => index !== indexToRemove);
      console.log("[ProductForm DEBUG] imagePreviews after removing new image:", updatedPreviews);
      return updatedPreviews;
    });
  };

  const removeExistingImage = (urlToRemove: string) => {
    console.log(`[ProductForm DEBUG] removeExistingImage called for URL: ${urlToRemove}`);
    setExistingImageUrls(prev => {
        const updatedUrls = prev.filter(url => url !== urlToRemove);
        console.log("[ProductForm DEBUG] existingImageUrls after removal:", updatedUrls);
        return updatedUrls;
    });
    // console.log(`[ProductForm DEBUG] CONSIDER: Image URL ${urlToRemove} marked for deletion (backend logic needed).`);
  };

  const validateForm = (): boolean => {
    console.log("[ProductForm DEBUG] validateForm called. Current formData:", formData);
    const errors: Partial<Record<keyof ProductFormData | 'general' | 'images', string>> = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.description.trim()) errors.description = 'Description is required.';
    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      errors.price = 'Valid price is required (cannot be negative).';
    }
    if (!formData.category_id || formData.category_id === '') { 
        errors.category_id = 'Category is required.';
    }
    // if (!initialData && formData.images.length === 0 && existingImageUrls.length === 0) {
    //   errors.images = 'At least one image is required.';
    // }
    setFormErrors(errors);
    console.log("[ProductForm DEBUG] Validation errors:", errors, "Is form valid:", Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("[ProductForm DEBUG] handleSubmit triggered.");
    if (!validateForm()) {
        console.warn("[ProductForm DEBUG] Form validation failed. Aborting submit.");
        setFormErrors(prev => ({...prev, general: "Please correct the errors in the form before submitting."}));
        return;
    }
    
    const finalProductData: ProductFormData = {
      name: formData.name,
      description: formData.description,
      price: Number(formData.price),
      category_id: Number(formData.category_id),
      available: formData.available,
      images: formData.images,
    };

    console.log("[ProductForm CRITICAL] Submitting final product form data TO PARENT:", finalProductData);
    if (finalProductData.images.length > 0) {
        finalProductData.images.forEach((file, index) => {
            console.log(`[ProductForm CRITICAL] File ${index} to submit: Name - ${file.name}, Size - ${file.size}, Type - ${file.type}`);
        });
    } else {
        console.log("[ProductForm CRITICAL] No new files to submit.");
    }
    
    await onSubmit(finalProductData);
  };

  useEffect(() => {
    return () => {
      console.log("[ProductForm DEBUG] Component unmounting. Revoking object URLs for previews:", imagePreviews);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  console.log("[ProductForm DEBUG] Rendering form. IsSubmitting:", isSubmitting, "IsLoadingCategories:", isLoadingCategories);
  console.log("[ProductForm DEBUG] Current formErrors state:", formErrors);
  console.log("[ProductForm DEBUG] Current formData.images (File objects):", formData.images);
  console.log("[ProductForm DEBUG] Current imagePreviews (ObjectURLs):", imagePreviews);
  console.log("[ProductForm DEBUG] Current existingImageUrls (URLs from initialData):", existingImageUrls);


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
               className={`input w-full ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
               required disabled={isSubmitting} />
        {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleInputChange} 
                  className={`input w-full ${formErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                  required disabled={isSubmitting} />
        {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (IDR) <span className="text-red-500">*</span></label>
          <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} 
                 className={`input w-full ${formErrors.price ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                 required min="0" step="1" disabled={isSubmitting} />
          {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
        </div>
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="category_id" id="category_id" value={formData.category_id} onChange={handleInputChange} 
                  className={`input w-full ${formErrors.category_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}`} 
                  required disabled={isSubmitting || isLoadingCategories || apiCategories.length === 0}>
            <option value="">Select a category</option>
            {apiCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {isLoadingCategories && <p className="text-xs text-gray-500 mt-1">Loading categories...</p>}
          {!isLoadingCategories && apiCategories.length === 0 && !formErrors.general && 
            <p className="text-xs text-yellow-600 mt-1">No categories found. You might need to add them in the admin panel.</p>}
          {formErrors.category_id && <p className="mt-1 text-xs text-red-600">{formErrors.category_id}</p>}
        </div>
      </div>

      {/* Image Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Images ({existingImageUrls.length + formData.images.length} / 5)
        </label>
        {/* Display Existing Images (URLs) - for Edit mode */}
        {existingImageUrls.length > 0 && (
            <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">Existing images:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {existingImageUrls.map((url, index) => (
                    <div key={`existing-${index}`} className="relative group aspect-square border rounded-md overflow-hidden shadow-sm">
                        <img
                        src={url}
                        alt={`Existing Product Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/300x300/E0E0E0/BDBDBD?text=Image+Error')}
                        />
                        <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-red-700 focus:opacity-100"
                        aria-label="Remove existing image"
                        disabled={isSubmitting}
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                    ))}
                </div>
            </div>
        )}

        {/* New Image Uploader */}
        {(existingImageUrls.length + formData.images.length) < 5 && (
            <div 
                className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 ${formErrors.images ? 'border-red-400' : 'border-gray-300'} border-dashed rounded-md cursor-pointer hover:border-primary-400 transition-colors`}
                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && fileInputRef.current) {
                        fileInputRef.current.files = e.dataTransfer.files; 
                        const mockEvent = { target: fileInputRef.current } as ChangeEvent<HTMLInputElement>;
                        handleImageChange(mockEvent);
                    }
                }}
                onDragOver={(e) => e.preventDefault()}
            >
            <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
            <span className="mt-2 block text-sm text-gray-600">
                Drag & drop files here, or <span className="text-primary-600 font-medium">click to browse</span>
            </span>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, WEBP up to 5MB each.</p>
            <input
                ref={fileInputRef}
                id="new_images" 
                name="new_images" 
                type="file"
                multiple
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleImageChange}
                className="sr-only"
                disabled={isSubmitting}
            />
            </div>
        )}
         {formErrors.images && <p className="mt-1 text-xs text-red-600 whitespace-pre-line">{formErrors.images}</p>}

        {/* New Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="mt-4">
             <p className="text-xs text-gray-600 mb-1">New images to upload:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {imagePreviews.map((previewUrl, index) => (
                <div key={`new-${index}`} className="relative group aspect-square border rounded-md overflow-hidden shadow-sm">
                    <img
                    src={previewUrl}
                    alt={`New Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    />
                    <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-red-700 focus:opacity-100"
                    aria-label="Remove new image"
                    disabled={isSubmitting}
                    >
                    <XCircle size={18} />
                    </button>
                </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center">
        <input type="checkbox" name="available" id="available" checked={formData.available} onChange={handleInputChange} 
               className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" disabled={isSubmitting} />
        <label htmlFor="available" className="ml-2 block text-sm text-gray-700">Product is currently available</label>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary py-2.5 px-6 text-sm"
            disabled={isSubmitting || isLoadingCategories || (apiCategories.length > 0 && !formData.category_id)}
          >
            {isSubmitting ? <><Loader2 className="animate-spin h-5 w-5 mr-2 inline-block"/>Processing...</> : submitButtonText}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
