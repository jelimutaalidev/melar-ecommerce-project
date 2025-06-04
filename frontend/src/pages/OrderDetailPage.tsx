// frontend/src/pages/OrderDetailPage.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, Store as StoreIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ShopOrder, OrderItem, OrderStatus, AppProduct } from '../types';
import { format } from 'date-fns';
import { apiClient } from '../utils/apiClient';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const dateObj = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00Z');
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
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
    console.log(`[OrderDetailPage DEBUG] fetchOrderDetails: Fetching order details for ID: ${orderId}. Current user ID: ${user?.id}, User Shop ID from AuthContext: ${user?.shopId}`);

    try {
      const dataFromApi: any = await apiClient.get(`/orders/${orderId}/`);
      console.log("[OrderDetailPage DEBUG] fetchOrderDetails: Raw order data from API:", JSON.stringify(dataFromApi, null, 2));

      if (!isMountedRef.current) return;

      if (!dataFromApi || !dataFromApi.id) {
        throw new Error("Order not found or invalid data received from server.");
      }

      const processedItems: OrderItem[] = (dataFromApi.items || []).map((itemApi: any): OrderItem => {
        const productDetail = itemApi.product; 
        console.log(`[OrderDetailPage DEBUG] fetchOrderDetails - Processing itemApi.product (productDetail):`, JSON.stringify(productDetail, null, 2));
        return {
          productId: String(productDetail?.id || itemApi.product_id || ''), 
          name: productDetail?.name || itemApi.product_name || 'Unknown Item',
          quantity: parseInt(String(itemApi.quantity), 10) || 1,
          pricePerDay: parseFloat(String(itemApi.price_per_day_at_rental || productDetail?.price || 0)),
          image: productDetail?.main_image || itemApi.product_image || placeholderImage, 
          startDate: itemApi.start_date,
          endDate: itemApi.end_date,
          item_total: parseFloat(String(itemApi.item_total || 0)),
          product: productDetail as Partial<AppProduct> 
        };
      });
      
      console.log("[OrderDetailPage DEBUG] fetchOrderDetails: Processed items from API:", JSON.stringify(processedItems, null, 2));

      let primaryShopId = '';
      let primaryShopName = 'N/A';
      if (processedItems.length > 0 && processedItems[0].product) {
        const firstProductData = processedItems[0].product as any; 
        
        primaryShopId = String(firstProductData.shop_id || ''); 
        primaryShopName = firstProductData.shop_name || 'Unknown Shop';
        
        console.log(`[OrderDetailPage DEBUG] fetchOrderDetails: Extracted from first item's product: primaryShopId='${primaryShopId}', primaryShopName='${primaryShopName}'`);
        if (!primaryShopId) {
            console.warn(`[OrderDetailPage DEBUG] fetchOrderDetails: primaryShopId is empty. firstProductData was:`, JSON.stringify(firstProductData, null, 2));
        }
      } else {
        console.warn("[OrderDetailPage DEBUG] fetchOrderDetails: No processed items or first item has no product details to extract shopId/shopName.");
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
        console.log("[OrderDetailPage DEBUG] fetchOrderDetails: Mapped order set to state:", JSON.stringify(mappedOrder, null, 2));
      }
    } catch (err: any) {
      console.error("[OrderDetailPage DEBUG] fetchOrderDetails: Error fetching order details:", err.response?.data || err.message || err);
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
    if (isAuthenticated && user) { 
        fetchOrderDetails();
    } else if (!isAuthenticated && !isLoading) { 
        setError("User not authenticated. Please log in.");
        setIsLoading(false); 
        console.log("[OrderDetailPage DEBUG] useEffect: User not authenticated, not fetching details.");
    }
    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [orderId, isAuthenticated, user]); 


  const getStatusIconAndColorClass = (statusParam: OrderStatus | undefined) => {
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

  if (order && user) {
    console.log('%c[OrderDetailPage DEBUG] Role Check for UI Elements:', 'color: blue; font-weight: bold;');
    console.log('  User (from AuthContext):', JSON.stringify(user, null, 2));
    console.log('  Order (current state):', JSON.stringify(order, null, 2));
    console.log('  Values for Shop Owner UI condition:');
    console.log(`    user.shopId: '${user.shopId}' (type: ${typeof user.shopId})`);
    console.log(`    order.shopId: '${order.shopId}' (type: ${typeof order.shopId})`);
    console.log(`    user.hasShop: ${user.hasShop}`);
    const isShopOwnerOfThisOrder = user.shopId && order.shopId && String(user.shopId) === String(order.shopId) && user.hasShop;
    console.log('  Calculated isShopOwnerOfThisOrder:', isShopOwnerOfThisOrder);

    if (isShopOwnerOfThisOrder) {
      console.log('%c    DEBUG: Dropdown for shop owner SHOULD be visible.', 'color: green;');
    } else {
        if (!user.hasShop) {
            console.log('%c    DEBUG: User does not own a shop (user.hasShop is false). Dropdown NOT visible.', 'color: orange;');
        } else if (!user.shopId) {
            console.log('%c    DEBUG: User owns a shop, but user.shopId from AuthContext is missing/empty. Dropdown NOT visible.', 'color: orange;');
        } else if (!order.shopId) {
            console.log('%c    DEBUG: order.shopId (derived from order items) is missing/empty. Dropdown NOT visible.', 'color: orange;');
        } else if (String(user.shopId) !== String(order.shopId)) {
            console.log(`%c    DEBUG: User is a shop owner (AuthContext shopId: '${user.shopId}') but this order is for a different shop (order.shopId: '${order.shopId}'). Dropdown NOT visible.`, 'color: orange;');
        } else {
            console.log('%c    DEBUG: Some other reason shop owner UI is not visible. Check individual values.', 'color: red;');
        }
    }
    const isCustomer = user.id && order.customerId && String(user.id) === String(order.customerId);
    console.log('  Values for Customer UI condition:');
    console.log(`    user.id: '${user.id}' (type: ${typeof user.id})`);
    console.log(`    order.customerId: '${order.customerId}' (type: ${typeof order.customerId})`);
    console.log('  Calculated isCustomer:', isCustomer);

    if (isCustomer && (order.status === 'pending' || order.status === 'confirmed' || order.status === 'pending_whatsapp')) {
      console.log('%c    DEBUG: Cancel button for customer SHOULD be visible.', 'color: green;');
    } else if (isCustomer) {
      console.log(`%c    DEBUG: Customer is viewing, but order status ('${order.status}') does not allow cancellation. Cancel button NOT visible.`, 'color: orange;');
    }
  } else {
    console.log('[OrderDetailPage DEBUG] Role Check for UI Elements: Order or User object is not yet available.');
  }

  if (isLoading && !order && !error) {
    return <div className="container-custom py-10 text-center flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-10 w-10 animate-spin text-primary-600" /> <span className="ml-3 text-lg">Loading order details...</span></div>;
  }

  if (error && !isLoading) { 
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

  if (!order && !isLoading) { 
    return (
      <div className="container-custom py-10 text-center min-h-[calc(100vh-200px)] flex flex-col justify-center items-center">
        <Package size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Order Not Found</h2>
        <p className="text-gray-600 mt-2">The order details could not be retrieved or you do not have permission to view this order.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-6">Go Back</button>
      </div>
    );
  }
  
  if (!order) { 
      return <div className="container-custom py-10 text-center">Preparing order details...</div>;
  }

  const grandTotal = order.total_price;
  const shopIdForLink = order.shopId; 
  const shopNameDisplay = order.shopName; 

  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!order || !user || !(user.shopId && order.shopId && String(user.shopId) === String(order.shopId) && user.hasShop)) {
        console.error("[OrderDetailPage_StatusChange] Pre-condition for status change failed. User/Order data might be inconsistent.");
        return;
    }

    const newStatus = event.target.value as OrderStatus;
    const currentStatus = order.status;

    // Jika status baru sama dengan status saat ini, tidak perlu melakukan apa-apa
    if (newStatus === currentStatus) {
        console.log(`[OrderDetailPage_StatusChange] Status is already '${newStatus}'. No change needed.`);
        return;
    }

    const confirmChange = window.confirm(
        `Are you sure you want to change the order status from "${currentStatus.replace(/_/g, ' ')}" to "${newStatus.replace(/_/g, ' ')}"?`
    );

    if (confirmChange) {
        setIsLoading(true); 
        console.log(`[OrderDetailPage_StatusChange] Shop Owner (User ID: ${user?.id}, Shop ID: ${user?.shopId}) CONFIRMED change status for order ${order.id} (Order Shop ID: ${order.shopId}) to ${newStatus}`);
        try {
            await apiClient.patch(`/orders/${order.id}/`, { status: newStatus });
            alert(`Order status updated to ${newStatus}`);
            await fetchOrderDetails(); 
        } catch (statusError: any) {
             console.error("[OrderDetailPage_StatusChange_Error] Error updating status:", JSON.stringify(statusError.response?.data || statusError.message, null, 2));
             alert(`Failed to update status: ${statusError.response?.data?.detail || statusError.message}`);
             if (isMountedRef.current) {
                await fetchOrderDetails();
             }
        }
    } else {
        console.log(`[OrderDetailPage_StatusChange] Shop Owner CANCELED status change for order ${order.id} from ${currentStatus} to ${newStatus}`);
        // Karena <select> adalah komponen terkontrol, React akan merender ulang dengan order.status yang lama (dari state)
        // jika tidak ada perubahan state. Tidak perlu manipulasi event.target.value.
    }
  };


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
              <span className="ml-2">{order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ') : 'Unknown'}</span>
            </div>
          </div>

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
                let rentalDays = 1;
                if (itemStartDate && itemEndDate) {
                    const start = new Date(itemStartDate.includes('T') ? itemStartDate : itemStartDate + 'T00:00:00Z');
                    const end = new Date(itemEndDate.includes('T') ? itemEndDate : itemEndDate + 'T00:00:00Z');
                    if (end >= start) {
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    }
                }
                rentalDays = Math.max(1, rentalDays);
                const calculatedItemTotal = item.pricePerDay * item.quantity * rentalDays;

                return (
                    <div key={item.productId + '-' + index} className="flex items-start sm:items-center p-3 bg-gray-50 rounded-md flex-col sm:flex-row gap-3">
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
            {/* Customer Actions */}
            {user?.id && order.customerId && String(user.id) === String(order.customerId) && (
                <div className="flex flex-wrap gap-3">
                    {order.status === 'completed' && (
                        <button className="btn-primary text-sm">Write a Review for Products</button>
                    )}
                    {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'pending_whatsapp') && (
                        <button 
                            onClick={async () => {
                                console.log(`[OrderDetailPage_CancelClick] Attempting to cancel order ID: ${order.id}, Current status: ${order.status}`);
                                if(window.confirm("Are you sure you want to cancel this rental order?")) {
                                    setIsLoading(true); 
                                    console.log(`[OrderDetailPage_CancelConfirm] User confirmed cancellation for order ID: ${order.id}`);
                                    try {
                                        const cancelUrl = `/orders/${order.id}/cancel-order/`;
                                        console.log(`[OrderDetailPage_CancelAPI] Calling POST to: ${cancelUrl}`);
                                        const response = await apiClient.post(cancelUrl, {});
                                        console.log("[OrderDetailPage_CancelAPI] Response from cancel API:", JSON.stringify(response, null, 2));
                                        alert("Order cancelled successfully.");
                                        await fetchOrderDetails(); 
                                    } catch (cancelError: any) {
                                        console.error("[OrderDetailPage_CancelAPI_Error] Error cancelling order:", JSON.stringify(cancelError.response?.data || cancelError.message, null, 2));
                                        alert(`Failed to cancel order: ${cancelError.response?.data?.detail || cancelError.response?.data?.error || cancelError.message}`);
                                        if(isMountedRef.current) await fetchOrderDetails(); 
                                    } 
                                } else {
                                    console.log(`[OrderDetailPage_CancelClick] User declined cancellation for order ID: ${order.id}`);
                                }
                            }}
                            className="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                            disabled={isLoading} 
                        >
                            {isLoading && String(user.id) === String(order.customerId) ? <Loader2 className="animate-spin h-4 w-4 mr-1"/> : null} 
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
            
            {/* Shop Owner Actions */}
             {user?.shopId && order.shopId && String(user.shopId) === String(order.shopId) && user?.hasShop && (
                <select
                    value={order.status} 
                    onChange={handleStatusChange} 
                    className="input text-sm max-w-xs ml-auto" 
                    // PERBAIKAN: Hanya disable jika isLoading. Biarkan pengguna mengubah dari completed/cancelled jika mereka mau.
                    disabled={isLoading}
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
