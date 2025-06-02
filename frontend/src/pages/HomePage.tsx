// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Store, Clock, Star, Loader2 } from 'lucide-react'; // Loader2 ditambahkan
import ProductCard from '../components/products/ProductCard';
import type { AppProduct, HomePageCategoryDisplay, Shop, Category as CategoryType } from '../types'; // CategoryType diimpor
import { apiClient } from '../utils/apiClient'; // apiClient diimpor
// Hapus: import { LOCAL_STORAGE_KEYS, initialGeneralProducts } from '../data/dummyDataInitializer';

// Definisikan categoryImageMap di sini.
const categoryImageMap: { [key: string]: string } = {
  'Electronics': 'https://images.pexels.com/photos/4602019/pexels-photo-4602019.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Photography': 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Outdoor Gear': 'https://images.pexels.com/photos/2666598/pexels-photo-2666598.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Tools & Equipment': 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Sports Equipment': 'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Clothing': 'https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Musical Instruments': 'https://images.pexels.com/photos/4087991/pexels-photo-4087991.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Party Supplies': 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Decorations': 'https://images.pexels.com/photos/271795/pexels-photo-271795.jpeg?auto=compress&cs=tinysrgb&w=600', // Contoh tambahan
  // Tambahkan kategori lain dan URL gambar yang sesuai
};

