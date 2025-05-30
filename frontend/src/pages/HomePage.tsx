// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Store, Clock, Star } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import type { AppProduct, HomePageCategoryDisplay, Shop } from '../types'; // Pastikan path ini benar
import { LOCAL_STORAGE_KEYS, initialGeneralProducts } from '../data/dummyDataInitializer'; // Pastikan path ini benar

// Definisikan categoryImageMap di sini. Ini adalah kunci untuk gambar kategori yang benar.
// Pastikan nama kategori di sini (sebagai key) SAMA PERSIS (case-sensitive)
// dengan nama kategori yang ada di data toko Anda.
const categoryImageMap: { [key: string]: string } = {
  'Electronics': 'https://images.pexels.com/photos/4602019/pexels-photo-4602019.jpeg?auto=compress&cs=tinysrgb&w=600', // Ganti dengan URL gambar elektronik yang sesuai
  'Photography': 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600', // Ganti dengan URL gambar fotografi yang sesuai
  'Outdoor Gear': 'https://images.pexels.com/photos/2666598/pexels-photo-2666598.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Tools & Equipment': 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Sports Equipment': 'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Clothing': 'https://images.pexels.com/photos/1342609/pexels-photo-1342609.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Musical Instruments': 'https://images.pexels.com/photos/4087991/pexels-photo-4087991.jpeg?auto=compress&cs=tinysrgb&w=600',
  'Party Supplies': 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600', // Contoh
  // Tambahkan kategori lain dan URL gambar yang sesuai
};

const HomePage: React.FC = () => {
  const [homePageCategories, setHomePageCategories] = useState<HomePageCategoryDisplay[]>([]);
  const [homePageFeaturedProducts, setHomePageFeaturedProducts] = useState<AppProduct[]>([]);

  useEffect(() => {
    // 1. Memuat dan memproses data toko untuk KATEGORI
    const shopsString = localStorage.getItem(LOCAL_STORAGE_KEYS.SHOPS);
    const allShops: Shop[] = shopsString ? JSON.parse(shopsString) : [];

    const categoryCounts: { [key: string]: number } = {};
    allShops.forEach(shop => {
      shop.categories.forEach(catName => {
        if (!categoryCounts[catName]) {
          categoryCounts[catName] = 0;
        }
        categoryCounts[catName]++;
      });
    });

    const processedCategories: HomePageCategoryDisplay[] = Object.entries(categoryCounts)
      .map(([name, count]) => ({
        id: name.replace(/\s+/g, '-').toLowerCase(),
        name: name,
        count: count, // Ini adalah jumlah toko yang memiliki kategori tersebut
        image: categoryImageMap[name] || 'https://via.placeholder.com/300x200.png?text=No+Image', // Gunakan gambar dari map, fallback ke placeholder
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); // Ambil 4 kategori teratas (atau sesuaikan)

    setHomePageCategories(processedCategories);

    // 2. Memuat dan memproses semua produk untuk PRODUK UNGGULAN
    const allProductsString = localStorage.getItem(LOCAL_STORAGE_KEYS.ALL_PRODUCTS);
    let allAvailableProducts: AppProduct[] = allProductsString ? JSON.parse(allProductsString) : [];
    
    if (allAvailableProducts.length === 0 && initialGeneralProducts) { // Pastikan initialGeneralProducts ada
        allAvailableProducts = [...initialGeneralProducts];
        const shopsForProductFallback: Shop[] = shopsString ? JSON.parse(shopsString) : [];
        shopsForProductFallback.forEach(shop => {
            const shopProductsKey = `${LOCAL_STORAGE_KEYS.SHOP_PRODUCTS_PREFIX}${shop.id}`;
            const productsString = localStorage.getItem(shopProductsKey);
            if (productsString) {
                const shopProducts: AppProduct[] = JSON.parse(productsString);
                shopProducts.forEach(sp => {
                    if (!allAvailableProducts.find(p => p.id === sp.id)) {
                        allAvailableProducts.push(sp);
                    }
                });
            }
        });
    }

    const featured = allAvailableProducts
      .filter(product => product.available && (product.rating || 0) >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);

    if (featured.length === 0 && allAvailableProducts.length > 0) {
        setHomePageFeaturedProducts(
            allAvailableProducts.filter(p => p.available).slice(0, 4)
        );
    } else if (featured.length === 0 && allAvailableProducts.length === 0) {
        setHomePageFeaturedProducts([]);
    }
    else {
        setHomePageFeaturedProducts(featured);
    }

  }, []);

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-800 to-primary-600 text-white py-20 md:py-24">
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
          {homePageCategories.length > 0 ? (
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
                    <p className="text-xs md:text-sm text-gray-500">{category.count} shops</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No categories to display yet. Create some shops and add products!</p>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
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
          
          {homePageFeaturedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homePageFeaturedProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    images: product.images, 
                    rating: product.rating || 0,
                    available: product.available,
                    category: product.category,
                  }} 
                />
              ))}
            </div>
          ) : (
             <p className="text-center text-gray-500">No featured products to display yet. Add some products to shops!</p>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-white">
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