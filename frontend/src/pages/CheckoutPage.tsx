// frontend/src/pages/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, type CartItem as ContextCartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { ShopOrder, UserRental, OrderItem as TypeOrderItem, Shop } from '../types';
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer';
import { apiClient } from '../utils/apiClient';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart, isLoading: isCartContextLoading } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false); 
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  const [targetWhatsAppNumber, setTargetWhatsAppNumber] = useState<string>("6281234567890"); // GANTI DENGAN NOMOR ADMIN PLATFORM DEFAULT ANDA
  const [isFetchingShopPhone, setIsFetchingShopPhone] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || user.name?.split(' ')[0] || '',
        lastName: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      }));
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    const determineWhatsAppTarget = async () => {
      console.log("[CheckoutPage DEBUG] useEffect for items changed. RAW items from CartContext:", JSON.stringify(items, null, 2));
      
      if (items.length === 0) {
        setIsFetchingShopPhone(false); 
        if(!targetWhatsAppNumber || targetWhatsAppNumber === "6281234567890") { // Ganti nomor default jika perlu
             // console.log("[CheckoutPage DEBUG] Cart is empty. Using default/current WA target:", targetWhatsAppNumber);
        }
        return;
      }

      const firstItemProduct = items[0]?.product;
      console.log("[CheckoutPage DEBUG] determineWhatsAppTarget - First item's product object from CartContext items:", JSON.stringify(firstItemProduct, null, 2));

      // Mengambil shopId dari product.shopId atau product.owner.id
      const firstItemShopId = firstItemProduct?.shopId || firstItemProduct?.owner?.id;
      console.log("[CheckoutPage DEBUG] determineWhatsAppTarget - Extracted firstItemShopId:", firstItemShopId);

      if (!firstItemShopId || firstItemShopId.includes('unknown') || firstItemShopId.includes('default') || firstItemShopId.includes('MISSING')) {
          console.warn(`[CheckoutPage DEBUG] determineWhatsAppTarget - First item shopId is invalid or missing ('${firstItemShopId}'). Using default admin WA.`);
          setTargetWhatsAppNumber("6281234567890"); // GANTI nomor default
          setIsFetchingShopPhone(false);
          return;
      }

      const allItemsFromSameShop = items.every(
        item => (item.product?.shopId || item.product?.owner?.id) === firstItemShopId
      );
      console.log("[CheckoutPage DEBUG] determineWhatsAppTarget - All items from same shop:", allItemsFromSameShop);

      if (allItemsFromSameShop) {
        setIsFetchingShopPhone(true);
        console.log(`[CheckoutPage DEBUG] determineWhatsAppTarget - All items from same shop ID: ${firstItemShopId}. Fetching shop details...`);
        try {
          const shopDetails: Shop = await apiClient.get(`/shops/${firstItemShopId}/`);
          console.log("[CheckoutPage DEBUG] determineWhatsAppTarget - Shop details API response:", JSON.stringify(shopDetails, null, 2));
          // Gunakan 'phone_number' sesuai konvensi backend dan types.ts yang disarankan
          if (shopDetails && shopDetails.phone_number) { 
            let phoneNumber = shopDetails.phone_number.replace(/\D/g, '');
            if (phoneNumber.startsWith('0')) {
                phoneNumber = '62' + phoneNumber.substring(1);
            } else if (!phoneNumber.startsWith('62') && phoneNumber.length > 0) {
                phoneNumber = '62' + phoneNumber;
            }
            setTargetWhatsAppNumber(phoneNumber);
            console.log(`[CheckoutPage DEBUG] determineWhatsAppTarget - Shop WA number successfully set to: ${phoneNumber}`);
          } else {
            console.warn(`[CheckoutPage DEBUG] determineWhatsAppTarget - Field 'phone_number' not found or empty in API response for shop ${firstItemShopId}. Using default admin WA.`);
            setTargetWhatsAppNumber("6281234567890"); // GANTI nomor default
          }
        } catch (error) {
          console.error(`[CheckoutPage DEBUG] determineWhatsAppTarget - Error fetching shop details for WA number (shop ID: ${firstItemShopId}):`, error);
          setTargetWhatsAppNumber("6281234567890"); // GANTI nomor default
        } finally {
          setIsFetchingShopPhone(false);
        }
      } else { 
        console.log("[CheckoutPage DEBUG] determineWhatsAppTarget - Items from different shops. Using default admin WA number.");
        setTargetWhatsAppNumber("6281234567890"); // GANTI nomor default
        setIsFetchingShopPhone(false);
      }
    };

    determineWhatsAppTarget();
  }, [items]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const getRentalDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 1;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (start.toDateString() === end.toDateString()) { days = 1; } else { days +=1; }
      return Math.max(1, days);
    } catch (e) { console.error("Error parsing dates for rental days:", e); return 1; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[CheckoutPage DEBUG] handleSubmit called. Current targetWhatsAppNumber:", targetWhatsAppNumber, "FormData:", formData);
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.zip) {
      alert('Please fill in all contact and address details.'); return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) { alert('Please enter a valid email address.'); return; }
    const phoneDigits = formData.phone.replace(/\D/g,'');
    if (!/^(62|0)8[0-9]{7,15}$/.test(phoneDigits)) { 
        alert('Please enter a valid Indonesian phone number (e.g., 08xx, +628xx, 628xx).'); return;
    }
    if (isFetchingShopPhone) {
        alert('Still determining shop contact. Please wait a moment and try again.'); return;
    }

    setIsSubmitting(true);
    setIsProcessingOrder(true);
    console.log("[CheckoutPage DEBUG] Form submitted, processing order to save and then to WA...");
    
    let orderIdForWA = `ORD-WA-${Date.now().toString().slice(-6)}`; 

    await new Promise(resolve => setTimeout(resolve, 1000)); 

    if (user && items.length > 0) {
        const itemsByShop: { [shopId: string]: { shopName: string, items: ContextCartItem[], shopOrderRef?: string } } = {};
        for (const cartItem of items) {
            const shopId = cartItem.product.owner?.id || cartItem.product.shopId || 'unknown_shop';
            const shopName = cartItem.product.owner?.name || 'Unknown Shop';
            
            console.log(`[CheckoutPage DEBUG] handleSubmit - Processing cartItem.product.owner:`, cartItem.product.owner, `cartItem.product.shopId:`, cartItem.product.shopId, `Resolved shopId: ${shopId}`);

            if (!itemsByShop[shopId]) {
                itemsByShop[shopId] = { 
                    shopName, 
                    items: [],
                    shopOrderRef: `MELAR-${shopId.replace('unknown_shop_id_from_detail', 'UNKN').replace('MISSING_SHOP_ID_IN_PRODUCT_DETAIL_', 'MSID_').slice(0,10)}-${Date.now().toString().slice(-5)}`
                };
            }
            itemsByShop[shopId].items.push(cartItem);
        }
        
        Object.entries(itemsByShop).forEach(([shopId, shopData]) => {
            const shopOrder: ShopOrder = {
                id: shopData.shopOrderRef!,
                customerId: user.id,
                customerName: `${formData.firstName} ${formData.lastName}`.trim(),
                date: new Date().toISOString(),
                items: shopData.items.map((ci): TypeOrderItem => ({
                    productId: ci.product.id,
                    name: ci.product.name,
                    quantity: ci.quantity,
                    pricePerDay: ci.product.price,
                    image: ci.product.image,
                    startDate: ci.rentalPeriod.startDate,
                    endDate: ci.rentalPeriod.endDate,
                })),
                rentalPeriod: { 
                    startDate: shopData.items[0].rentalPeriod.startDate,
                    endDate: shopData.items[0].rentalPeriod.endDate,
                },
                shopId: shopId,
                status: 'pending_whatsapp', 
                total: shopData.items.reduce((sum, ci) => {
                    const days = getRentalDays(ci.rentalPeriod.startDate, ci.rentalPeriod.endDate);
                    return sum + (ci.product.price * ci.quantity * days);
                }, 0),
                shippingAddress: { ...formData }
            };
            orderIdForWA = shopOrder.id; 
            const shopOrdersKey = `${LOCAL_STORAGE_KEYS.SHOP_ORDERS_PREFIX}${shopId}`;
            const existingShopOrdersString = localStorage.getItem(shopOrdersKey);
            const currentShopOrders: ShopOrder[] = existingShopOrdersString ? JSON.parse(existingShopOrdersString) : [];
            currentShopOrders.push(shopOrder);
            localStorage.setItem(shopOrdersKey, JSON.stringify(currentShopOrders));
            console.log(`[CheckoutPage DEBUG] ShopOrder (localStorage) for shop ${shopId}:`, shopOrder);

            const userRentalsKey = `${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${user.id}`;
            const existingUserRentalsString = localStorage.getItem(userRentalsKey);
            const userRentals: UserRental[] = existingUserRentalsString ? JSON.parse(existingUserRentalsString) : [];
            const userRentalEntry: UserRental = {
                id: `RENT-${user.id.slice(-4)}-${Date.now()}-${shopOrder.items[0]?.productId.slice(-3) || 'ITEM'}`,
                orderId: shopOrder.id,
                product: shopOrder.items.map(it => it.name).join(', '),
                shopName: shopData.shopName,
                shopId: shopOrder.shopId,
                image: shopOrder.items[0]?.image || '',
                status: shopOrder.status,
                startDate: shopOrder.rentalPeriod.startDate,
                endDate: shopOrder.rentalPeriod.endDate,
                total: shopOrder.total,
                items: shopOrder.items, 
                customerId: user.id,
            };
            userRentals.push(userRentalEntry);
            localStorage.setItem(userRentalsKey, JSON.stringify(userRentals));
            console.log(`[CheckoutPage DEBUG] UserRental (localStorage) for user ${user.id}:`, userRentalEntry);

        });
    }
    
    let orderDetailsText = items.map((item, index) => {
        const pricePerDay = (item.product && typeof item.product.price === 'number') ? item.product.price : 0;
        const rentalDays = getRentalDays(item.rentalPeriod.startDate, item.rentalPeriod.endDate);
        const itemSubtotal = pricePerDay * Math.max(1, rentalDays) * item.quantity;
        return `${index + 1}. ${item.product?.name || 'Unknown Product'} (Toko: ${item.product?.owner?.name || 'N/A'})
   Kuantitas: ${item.quantity}
   Periode: ${format(new Date(item.rentalPeriod.startDate), 'dd MMM yy')} - ${format(new Date(item.rentalPeriod.endDate), 'dd MMM yy')} (${rentalDays} hari)
   Subtotal: Rp${itemSubtotal.toLocaleString('id-ID')},-`;
    }).join('\n\n');

    const message = `Halo,
Saya ingin mengonfirmasi pesanan dari Melar App dengan detail berikut:
Ref Pesanan (Lokal): ${orderIdForWA} 
Nama: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Telepon/WA: ${formData.phone}
Alamat Pengiriman: ${formData.address}, ${formData.city}, ${formData.state}, ${formData.zip}

Detail Pesanan:
${orderDetailsText}

Total Estimasi (sebelum ongkir/biaya lain): Rp${totalPrice.toLocaleString('id-ID')},- 

Mohon konfirmasi ketersediaan dan instruksi pembayaran selanjutnya.
Terima kasih!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${targetWhatsAppNumber}?text=${encodedMessage}`; 
    console.log("[CheckoutPage DEBUG] Final WhatsApp URL created:", whatsappUrl);
    
    window.open(whatsappUrl, '_blank');
    
    await clearCart(); 
    
    setTimeout(() => {
        setIsSubmitting(false);
        setIsProcessingOrder(false); 
        navigate('/whatsapp-order-sent');
    }, 500); 
  };
  
  const subtotal = totalPrice;
  const serviceFeePercentage = 0.05; 
  const taxPercentage = 0.10;
  const serviceFee = subtotal * serviceFeePercentage;
  const tax = subtotal * taxPercentage;
  const orderTotal = subtotal + serviceFee + tax;
  
  if (items.length === 0 && !isProcessingOrder) { 
    return ( 
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
        <ShoppingCart size={48} className="text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some items to your cart before proceeding.</p>
        <Link to="/products" className="btn-primary"> 
          Browse Products
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-6">
          <h1 className="text-2xl md:text-3xl font-bold">Confirm Your Order</h1>
        </div>
      </div>
      <div className="container-custom py-8">
        {isProcessingOrder && isSubmitting ? ( 
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center ring-4 ring-primary-200">
                    <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Processing Your Order...</h2>
                <p className="text-gray-600 mb-6">
                    Please wait while we prepare your order details. You will be redirected to WhatsApp shortly.
                </p>
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="font-semibold text-xl">Contact & Shipping Details</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input id="firstName" type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="input w-full" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="input w-full" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} required className="input w-full" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (WhatsApp)</label>
                      <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="input w-full" placeholder="e.g., 081234567890 or 6281234567890" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-3 text-gray-800">Shipping Address</h3>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <textarea id="address" name="address" value={formData.address} onChange={handleInputChange} required className="input w-full min-h-[80px]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input id="city" type="text" name="city" value={formData.city} onChange={handleInputChange} required className="input w-full" />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
                        <input id="state" type="text" name="state" value={formData.state} onChange={handleInputChange} required className="input w-full" />
                      </div>
                      <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
                        <input id="zip" type="text" name="zip" value={formData.zip} onChange={handleInputChange} required className="input w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isSubmitting || items.length === 0 || isCartContextLoading || isFetchingShopPhone}
                      className={`btn-primary w-full text-base py-3 flex items-center justify-center ${isSubmitting || items.length === 0 || isCartContextLoading || isFetchingShopPhone ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isFetchingShopPhone ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : (isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <MessageSquare size={18} className="mr-2" />)}
                      {isFetchingShopPhone ? 'Getting Contact...' : (isSubmitting ? 'Processing Order...' : `Confirm & Continue to WhatsApp ($${orderTotal.toFixed(2)})`)}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    You will be redirected to WhatsApp to finalize payment and order with our admin.
                  </p>
                </form>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="font-semibold text-xl mb-6">Order Summary</h2>
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                  {items.map((item) => {
                    const pricePerDay = (item.product && typeof item.product.price === 'number') ? item.product.price : 0;
                    const days = getRentalDays(item.rentalPeriod.startDate, item.rentalPeriod.endDate);
                    const itemTotal = pricePerDay * days * item.quantity;
                    return (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={item.product?.image || 'https://via.placeholder.com/96x96.png?text=No+Image'} 
                            alt={item.product?.name || 'Product'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{item.product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-gray-500">
                            {item.rentalPeriod.startDate ? format(new Date(item.rentalPeriod.startDate), 'MMM d, yy') : 'N/A'} - {item.rentalPeriod.endDate ? format(new Date(item.rentalPeriod.endDate), 'MMM d, yy') : 'N/A'} ({days} {days !== 1 ? 'days' : 'day'})
                          </p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-semibold whitespace-nowrap">${itemTotal.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 text-sm border-t pt-4 pb-4 border-b mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee ({ (serviceFeePercentage * 100).toFixed(0) }%)</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({ (taxPercentage * 100).toFixed(0) }%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;