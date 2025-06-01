// src/pages/ProductsPage.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ChevronDown, Package, Loader2 } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import type { AppProduct, HomePageCategoryDisplay } from '../types';
import { apiClient } from '../utils/apiClient';

const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [displayProducts, setDisplayProducts] = useState<AppProduct[]>([]);
  const [availableCategories, setAvailableCategories] = useState<HomePageCategoryDisplay[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AppProduct[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    category: searchParams.get('category') || '',
    priceRange: '',
    availability: '',
    rating: '',
  });
  const [sortOption, setSortOption] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      console.log("[ProductsPage DEBUG] Attempting to fetch products from API...");
      try {
        const fetchedProducts: AppProduct[] = await apiClient.get('/products/');
        // console.log("[ProductsPage DEBUG] Raw products fetched successfully from API:", fetchedProducts); // Log data mentah jika perlu

        const rawProducts = Array.isArray(fetchedProducts) ? fetchedProducts : [];
        const validProducts: AppProduct[] = rawProducts.map(p => ({
          ...p,
          price: parseFloat(p.price as any), // KONVERSI KE ANGKA DI SINI
          rating: parseFloat(p.rating as any) || 0, // Konversi rating juga, beri default 0 jika NaN
          // Pastikan juga untuk mengkonversi properti numerik lainnya jika ada (misalnya total_individual_rentals)
          total_individual_rentals: parseInt(p.total_individual_rentals as any, 10) || 0,
        }));
        setDisplayProducts(validProducts);
        console.log("[ProductsPage DEBUG] Products processed with price/rating as numbers:", validProducts);


        if (validProducts.length > 0) {
          const categoryCounts: { [key: string]: number } = {};
          validProducts.forEach(product => {
            if (product.category) {
              if (!categoryCounts[product.category]) {
                categoryCounts[product.category] = 0;
              }
              categoryCounts[product.category]++;
            }
          });
          const processedCategories: HomePageCategoryDisplay[] = Object.entries(categoryCounts)
            .map(([name, count]) => ({
              id: name.replace(/\s+/g, '-').toLowerCase(),
              name: name,
              count: count,
              image: '',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setAvailableCategories(processedCategories);
          console.log("[ProductsPage DEBUG] Categories processed:", processedCategories);
        } else {
          setAvailableCategories([]);
          console.log("[ProductsPage DEBUG] No products fetched or invalid format from API, categories set to empty.");
        }
      } catch (err: any) {
        console.error("[ProductsPage DEBUG] Error fetching products from API:", err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load products. Please try again later.';
        setError(errorMessage);
        setDisplayProducts([]);
        setAvailableCategories([]);
      } finally {
        setIsLoading(false);
        console.log("[ProductsPage DEBUG] Product fetching finished. isLoading set to false.");
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    console.log("[ProductsPage DEBUG] Applying filters/sort. DisplayProducts count:", displayProducts.length, "Active Filters:", activeFilters, "Sort Option:", sortOption);
    let result = [...displayProducts];

    if (searchQuery) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      result = result.filter(product =>
        product.name.toLowerCase().includes(lowerSearchQuery) ||
        (product.description && product.description.toLowerCase().includes(lowerSearchQuery))
      );
    }

    if (activeFilters.category) {
      result = result.filter(product => product.category === activeFilters.category);
    }

    if (activeFilters.priceRange) {
      const [minStr, maxStr] = activeFilters.priceRange.split('-');
      const min = parseFloat(minStr);
      const max = maxStr && maxStr !== '' ? parseFloat(maxStr) : Infinity;
      result = result.filter(product => product.price >= min && (max === Infinity ? true : product.price <= max));
    }

    if (activeFilters.availability) {
      if (activeFilters.availability === 'available') {
        result = result.filter(product => product.available);
      } else if (activeFilters.availability === 'unavailable') {
        result = result.filter(product => !product.available);
      }
    }

    if (activeFilters.rating) {
      const minRating = Number(activeFilters.rating);
      result = result.filter(product => (product.rating || 0) >= minRating);
    }

    if (sortOption) {
      switch (sortOption) {
        case 'price-asc':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'name-asc':
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          result.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'rating-desc':
          result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        default:
          break;
      }
    }
    setFilteredProducts(result);
    console.log("[ProductsPage DEBUG] Filtered products count:", result.length);
  }, [searchQuery, activeFilters, sortOption, displayProducts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (activeFilters.category) params.set('category', activeFilters.category);
    setSearchParams(params, { replace: true });
  }, [searchQuery, activeFilters.category, setSearchParams]);

  const handleFilterChange = (filterType: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType as keyof typeof prev] === value ? '' : value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({
      category: '',
      priceRange: '',
      availability: '',
      rating: '',
    });
    setSortOption('');
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen pb-16 fade-in">
        <div className="bg-primary-700 text-white py-10">
            <div className="container-custom">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Products for Rent</h1>
                <p className="text-primary-100">
                Find the perfect products to rent for your needs
                </p>
            </div>
        </div>
        <div className="container-custom py-10 text-center">
          <Package size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-600">Error Loading Products</h2>
          <p className="text-gray-600 mt-2 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-primary-700 text-white py-10">
        <div className="container-custom">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Products for Rent</h1>
          <p className="text-primary-100">
            Find the perfect products to rent for your needs
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex justify-between items-center mb-6 md:hidden">
          <button
            onClick={toggleFilter}
            className="flex items-center bg-white border border-gray-200 px-4 py-2 rounded-md shadow-sm"
          >
            <Filter size={18} className="mr-2" />
            <span>Filters</span>
          </button>

          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="input appearance-none bg-white border border-gray-200 px-4 py-2 pr-8 rounded-md shadow-sm"
            >
              <option value="">Sort by</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="rating-desc">Top Rated</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`${isFilterOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-white rounded-lg shadow-sm p-4 h-fit sticky top-24`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Filters</h2>
              {Object.values(activeFilters).some(val => val !== '') && (
                <button
                  onClick={clearFilters}
                  className="text-primary-600 text-sm hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Category</h3>
              <div className="space-y-2">
                {availableCategories.map((category) => (
                  <label key={category.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={category.name}
                      checked={activeFilters.category === category.name}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">{category.name} ({category.count})</span>
                  </label>
                ))}
                {activeFilters.category && (
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className="flex items-center text-xs text-gray-500 hover:text-primary-600 mt-1"
                  >
                    <X size={12} className="mr-1" />
                    Clear category
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Price Range (per day)</h3>
              <div className="space-y-2">
                {['0-25', '25-50', '50-100', '100-200', '200-'].map((range) => (
                  <label key={range} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="priceRange"
                      value={range}
                      checked={activeFilters.priceRange === range}
                      onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">
                       {range.endsWith('-') ? `$${range.slice(0,-1)}+` : `$${range.split('-')[0]} - $${range.split('-')[1]}`}
                    </span>
                  </label>
                ))}
                {activeFilters.priceRange && (
                  <button onClick={() => handleFilterChange('priceRange', '')} className="flex items-center text-xs text-gray-500 hover:text-primary-600 mt-1">
                    <X size={12} className="mr-1" /> Clear price
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Availability</h3>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="availability" value="" checked={activeFilters.availability === ''} onChange={(e) => handleFilterChange('availability', e.target.value)} className="mr-2 text-primary-600 focus:ring-primary-500"/>
                  <span className="text-sm">Show All</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="availability" value="available" checked={activeFilters.availability === 'available'} onChange={(e) => handleFilterChange('availability', e.target.value)} className="mr-2 text-primary-600 focus:ring-primary-500"/>
                  <span className="text-sm">Available Now</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="availability" value="unavailable" checked={activeFilters.availability === 'unavailable'} onChange={(e) => handleFilterChange('availability', e.target.value)} className="mr-2 text-primary-600 focus:ring-primary-500"/>
                  <span className="text-sm">Unavailable</span>
                </label>
                {activeFilters.availability && (
                  <button onClick={() => handleFilterChange('availability', '')} className="flex items-center text-xs text-gray-500 hover:text-primary-600 mt-1">
                    <X size={12} className="mr-1" /> Clear availability
                  </button>
                )}
              </div>
            </div>

             <div className="mb-6">
              <h3 className="font-medium mb-2">Rating</h3>
              <div className="space-y-2">
                {['4', '3', '2', '1'].map((rating) => (
                  <label key={rating} className="flex items-center cursor-pointer">
                    <input type="radio" name="rating" value={rating} checked={activeFilters.rating === rating} onChange={(e) => handleFilterChange('rating', e.target.value)} className="mr-2 text-primary-600 focus:ring-primary-500"/>
                    <span className="text-sm">{rating}+ Stars</span>
                  </label>
                ))}
                {activeFilters.rating && (
                  <button onClick={() => handleFilterChange('rating', '')} className="flex items-center text-xs text-gray-500 hover:text-primary-600 mt-1" >
                    <X size={12} className="mr-1" /> Clear rating
                  </button>
                )}
              </div>
            </div>

            <button onClick={toggleFilter} className="w-full py-2 border border-gray-200 rounded-md text-center block md:hidden mt-4">
              Apply Filters
            </button>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="hidden md:flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Showing <span className="font-medium">{filteredProducts.length}</span> of {displayProducts.length} products
              </p>
              <div className="relative">
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="input appearance-none bg-white border border-gray-200 px-4 py-2 pr-8 rounded-md shadow-sm">
                  <option value="">Sort by</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                  <option value="rating-desc">Top Rated</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {Object.values(activeFilters).some(val => val !== '') && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(activeFilters).map(([key, value]) => {
                  if (!value || value === 'all' && key === 'availability') return null;

                  let label = '';
                  if (key === 'category') {
                    label = value;
                  } else if (key === 'priceRange') {
                     label = value.endsWith('-') ? `$${value.slice(0,-1)}+` : `$${value.split('-')[0]} - $${value.split('-')[1]}`;
                  } else if (key === 'availability') {
                    label = value === 'available' ? 'Available Now' : (value === 'unavailable' ? 'Unavailable' : '');
                  } else if (key === 'rating') {
                    label = `${value}+ Stars`;
                  }

                  if (!label) return null;

                  return (
                    <div key={key} className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm flex items-center">
                      <span>{label}</span>
                      <button onClick={() => handleFilterChange(key, '')} className="ml-2"><X size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 && !isLoading && !error ? (
              <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
                {Object.values(activeFilters).some(val => val !== '') && (
                    <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;