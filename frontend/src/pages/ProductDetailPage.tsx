// frontend/src/pages/ProductDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  User as UserIcon,
  ShoppingCart,
  Calendar,
  ArrowLeft,
  Share2,
  Heart,
  Clock,
  ChevronLeft,
  ChevronRight,
  Package,
  Store,
  Loader2 // Ditambahkan untuk ikon loading
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { format } from 'date-fns';
import type { AppProduct } from '../types';
// import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer'; // Tidak digunakan lagi untuk data produk utama
import { apiClient } from '../utils/apiClient'; // IMPORT apiClient
import ProductCard from '../components/products/ProductCard';

const ProductDetailPage: React.FC = () => {
  const { id: productIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<AppProduct | null | undefined>(undefined);
  const [relatedProducts, setRelatedProducts] = useState<AppProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (productIdFromUrl) {
        console.log(`[ProductDetailPage DEBUG] Attempting to fetch product ID: ${productIdFromUrl} from API...`);
        setProduct(undefined); // Reset state produk untuk menunjukkan loading
        setIsLoading(true);
        setError(null);

        try {
          // Ambil data produk spesifik dari API
          // Tipe data dari apiClient.get mungkin any, jadi kita perlu cast atau proses
          const apiProductData: any = await apiClient.get(`/products/${productIdFromUrl}/`);
          console.log("[ProductDetailPage DEBUG] Raw product data fetched successfully from API:", apiProductData);

          if (!apiProductData || Object.keys(apiProductData).length === 0) {
            console.warn("[ProductDetailPage DEBUG] API returned empty or invalid data for product.");
            throw new Error(`Product with ID ${productIdFromUrl} not found or API returned invalid data.`);
          }
          
          // Proses dan konversi data sebelum disimpan ke state
          const processedProduct: AppProduct = {
            ...apiProductData,
            id: String(apiProductData.id), // Pastikan ID adalah string
            price: parseFloat(apiProductData.price as any),
            rating: parseFloat(apiProductData.rating as any) || 0,
            total_individual_rentals: parseInt(apiProductData.total_individual_rentals as any, 10) || 0,
            available: apiProductData.available !== undefined ? apiProductData.available : true,
            // Mapping dari owner_info (dari API) ke owner (sesuai tipe AppProduct di frontend)
            owner: apiProductData.owner_info ? {
              id: String(apiProductData.owner_info.id),
              name: apiProductData.owner_info.name
            } : { id: '', name: 'Unknown Shop' }, // Fallback jika owner_info tidak ada
            images: Array.isArray(apiProductData.images) ? apiProductData.images : [], // Pastikan images adalah array
            // category sudah string dari serializer
          };
          setProduct(processedProduct);
          console.log("[ProductDetailPage DEBUG] Processed product set to state:", processedProduct);


          // Logika untuk mengambil "Related Products"
          if (processedProduct && processedProduct.category) {
            console.log(`[ProductDetailPage DEBUG] Fetching related products for category: ${processedProduct.category}`);
            const allProductsApi: any[] = await apiClient.get('/products/'); // Fetch semua produk lagi
            const related = allProductsApi
              .filter(p =>
                p.category === processedProduct.category &&
                String(p.id) !== String(processedProduct.id) &&
                p.available
              )
              .map((p): AppProduct => ({ // Konversi tipe juga untuk related products
                ...p,
                id: String(p.id),
                price: parseFloat(p.price as any),
                rating: parseFloat(p.rating as any) || 0,
                total_individual_rentals: parseInt(p.total_individual_rentals as any, 10) || 0,
                available: p.available !== undefined ? p.available : true,
                owner: p.owner_info ? { id: String(p.owner_info.id), name: p.owner_info.name } : { id: '', name: 'Unknown Shop'},
                images: Array.isArray(p.images) ? p.images : [],
              }))
              .slice(0, 4);
            setRelatedProducts(related);
            console.log("[ProductDetailPage DEBUG] Related products fetched and filtered:", related);
          }

        } catch (err: any) {
          console.error(`[ProductDetailPage DEBUG] Error fetching product ID: ${productIdFromUrl} from API:`, err);
          const errorMessage = err.response?.data?.detail || err.message || 'Failed to load product details.';
          setError(errorMessage);
          setProduct(null);
        } finally {
          setIsLoading(false);
          console.log(`[ProductDetailPage DEBUG] Finished fetching product ID: ${productIdFromUrl}. isLoading set to false.`);
        }
      } else {
        console.warn("[ProductDetailPage DEBUG] No productIdFromUrl found.");
        setProduct(null);
        setIsLoading(false);
      }
    };

    fetchProductDetails();
  }, [productIdFromUrl]);


  if (isLoading || product === undefined) {
    return (
        <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Loading product details...</p>
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
            <Package size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-red-600">Error Loading Product</h2>
            <p className="text-gray-600 mb-6 max-w-md text-center">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate('/products')} className="btn-primary">
                Browse Products
                </button>
                <button onClick={() => { setIsLoading(true); setError(null); /* Re-call fetchProductDetails atau trigger useEffect */ const event = new PopStateEvent('popstate'); window.dispatchEvent(event); navigate(0); }} className="btn-secondary">
                Try Again
                </button>
            </div>
        </div>
      </div>
    );
  }

  if (!product) {
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
            <Package size={48} className="text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="text-gray-600 mb-6">The product you're looking for (ID: {productIdFromUrl}) doesn't exist or has been removed.</p>
            <button onClick={() => navigate('/products')} className="btn-primary">
            Browse Products
            </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product) return; // Guard clause
    if (!selectedStartDate || !selectedEndDate) {
      alert('Please select rental dates');
      return;
    }
    const startDateObj = new Date(selectedStartDate);
    const endDateObj = new Date(selectedEndDate);

    if (endDateObj < startDateObj) {
        alert('End date cannot be before start date.');
        return;
    }

    addItem({
      id: product.id,
      name: product.name,
      images: product.images,
      price: product.price, // Sudah number
      rentalPeriod: {
        startDate: selectedStartDate,
        endDate: selectedEndDate
      },
      owner: product.owner, // Sekarang product.owner sudah sesuai dengan tipe CartItem
      shopId: product.shopId,
      category: product.category,
    });

    navigate('/cart');
  };

  const nextImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setActiveImage((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const today = new Date().toISOString().split('T')[0];

  // Sisa JSX untuk render halaman detail produk
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </button>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Product Images */}
            <div>
              <div className="relative rounded-lg overflow-hidden h-80 sm:h-96 bg-gray-100 border border-gray-200">
                <img
                  src={product.images?.[activeImage] || 'https://via.placeholder.com/600x400.png?text=No+Image'}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
                {(product.images?.length || 0) > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow-md transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} className="text-gray-700"/>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow-md transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} className="text-gray-700" />
                    </button>
                  </>
                )}
              </div>
              {(product.images?.length || 0) > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto py-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`flex-shrink-0 rounded-md overflow-hidden w-20 h-20 border-2 transition-all
                        ${index === activeImage ? 'border-primary-500 ring-2 ring-primary-300' : 'border-gray-300 hover:border-primary-400'}
                      `}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="mb-auto">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded hover:bg-primary-200 transition-colors">
                    {product.category}
                  </Link>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={`${i < (product.rating || 0) ? 'text-amber-400' : 'text-gray-300'} fill-current`}
                        />
                    ))}
                    <span className="ml-1">{(product.rating || 0).toFixed(1)}</span>
                    {product.reviews && product.reviews.length > 0 && (
                        <span className="ml-2">({product.reviews.length} reviews)</span>
                    )}
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary-600">${product.price.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">per day</span>
                </div>
                {product.owner && ( // Menggunakan product.owner setelah mapping
                    <div className="flex items-center mb-4 text-sm">
                      <Store size={16} className="text-gray-500 mr-2" />
                      <span>
                        Offered by <Link to={`/shops/${product.owner.id}`} className="font-medium text-primary-600 hover:underline">{product.owner.name}</Link>
                      </span>
                    </div>
                )}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{product.description}</p>
                </div>
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Rental Details</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <Clock size={15} className="mr-2 text-gray-500" />
                      <span>Minimum rental period: 1 day</span>
                    </li>
                    <li className="flex items-center">
                      <Calendar size={15} className="mr-2 text-gray-500" />
                      <span className={product.available ? 'text-green-600' : 'text-red-600'}>
                        {product.available ?
                          'Available for immediate rental' :
                          'Currently unavailable'
                        }
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="font-semibold text-gray-700 mb-4">Select Rental Period</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      id="startDate"
                      type="date"
                      min={today}
                      value={selectedStartDate}
                      onChange={(e) => {
                        setSelectedStartDate(e.target.value);
                        if (e.target.value && selectedEndDate && new Date(e.target.value) > new Date(selectedEndDate)) {
                          setSelectedEndDate('');
                        }
                      }}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      id="endDate"
                      type="date"
                      min={selectedStartDate || today}
                      value={selectedEndDate}
                      onChange={(e) => setSelectedEndDate(e.target.value)}
                      disabled={!selectedStartDate}
                      className="input w-full"
                    />
                  </div>
                </div>
                {selectedStartDate && selectedEndDate && new Date(selectedEndDate) >= new Date(selectedStartDate) && (
                  <div className="bg-primary-50 p-3 rounded-md mb-4 border border-primary-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">Rental period:</span>
                      <span className="font-medium text-primary-700">
                        {format(new Date(`${selectedStartDate}T00:00:00`), 'MMM dd, yy')} - {format(new Date(`${selectedEndDate}T00:00:00`), 'MMM dd, yy')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-700">Estimated total:</span>
                      <span className="font-bold text-primary-700">
                        {(() => {
                          const start = new Date(selectedStartDate);
                          const end = new Date(selectedEndDate);
                          let days = 0;
                          if (start && end && start <= end) {
                            const diffTime = Math.abs(end.getTime() - start.getTime());
                            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (start.toDateString() === end.toDateString()) {
                                days = 1;
                            } else {
                                days +=1;
                            }
                            days = Math.max(1, days);
                          } else {
                            days = 1;
                          }
                          return `$${(product.price * days).toFixed(2)}`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.available || !selectedStartDate || !selectedEndDate || new Date(selectedEndDate) < new Date(selectedStartDate)}
                    className={`btn flex-1 text-base py-3 ${
                      product.available && selectedStartDate && selectedEndDate && new Date(selectedEndDate) >= new Date(selectedStartDate)
                        ? 'btn-primary'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart size={18} className="mr-2" />
                    {product.available ? 'Add to Cart' : 'Unavailable'}
                  </button>
                  <button className="btn p-3 border border-gray-300 hover:bg-gray-100 transition-colors" aria-label="Add to wishlist">
                    <Heart size={20} className="text-gray-600" />
                  </button>
                  <button className="btn p-3 border border-gray-300 hover:bg-gray-100 transition-colors" aria-label="Share product">
                    <Share2 size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Customer Reviews</h2>
            <div className="space-y-6">
              {product.reviews.map((review, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon size={20} className="text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold text-gray-700">{review.user}</p>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={`${i < review.rating ? 'text-amber-400' : 'text-gray-300'} fill-current`}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">{format(new Date(review.date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-800 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProd => (
                <ProductCard key={relatedProd.id} product={relatedProd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;