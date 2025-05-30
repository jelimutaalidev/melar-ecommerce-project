// frontend/src/components/products/ProductForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { AppProduct } from '../../types'; // Path diperbaiki dari ../../pages/types menjadi ../../types
import { UploadCloud, XCircle } from 'lucide-react'; // ImageIcon dihapus

interface ProductFormProps {
  onSubmit: (productData: Omit<AppProduct, 'id' | 'owner' | 'shopId' | 'rating' | 'rentals' | 'reviews' | 'status'>) => void;
  initialData?: AppProduct | null;
  isSubmitting: boolean;
  submitButtonText?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting,
  submitButtonText = "Submit"
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    images: [] as string[], // Akan menyimpan URL gambar (existing atau blob URL untuk preview)
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  // imageFiles state dihilangkan untuk mengatasi error 'never read',
  // karena untuk localStorage demo, kita hanya butuh URL preview di formData.images.
  // Jika ada backend, imageFiles akan penting untuk mengirim File object.

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || 0,
        category: initialData.category || '',
        available: initialData.available !== undefined ? initialData.available : true,
        images: initialData.images || [],
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'price' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newImagePreviews = filesArray.map(file => URL.createObjectURL(file));
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImagePreviews].slice(0, 5) // Batasi maksimal 5 gambar
      }));
    }
  };

  const removeImage = (indexToRemove: number) => {
    const imageToRemove = formData.images[indexToRemove];
    if (imageToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove);
    }
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // formData sudah berisi URL gambar (existing atau blob URL dari preview file baru)
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="input w-full" required />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea name="description" id="description" rows={4} value={formData.description} onChange={handleInputChange} className="input w-full" required />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Price (per day) <span className="text-red-500">*</span></label>
          <input type="number" name="price" id="price" value={formData.price} onChange={handleInputChange} className="input w-full" required min="0" step="0.01" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select name="category" id="category" value={formData.category} onChange={handleInputChange} className="input w-full" required>
            <option value="">Select a category</option>
            <option value="Electronics">Electronics</option>
            <option value="Tools & Equipment">Tools & Equipment</option>
            <option value="Photography">Photography</option>
            <option value="Outdoor Gear">Outdoor Gear</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Clothing">Clothing</option>
            <option value="Sports Equipment">Sports Equipment</option>
            <option value="Party Supplies">Party Supplies</option>
            <option value="Musical Instruments">Musical Instruments</option>
            <option value="Decorations">Decorations</option>
            {/* Tambahkan kategori lain sesuai kebutuhan */}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Images (Max 5)</label>
        <div
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              const filesArray = Array.from(e.dataTransfer.files);
              const newImagePreviews = filesArray.map(file => URL.createObjectURL(file));
              setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImagePreviews].slice(0, 5)
              }));
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <p className="pl-1">Upload files or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            id="images-upload-form" // ID unik
            name="imageFilesInput" // Nama unik
            type="file"
            multiple
            onChange={handleImageChange}
            className="sr-only"
            accept="image/*"
          />
        </div>
        {formData.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {formData.images.map((imageSrc, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={imageSrc} alt={`Preview ${index + 1}`} className="h-full w-full object-cover rounded-md" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <XCircle size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center">
          <input type="checkbox" name="available" checked={formData.available} onChange={handleInputChange} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" />
          <span className="ml-2 text-sm text-gray-700">Product is currently available for rent</span>
        </label>
      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : submitButtonText}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;