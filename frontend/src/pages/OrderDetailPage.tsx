// frontend/src/pages/OrderDetailPage.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, Store as StoreIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ShopOrder, OrderItem, OrderStatus, User as AuthUserType } from '../types';
import { format } from 'date-fns';
import { apiClient } from '../utils/apiClient';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateObj = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return format(dateObj, 'PPpp');
};

const placeholderImage = 'https://via.placeholder.com/64x64.png?text=N/A';

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isMountedRef = useRef(true);

  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true); // State loading umum untuk fetch dan cancel
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    // ... (isi fungsi fetchOrderDetails sama seperti kode terakhir yang berhasil) ...
    if (!orderId) {
      if (isMountedRef.current) {
        setError("Order ID is missing.");
        setIsLoading(false);
      }
      return;
    }
    if (!isAuthenticated || !user) {
      if (isMountedRef.current) {
        setError("You need to be logged in to view order details.");
        setIsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    console.log(`[OrderDetailPage] Fetching order details for ID: ${orderId}`);

    try {
      const dataFromApi: any = await apiClient.get(`/orders/${orderId}/`);
      console.log("[OrderDetailPage] Raw order data from API:", JSON.stringify(dataFromApi, null, 2));

      if (!isMountedRef.current) return;

      if (!dataFromApi || !dataFromApi.id) {
        throw new Error("Order not found or invalid data received from server.");
      }

      const processedItems: OrderItem[] = (dataFromApi.items || []).map((itemApi: any): OrderItem => ({
        productId: String(itemApi.product?.id || itemApi.product_id || ''),
        name: itemApi.product_name || itemApi.product?.name || 'Unknown Item',
        quantity: parseInt(String(itemApi.quantity), 10) || 1,
        pricePerDay: parseFloat(String(itemApi.price_per_day_at_rental || itemApi.product?.price || 0)),
        image: itemApi.product_image || itemApi.product?.main_image || itemApi.product?.images?.[0] || placeholderImage,
        startDate: itemApi.start_date,
        endDate: itemApi.end_date,
        item_total: parseFloat(String(itemApi.item_total || 0)),
        product: itemApi.product
      }));

      let primaryShopId = '';
      let primaryShopName = 'N/A';
      if (processedItems.length > 0 && processedItems[0].product) {
        primaryShopId = String(processedItems[0].product.shopId || processedItems[0].product.owner?.id || '');
        primaryShopName = processedItems[0].product.shop_name || processedItems[0].product.owner?.name || 'Unknown Shop';
      }

      const mappedOrder: ShopOrder = {
        id: String(dataFromApi.id),
        items: processedItems,
        total_price: parseFloat(String(dataFromApi.total_price)) || 0,
        status: dataFromApi.status as OrderStatus,
        date: dataFromApi.created_at || dataFromApi.date,
        first_name: dataFromApi.first_name,
        last_name: dataFromApi.last_name,
        email_at_checkout: dataFromApi.email_at_checkout,
        phone_at_checkout: dataFromApi.phone_at_checkout,
        billing_address: dataFromApi.billing_address,
        billing_city: dataFromApi.billing_city,
        billing_state: dataFromApi.billing_state,
        billing_zip: dataFromApi.billing_zip,
        payment_reference: dataFromApi.payment_reference,
        created_at: dataFromApi.created_at,
        updated_at: dataFromApi.updated_at,
        user: dataFromApi.user ? {
          id: String(dataFromApi.user.id),
          name: `${dataFromApi.user.first_name || ''} ${dataFromApi.user.last_name || ''}`.trim() || dataFromApi.user.username,
          email: dataFromApi.user.email,
          first_name: dataFromApi.user.first_name,
          last_name: dataFromApi.user.last_name,
          hasShop: dataFromApi.user.profile?.has_shop || false,
        } : undefined,
        customerId: String(dataFromApi.user?.id || ''),
        customerName: dataFromApi.user?.username || `${dataFromApi.first_name || ''} ${dataFromApi.last_name || ''}`.trim() || 'N/A',
        shopId: primaryShopId,
        shopName: primaryShopName,
        rentalPeriod: dataFromApi.rentalPeriod || (processedItems.length > 0 ?
          { startDate: processedItems[0].startDate || '', endDate: processedItems[0].endDate || '' } :
          { startDate: '', endDate: ''}),
      };
      if (isMountedRef.current) {
        setOrder(mappedOrder);
      }
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      if (isMountedRef.current) {
        setError(err.response?.data?.detail || err.message || "Failed to load order details.");
        setOrder(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [orderId, user, isAuthenticated]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchOrderDetails();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchOrderDetails]);


  const getStatusIconAndColorClass = (statusParam: OrderStatus | undefined) => {
    // ... (isi fungsi getStatusIconAndColorClass sama seperti kode terakhir yang berhasil) ...
    const status = statusParam || 'unknown';
    switch (status.toLowerCase()) {
      case 'active':
      case 'rented_out':
      case 'confirmed':
        return { icon: <CheckCircle size={16} className="mr-1 text-green-600" />, colorClass: 'bg-green-100 text-green-700' };
      case 'completed':
        return { icon: <CheckCircle size={16} className="mr-1 text-blue-600" />, colorClass: 'bg-blue-100 text-blue-700' };
      case 'cancelled':
        return { icon: <XCircle size={16} className="mr-1 text-red-600" />, colorClass: 'bg-red-100 text-red-700' };
      case 'pending':
      case 'pending_whatsapp':
        return { icon: <AlertTriangle size={16} className="mr-1 text-yellow-600" />, colorClass: 'bg-yellow-100 text-yellow-700' };
      default:
        return { icon: <Package size={16} className="mr-1 text-gray-700" />, colorClass: 'bg-gray-100 text-gray-700' };
    }
  };

  if (isLoading && !order && !error) { // Hanya tampilkan loading utama jika order belum ada dan tidak ada error
    return <div className="container-custom py-10 text-center flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-10 w-10 animate-spin text-primary-600" /> <span className="ml-3 text-lg">Loading order details...</span></div>;
  }

  if (error && !isLoading) { // Tampilkan error hanya jika loading selesai
    return (
      <div className="container-custom py-10 text-center min-h-[calc(100vh-200px)] flex flex-col justify-center items-center">
        <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-600">Error Loading Order</h2>
        <p className="text-gray-600 mt-2 mb-4">{error}</p>
        <button onClick={fetchOrderDetails} className="btn-primary mr-2">Try Again</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Go Back</button>
      </div>
    );
  }

  if (!order && !isLoading) { // Tampilkan "Order Not Found" hanya jika loading selesai dan tidak ada order
    return (
      <div className="container-custom py-10 text-center min-h-[calc(100vh-200px)] flex flex-col justify-center items-center">
        <Package size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Order Not Found</h2>
        <p className="text-gray-600 mt-2">The order details could not be retrieved or you do not have permission to view this order.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-6">Go Back</button>
      </div>
    );
  }
  
  // Jika order ada, tampilkan detailnya, isLoading bisa true jika sedang ada proses lain seperti cancel
  if (!order) { // Fallback jika order masih null setelah kondisi di atas
      return <div className="container-custom py-10 text-center">Preparing order details...</div>;
  }


  const grandTotal = order.total_price;
  const shopIdForLink = order.shopId;
  const shopNameDisplay = order.shopName;

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-3">
          <button
            onClick={() => navigate(user?.hasShop && location.pathname.includes('shop-dashboard') ? '/shop-dashboard' : '/profile', { state: { tab: user?.hasShop && location.pathname.includes('shop-dashboard') ? 'orders' : 'rentals' }})}
            className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to {user?.hasShop && location.pathname.includes('shop-dashboard') ? 'Shop Orders' : 'My Rentals'}
          </button>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Order ID: {order.id}</h1>
              <p className="text-sm text-gray-500">
                Date: {formatDate(order.date || order.created_at)}
              </p>
            </div>
            <div className={`flex items-center mt-3 sm:mt-0 px-3 py-1.5 rounded-full text-sm font-medium capitalize ${getStatusIconAndColorClass(order.status).colorClass}`}>
              {getStatusIconAndColorClass(order.status).icon}
              <span className="ml-2">{order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ') : 'Unknown'}</span>
            </div>
          </div>

          {/* ... (JSX untuk Billing & Contact Information, Overall Rental Period, Items Rented, Grand Total SAMA seperti kode terakhir yang berhasil) ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-3">Billing & Contact Information</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {order.first_name || order.customerName} {order.last_name}</p>
                <p><span className="font-medium">Email:</span> {order.email_at_checkout}</p>
                <p><span className="font-medium">Phone:</span> {order.phone_at_checkout}</p>
                <p><span className="font-medium">Address:</span>
                  {order.billing_address}, {order.billing_city}, {order.billing_state} {order.billing_zip}
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">Overall Rental Period</h2>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Start:</span> {formatDate(order.rentalPeriod?.startDate)}</p>
                <p><span className="font-medium">End:</span> {formatDate(order.rentalPeriod?.endDate)}</p>
              </div>
               {shopIdForLink && shopNameDisplay && (
                <div className="mt-4">
                    <h3 className="text-md font-semibold mb-1">Shop Information</h3>
                    <p className="text-sm">
                        <span className="font-medium">Shop:</span>
                        <Link
                            to={`/shops/${shopIdForLink}`}
                            className="text-primary-600 hover:underline ml-1"
                        >
                            {shopNameDisplay} <StoreIcon size={14} className="inline ml-1" />
                        </Link>
                    </p>
                    <p className="text-xs text-gray-500">Contact shop for pickup/return details if needed.</p>
                </div>
               )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Items Rented</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const itemStartDate = item.startDate || order.rentalPeriod?.startDate;
                const itemEndDate = item.endDate || order.rentalPeriod?.endDate;
                const rentalDays = (itemStartDate && itemEndDate && new Date(itemEndDate) >= new Date(itemStartDate)) 
                                   ? Math.max(1, Math.ceil((new Date(itemEndDate).getTime() - new Date(itemStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) 
                                   : 1;
                const calculatedItemTotal = item.pricePerDay * item.quantity * rentalDays;

                return (
                    <div key={item.productId + index} className="flex items-start sm:items-center p-3 bg-gray-50 rounded-md flex-col sm:flex-row gap-3">
                    <img
                        src={item.image || placeholderImage}
                        alt={item.name}
                        className="w-20 h-20 sm:w-16 sm:h-16 object-cover rounded mr-0 mb-2 sm:mb-0 sm:mr-4 bg-gray-200"
                    />
                    <div className="flex-1">
                        <Link to={`/products/${item.productId}`} className="font-medium hover:text-primary-600">{item.name}</Link>
                        <p className="text-xs text-gray-600">Qty: {item.quantity} @ ${item.pricePerDay.toFixed(2)}/day</p>
                        <p className="text-xs text-gray-500">Period: {formatDate(itemStartDate)} to {formatDate(itemEndDate)} ({rentalDays} days)</p>
                    </div>
                    <p className="text-sm font-semibold mt-2 sm:mt-0">${(item.item_total || calculatedItemTotal).toFixed(2)}</p>
                    </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end items-center text-xl font-bold">
              <span className="text-gray-800 mr-2">Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
            {user?.id === order.customerId && (
                <div className="flex flex-wrap gap-3">
                    {order.status === 'completed' && (
                        <button className="btn-primary text-sm">Write a Review for Products</button>
                    )}
                    {/* --- BAGIAN CANCEL ORDER DENGAN DEBUGGING --- */}
                    {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'pending_whatsapp') && (
                        <button 
                            onClick={async () => {
                                console.log(`[OrderDetailPage_CancelClick] Attempting to cancel order ID: ${order.id}, Current status: ${order.status}`);
                                if(window.confirm("Are you sure you want to cancel this rental order?")) {
                                    setIsLoading(true); // Menandakan proses sedang berjalan
                                    console.log(`[OrderDetailPage_CancelConfirm] User confirmed cancellation for order ID: ${order.id}`);
                                    try {
                                        const cancelUrl = `/orders/${order.id}/cancel-order/`;
                                        console.log(`[OrderDetailPage_CancelAPI] Calling POST to: ${cancelUrl}`);
                                        
                                        const response = await apiClient.post(cancelUrl, {}); // Kirim objek kosong jika tidak ada body
                                        
                                        console.log("[OrderDetailPage_CancelAPI] Response from cancel API:", JSON.stringify(response, null, 2));
                                        alert("Order cancelled successfully.");
                                        fetchOrderDetails(); // Panggil fungsi fetch lagi untuk update status
                                    } catch (cancelError: any) {
                                        console.error("[OrderDetailPage_CancelAPI_Error] Error cancelling order:", JSON.stringify(cancelError.response?.data || cancelError.message, null, 2));
                                        alert(`Failed to cancel order: ${cancelError.response?.data?.detail || cancelError.response?.data?.error || cancelError.message}`);
                                    } finally {
                                        if (isMountedRef.current) { // Cek isMountedRef sebelum update state
                                            setIsLoading(false);
                                        }
                                    }
                                } else {
                                    console.log(`[OrderDetailPage_CancelClick] User declined cancellation for order ID: ${order.id}`);
                                }
                            }}
                            className="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                            disabled={isLoading} // Dinonaktifkan saat loading umum atau proses cancel
                        >
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-1"/> : null}
                            Cancel Rental
                        </button>
                    )}
                     {shopIdForLink && (
                        <Link to={`/shops/${shopIdForLink}`} className="btn-secondary text-sm flex items-center">
                            <StoreIcon size={16} className="mr-2" /> View Shop
                        </Link>
                    )}
                </div>
            )}
             {user?.shopId === order.shopId && user?.hasShop && (
                <select
                    value={order.status}
                    onChange={async (e) => {
                        const newStatus = e.target.value as OrderStatus;
                        setIsLoading(true); // Menandakan proses
                        console.log(`[OrderDetailPage_StatusChange] Attempting to change status for order ${order.id} to ${newStatus}`);
                        try {
                            await apiClient.patch(`/orders/${order.id}/`, { status: newStatus });
                            alert(`Order status updated to ${newStatus}`);
                            fetchOrderDetails();
                        } catch (statusError: any) {
                             console.error("[OrderDetailPage_StatusChange_Error] Error updating status:", JSON.stringify(statusError.response?.data || statusError.message, null, 2));
                             alert(`Failed to update status: ${statusError.response?.data?.detail || statusError.message}`);
                        } finally {
                            if (isMountedRef.current) {
                                setIsLoading(false);
                            }
                        }
                    }}
                    className="input text-sm max-w-xs"
                    disabled={order.status === 'completed' || order.status === 'cancelled' || isLoading}
                >
                    <option value="pending_whatsapp">Pending WhatsApp</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="confirmed">Confirmed (Ready)</option>
                    <option value="active">Active (Rented Out)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
             )}
            <button onClick={() => window.print()} className="btn-secondary text-sm">Print Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;