const HomePage: React.FC = () => {
  const [homePageCategories, setHomePageCategories] = useState<HomePageCategoryDisplay[]>([]);
  const [homePageFeaturedProducts, setHomePageFeaturedProducts] = useState<AppProduct[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomepageData = async () => {
      console.log("[HomePage DEBUG] Attempting to fetch homepage data...");
      // Fetch Categories (berdasarkan jumlah toko per kategori)
      setIsLoadingCategories(true);
      try {
        console.log("[HomePage DEBUG] Fetching all shops for category counts...");
        const allShopsFromApi: Shop[] = await apiClient.get('/shops/');
        console.log("[HomePage DEBUG] Shops fetched for category counts:", allShopsFromApi.length);

        const validShops = Array.isArray(allShopsFromApi) ? allShopsFromApi : [];
        const categoryCounts: { [key: string]: { id: string | number, name: string, count: number } } = {};

        validShops.forEach(shop => {
          if (Array.isArray(shop.categories)) {
            shop.categories.forEach((cat: CategoryType) => { // Eksplisit tipe CategoryType
              if (!categoryCounts[cat.name]) {
                categoryCounts[cat.name] = { id: cat.id, name: cat.name, count: 0 };
              }
              categoryCounts[cat.name].count++;
            });
          }
        });
        
        const processedCategories: HomePageCategoryDisplay[] = Object.values(categoryCounts)
          .map(catData => ({
            id: String(catData.id), // Gunakan ID dari kategori jika ada
            name: catData.name,
            count: catData.count, // Jumlah toko yang memiliki kategori tersebut
            image: categoryImageMap[catData.name] || 'https://via.placeholder.com/300x200.png?text=No+Image',
          }))
          .sort((a, b) => b.count - a.count) // Urutkan berdasarkan jumlah toko
          .slice(0, 4); // Ambil 4 kategori teratas

        setHomePageCategories(processedCategories);
        console.log("[HomePage DEBUG] Popular categories processed:", processedCategories);
      } catch (err: any) {
        console.error("[HomePage DEBUG] Error fetching shops for categories:", err);
        setError(prev => prev ? `${prev}\nFailed to load categories.` : 'Failed to load categories.');
      } finally {
        setIsLoadingCategories(false);
      }

      // Fetch Featured Products
      setIsLoadingProducts(true);
      try {
        console.log("[HomePage DEBUG] Fetching all products for featured section...");
        const allProductsFromApi: any[] = await apiClient.get('/products/'); // API mengembalikan any[]
        console.log("[HomePage DEBUG] Products fetched for featured section:", allProductsFromApi.length);

        const validProducts = Array.isArray(allProductsFromApi) ? allProductsFromApi : [];
        const processedProducts: AppProduct[] = validProducts.map(p => ({
            // Pemetaan seperti yang dilakukan di ProductDetailPage dan ProductsPage
            id: String(p.id),
            name: p.name || 'Unnamed Product',
            description: p.description || '',
            price: parseFloat(p.price as any),
            images: Array.isArray(p.images) ? p.images : [],
            category: p.category_name || p.category || 'Uncategorized',
            rating: parseFloat(p.rating as any) || 0,
            available: p.available !== undefined ? p.available : true,
            owner: p.owner_info ? { id: String(p.owner_info.id), name: p.owner_info.name } : { id: '', name: 'Unknown Shop' },
            shopId: String(p.shop_id || (p.owner_info ? p.owner_info.id : '')),
            total_individual_rentals: parseInt(p.total_individual_rentals as any, 10) || 0,
            status: p.status || (p.available ? 'available' : 'rented'),
            reviews: Array.isArray(p.reviews) ? p.reviews : [],
        }));

        let featured = processedProducts
          .filter(product => product.available && (product.rating || 0) >= 4.0) // Sedikit turunkan kriteria rating jika perlu
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 4);

        if (featured.length === 0 && processedProducts.length > 0) {
          // Fallback jika tidak ada yang rating tinggi, ambil 4 pertama yang tersedia
          featured = processedProducts.filter(p => p.available).slice(0, 4);
        }
        setHomePageFeaturedProducts(featured);
        console.log("[HomePage DEBUG] Featured products processed:", featured);
      } catch (err: any) {
        console.error("[HomePage DEBUG] Error fetching products for featured:", err);
        setError(prev => prev ? `${prev}\nFailed to load featured products.` : 'Failed to load featured products.');
      } finally {
        setIsLoadingProducts(false);
      }
      console.log("[HomePage DEBUG] Homepage data fetching finished.");
    };

    fetchHomepageData();
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  // JSX untuk render (struktur umumnya tetap sama, kita akan tambahkan handling loading/error)

  const renderCategories = () => {
    if (isLoadingCategories) return <div className="text-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" /> <p>Loading categories...</p></div>;
    if (!isLoadingCategories && homePageCategories.length === 0) return <p className="text-center text-gray-500">No popular categories to display yet.</p>;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {homePageCategories.map((category) => (
          <Link
            key={category.id}
            to={`/products?category=${encodeURIComponent(category.name)}`}
            className="group rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="relative h-40 md:h-48 bg-gray-200 overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 bg-white">
              <h3 className="font-semibold text-sm md:text-base text-gray-800">{category.name}</h3>
              {/* count sekarang adalah jumlah toko */}
              <p className="text-xs md:text-sm text-gray-500">{category.count} {category.count === 1 ? 'shop' : 'shops'}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderFeaturedProducts = () => {
    if (isLoadingProducts) return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" /> <p>Loading featured products...</p></div>;
    if (!isLoadingProducts && homePageFeaturedProducts.length === 0) return <p className="text-center text-gray-500">No featured products to display yet.</p>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {homePageFeaturedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product} // product sudah diproses dengan tipe yang benar
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-800 to-primary-600 text-white py-20 md:py-24">
        {/* ... (konten hero tetap sama) ... */}
         <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Rent What You Need, When You Need It
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">
              Find quality products for rent or start your own rental shop on Melar. The smart way to access what you need without the commitment of ownership.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products" className="bg-white text-primary-700 hover:bg-gray-100 font-semibold px-6 py-3 rounded-md transition-colors">
                Browse Products
              </Link>
              <Link to="/create-shop" className="bg-primary-700 text-white hover:bg-primary-800 font-semibold px-6 py-3 rounded-md transition-colors">
                Open Your Shop
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
          <div className="absolute right-0 top-1/4 w-32 h-32 rounded-full bg-white"></div>
          <div className="absolute right-24 top-1/2 w-16 h-16 rounded-full bg-white"></div>
          <div className="absolute right-12 bottom-1/4 w-24 h-24 rounded-full bg-white"></div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Popular Categories</h2>
          {error && !isLoadingCategories && <p className="text-center text-red-500 mb-4">Could not load categories: {error.includes('categories') ? error : ''}</p>}
          {renderCategories()}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        {/* ... (konten how it works tetap sama) ... */}
         <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">How Melar Works</h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Renting has never been easier. Follow these simple steps to get started with Melar.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse & Select</h3>
              <p className="text-gray-600">
                Search through thousands of quality products available for rent near you.
              </p>
            </div>
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Book & Rent</h3>
              <p className="text-gray-600">
                Choose your rental period and complete your booking with our secure payment system.
              </p>
            </div>
            <div className="text-center px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <Store className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Use & Return</h3>
              <p className="text-gray-600">
                Enjoy your rental during your booking period and return it when you're done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <Link to="/products" className="text-primary-600 hover:text-primary-700 font-medium">
              View All
            </Link>
          </div>
          {error && !isLoadingProducts && <p className="text-center text-red-500 mb-4">Could not load featured products: {error.includes('products') ? error : ''}</p>}
          {renderFeaturedProducts()}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white">
        {/* ... (konten trust badges tetap sama) ... */}
         <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Why Choose Melar</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Vetted Quality</h3>
              <p className="text-gray-600">
                All products on our platform meet rigorous quality standards to ensure a great rental experience.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <Star className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted Community</h3>
              <p className="text-gray-600">
                Our community of renters and shop owners is built on trust, reviews, and mutual respect.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                <Store className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Become a Shop Owner</h3>
              <p className="text-gray-600">
                Turn your idle items into income by creating your own rental shop on our platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-700 text-white py-16">
        {/* ... (konten CTA tetap sama) ... */}
         <div className="container-custom text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of users who are already enjoying the benefits of Melar's rental platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary-700 hover:bg-gray-100 font-semibold px-6 py-3 rounded-md transition-colors">
              Sign Up Now
            </Link>
            <Link to="/products" className="bg-primary-800 text-white hover:bg-primary-900 font-semibold px-6 py-3 rounded-md transition-colors">
              Explore Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;