// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import ShopsPage from './pages/ShopsPage';
import ShopDetailPage from './pages/ShopDetailPage';
import ShopCreationPage from './pages/ShopCreationPage';
import ShopDashboardPage from './pages/ShopDashboardPage';
import AddProductPage from './pages/AddProductPage'; // <-- TAMBAHKAN
import EditProductPage from './pages/EditProductPage'; // <-- TAMBAHKAN
import OrderDetailPage from './pages/OrderDetailPage'; // <-- TAMBAHKAN
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              <Route path="shops" element={<ShopsPage />} />
              <Route path="shops/:shopId" element={<ShopDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/orders/:orderId" element={<OrderDetailPage />} /> {/* Rute untuk detail pesanan buyer */}
              <Route path="create-shop" element={<ShopCreationPage />} />
              <Route path="shop-dashboard" element={<ShopDashboardPage />} />
              <Route path="shop-dashboard/add-product" element={<AddProductPage />} /> {/* Aktifkan */}
              <Route path="shop-dashboard/edit-product/:productId" element={<EditProductPage />} /> {/* Aktifkan */}
              <Route path="shop-dashboard/orders/:orderId" element={<OrderDetailPage />} /> {/* Rute untuk detail pesanan seller */}
              <Route path="register" element={<RegisterPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;