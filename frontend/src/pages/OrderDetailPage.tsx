// frontend/src/pages/OrderDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, MessageSquare, Store as StoreIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ShopOrder, UserRental } from '../types'; // OrderItem dihapus dari sini
import { format } from 'date-fns';

// ... (sisa kode fetchOrderDetail dan komponen tetap sama seperti sebelumnya) ...
// Pastikan mockOrders di fetchOrderDetail menggunakan struktur OrderItem yang benar
// jika Anda memodifikasinya di sini untuk pengujian.

const fetchOrderDetail = (orderId: string, userType: 'buyer' | 'seller', userId?: string | null, currentShopId?: string | null): ShopOrder | UserRental | null => {
    const mockShopOrders: ShopOrder[] = [
        { id: 'ORD-DASH-001', customerId: 'user_999_fani', customerName: 'Fani Penyewa', date: '2025-05-26', items: [{productId: 'prod_andi_dslr_001', name: 'Canon EOS 5D Mark IV', quantity: 1, pricePerDay: 150, image: 'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=600'}], shopId: currentShopId || 'shop_001_kamera', status: 'active', total: 150.00, rentalPeriod: {startDate: '2025-05-26', endDate: '2025-05-27'}},
        { id: 'ORD-DASH-002', customerId: 'user_002_budi_buyer_sim', customerName: 'Bambang Sewa', date: '2025-05-25', items: [{ productId: 'prod_citra_tent_001', name: 'Tenda Dome 6 Orang', quantity: 1, pricePerDay: 55, image: 'https://images.pexels.com/photos/1687845/pexels-photo-1687845.jpeg?auto=compress&cs=tinysrgb&w=600'}], shopId: currentShopId || 'shop_003_outdoor', status: 'completed', total: 55.00, rentalPeriod: {startDate: '2025-05-25', endDate: '2025-05-26'}},
    ];
    const mockUserRentals: UserRental[] = [
        { id: 'RENTAL-001', orderId: 'ORD-DASH-001', product: 'Canon EOS 5D Mark IV', shopName: 'Demo Lensa & Kamera', shopId: 'shop_001_kamera', image: 'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=600', status: 'active', startDate: '2025-05-26', endDate: '2025-05-27', total: 150.00, items: [{productId: 'prod_andi_dslr_001', name: 'Canon EOS 5D Mark IV', quantity: 1, pricePerDay: 150, image: 'https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=600'}], customerId: userId || 'user_999_fani' },
        { id: 'RENTAL-002', orderId: 'ORD-DASH-003-buyer', product: 'Professional DSLR Camera Kit', shopName: 'PhotoPro Shop', shopId: 'some_shop_id', image: 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600', status: 'cancelled', startDate: '2025-05-20', endDate: '2025-05-22', total: 90.00, items: [{productId: 'some_prod_id', name: 'Professional DSLR Camera Kit', quantity: 1, pricePerDay: 45, image: 'https://images.pexels.com/photos/243757/pexels-photo-243757.jpeg?auto=compress&cs=tinysrgb&w=600'}], customerId: userId || 'user_999_fani'},
    ];

    if (userType === 'seller' && currentShopId) {
        return mockShopOrders.find(o => o.id === orderId && o.shopId === currentShopId) || null;
    } else if (userType === 'buyer' && userId) {
        return mockUserRentals.find(r => r.orderId === orderId && r.customerId === userId) || null;
    }
    return null;
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [order, setOrder] = useState<ShopOrder | UserRental | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<'buyer' | 'seller' | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || !orderId) {
      navigate('/login');
      return;
    }

    const isSeller = user.hasShop && user.shopId;
    const type = isSeller ? 'seller' : 'buyer';
    setUserType(type);

    const fetchedOrder = fetchOrderDetail(orderId, type, user.id, user.shopId);
    setOrder(fetchedOrder);
    setIsLoading(false);
  }, [orderId, user, isAuthenticated, navigate]);

  const getStatusIconAndColorClass = (status: string | undefined) => {
    if (!status) return { icon: <Package size={16} className="mr-1 text-gray-700" />, colorClass: 'bg-gray-100 text-gray-700' };
    switch (status.toLowerCase()) {
      case 'active':
      case 'disewa':
      case 'confirmed':
        return { icon: <CheckCircle size={16} className="mr-1" />, colorClass: 'bg-green-100 text-green-700' };
      case 'completed':
      case 'selesai':
        return { icon: <CheckCircle size={16} className="mr-1" />, colorClass: 'bg-blue-100 text-blue-700' };
      case 'cancelled':
      case 'dibatalkan':
        return { icon: <XCircle size={16} className="mr-1" />, colorClass: 'bg-red-100 text-red-700' };
      case 'pending':
      case 'menunggu konfirmasi':
        return { icon: <AlertTriangle size={16} className="mr-1" />, colorClass: 'bg-yellow-100 text-yellow-700' };
      default:
        return { icon: <Package size={16} className="mr-1" />, colorClass: 'bg-gray-100 text-gray-700' };
    }
  };

  if (isLoading) {
    return <div className="container-custom py-10 text-center">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="container-custom py-10 text-center">
        <Package size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Order Not Found</h2>
        <p className="text-gray-600 mt-2">The order details could not be retrieved or you do not have permission to view this order.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-6">Go Back</button>
      </div>
    );
  }

  const isShopOrder = (ord: ShopOrder | UserRental): ord is ShopOrder => userType === 'seller' && 'customerName' in ord;
  const isUserRental = (ord: ShopOrder | UserRental): ord is UserRental => userType === 'buyer' && 'shopName' in ord;

  const commonDetails = {
    id: isShopOrder(order) ? order.id : order.orderId,
    status: order.status,
    total: order.total,
    items: order.items,
    rentalPeriod: isShopOrder(order) ? order.rentalPeriod : { startDate: order.startDate, endDate: order.endDate }
  };

  const shopIdForLink = isUserRental(order) ? order.shopId : (isShopOrder(order) ? order.shopId : undefined);


  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate(userType === 'seller' ? '/shop-dashboard' : '/profile', { state: { tab: userType === 'seller' ? 'orders' : 'rentals' }})}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to {userType === 'seller' ? 'Orders' : 'Rental History'}
          </button>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Order ID: {commonDetails.id}</h1>
              <p className="text-sm text-gray-500">
                Date: {format(new Date(isShopOrder(order) ? order.date : commonDetails.rentalPeriod.startDate), 'MMM dd, yyyy, HH:mm')}
              </p>
            </div>
            <div className={`flex items-center mt-3 sm:mt-0 px-3 py-1.5 rounded-full text-sm font-medium capitalize ${getStatusIconAndColorClass(commonDetails.status).colorClass}`}>
              {getStatusIconAndColorClass(commonDetails.status).icon}
              <span className="ml-2">{commonDetails.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">
                {isShopOrder(order) ? 'Customer Information' : 'Shop Information'}
              </h2>
              <div className="space-y-2 text-sm">
                {isShopOrder(order) && (
                  <>
                    <p><span className="font-medium">Name:</span> {order.customerName}</p>
                    {/* Tambahkan detail pelanggan lain jika tersedia, misalnya dari order.shippingAddress */}
                  </>
                )}
                {isUserRental(order) && (
                  <>
                    <p><span className="font-medium">Shop:</span>
                      {shopIdForLink ? (
                        <Link to={`/shops/${shopIdForLink}`} className="text-primary-600 hover:underline ml-1">
                           {order.shopName} <StoreIcon size={14} className="inline ml-1" />
                        </Link>
                      ) : (
                        <span className="ml-1">{order.shopName}</span>
                      )}
                    </p>
                    <p className="text-gray-500">Contact shop for pickup details.</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Rental Period</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Start:</span> {format(new Date(commonDetails.rentalPeriod.startDate), 'MMM dd, yyyy')}</p>
                <p><span className="font-medium">End:</span> {format(new Date(commonDetails.rentalPeriod.endDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Items Rented</h2>
            <div className="space-y-4">
              {commonDetails.items.map((item, index) => {
                const startDate = new Date(commonDetails.rentalPeriod.startDate);
                const endDate = new Date(commonDetails.rentalPeriod.endDate);
                const rentalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +1); // Ensure at least 1 day
                const itemTotal = item.pricePerDay * item.quantity * rentalDays;

                return (
                    <div key={item.productId + index} className="flex items-start sm:items-center p-3 bg-gray-50 rounded-md flex-col sm:flex-row">
                    <img
                        src={item.image || 'https://via.placeholder.com/64x64.png?text=N/A'}
                        alt={item.name}
                        className="w-20 h-20 sm:w-16 sm:h-16 object-cover rounded mr-0 mb-3 sm:mb-0 sm:mr-4"
                    />
                    <div className="flex-1">
                        <Link to={`/products/${item.productId}`} className="font-medium hover:text-primary-600">{item.name}</Link>
                        <p className="text-xs text-gray-600">Qty: {item.quantity} @ ${item.pricePerDay.toFixed(2)}/day</p>
                    </div>
                    <p className="text-sm font-semibold mt-2 sm:mt-0">${itemTotal.toFixed(2)}</p>
                    </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end items-center mb-2 text-sm">
              <span className="text-gray-600 mr-2">Subtotal:</span>
              <span className="font-semibold">${commonDetails.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-end items-center mb-2 text-sm">
              <span className="text-gray-600 mr-2">Service Fee (5%):</span>
              <span className="font-semibold">${(commonDetails.total * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-end items-center mb-4 text-sm">
              <span className="text-gray-600 mr-2">Tax (10%):</span>
              <span className="font-semibold">${(commonDetails.total * 0.10).toFixed(2)}</span>
            </div>
            <div className="flex justify-end items-center text-xl font-bold">
              <span className="text-gray-800 mr-2">Total:</span>
              <span>${(commonDetails.total * 1.15).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between gap-3">
            {userType === 'seller' && isShopOrder(order) && (
              <div className="flex flex-wrap gap-3">
                <select
                    defaultValue={order.status}
                    onChange={(e) => alert(`Status changed to ${e.target.value} (simulation)`)}
                    className="input text-sm max-w-xs"
                    disabled={order.status === 'completed' || order.status === 'cancelled'}
                >
                    <option value="pending">Pending Confirmation</option>
                    <option value="confirmed">Confirmed (Ready)</option>
                    <option value="active">Active (Rented Out)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                 <button className="btn-secondary text-sm flex items-center">
                  <MessageSquare size={16} className="mr-2" /> Contact Customer
                </button>
              </div>
            )}
             {userType === 'buyer' && isUserRental(order) && (
              <div className="flex flex-wrap gap-3">
                {shopIdForLink && (
                    <Link to={`/shops/${shopIdForLink}`} className="btn-secondary text-sm flex items-center">
                        <StoreIcon size={16} className="mr-2" /> View Shop
                    </Link>
                )}
                {order.status === 'completed' && (
                    <button className="btn-primary text-sm">Write a Review</button>
                )}
                {(order.status === 'pending' || order.status === 'confirmed') && (
                     <button className="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400">Cancel Rental</button>
                )}
              </div>
            )}
            <button onClick={() => window.print()} className="btn-secondary text-sm">Print Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;