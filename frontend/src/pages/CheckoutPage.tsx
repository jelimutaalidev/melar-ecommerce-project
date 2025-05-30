// frontend/src/pages/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, type CartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import type { ShopOrder, UserRental, OrderItem } from '../types';
import { LOCAL_STORAGE_KEYS } from '../data/dummyDataInitializer';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: ''
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      }));
    }
  }, [user, isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setFormData(prev => ({ ...prev, [name]: formatted.slice(0, 19) }));
      return;
    }
    
    if (name === 'cardExpiry') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 2) {
        setFormData(prev => ({ ...prev, [name]: cleaned }));
      } else {
        const month = cleaned.slice(0, 2);
        const year = cleaned.slice(2, 4);
        setFormData(prev => ({ ...prev, [name]: `${month}/${year}` }));
      }
      return;
    }
     if (name === 'cardCvc') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '').slice(0, 3) }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.values(formData).some(value => value === '')) {
      alert('Please fill in all fields');
      return;
    }
    if (formData.cardNumber.replace(/\s/g, '').length < 13 || formData.cardNumber.replace(/\s/g, '').length > 16) {
        alert('Invalid card number length.');
        return;
    }
    if (!/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        alert('Invalid expiry date format. Use MM/YY.');
        return;
    }
    if (formData.cardCvc.length < 3) {
        alert('CVC must be at least 3 digits.');
        return;
    }
    
    setIsSubmitting(true);
    
    setTimeout(() => {
      if (user && items.length > 0) {
        const ordersByShop: { [ownerOrShopId: string]: ShopOrder } = {};

        items.forEach((cartItem: CartItem) => {
          const ownerId = cartItem.owner?.id || cartItem.shopId || 'unknown_seller';

          if (!ordersByShop[ownerId]) {
            ordersByShop[ownerId] = {
              id: `ORD-${ownerId.slice(-4)}-${Date.now()}`,
              customerId: user.id,
              customerName: `${formData.firstName} ${formData.lastName}`.trim(),
              date: new Date().toISOString(),
              items: [],
              rentalPeriod: { 
                startDate: cartItem.rentalPeriod.startDate,
                endDate: cartItem.rentalPeriod.endDate,
              },
              shopId: ownerId, 
              status: 'pending',
              total: 0,
              shippingAddress: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
              }
            };
          }

          const orderItem: OrderItem = {
            productId: cartItem.id,
            name: cartItem.name,
            quantity: cartItem.quantity,
            pricePerDay: cartItem.price,
            image: cartItem.image,
          };
          ordersByShop[ownerId].items.push(orderItem);
        });

        Object.values(ordersByShop).forEach(shopOrder => {
          shopOrder.total = shopOrder.items.reduce((sum, item) => {
            const start = new Date(shopOrder.rentalPeriod.startDate);
            const end = new Date(shopOrder.rentalPeriod.endDate);
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
                days = 1; // fallback
            }
            return sum + (item.pricePerDay * item.quantity * days);
          }, 0);

          const shopOrdersKey = `${LOCAL_STORAGE_KEYS.SHOP_ORDERS_PREFIX}${shopOrder.shopId}`;
          const existingShopOrdersString = localStorage.getItem(shopOrdersKey);
          const currentShopOrders: ShopOrder[] = existingShopOrdersString ? JSON.parse(existingShopOrdersString) : [];
          currentShopOrders.push(shopOrder);
          localStorage.setItem(shopOrdersKey, JSON.stringify(currentShopOrders));

          const userRentalsKey = `${LOCAL_STORAGE_KEYS.USER_RENTALS_PREFIX}${user.id}`;
          const existingUserRentalsString = localStorage.getItem(userRentalsKey);
          const userRentals: UserRental[] = existingUserRentalsString ? JSON.parse(existingUserRentalsString) : [];
          
          const relevantCartItemForShopName = items.find(ci => (ci.owner?.id || ci.shopId) === shopOrder.shopId);

          const userRentalEntry: UserRental = {
              id: `RENT-${user.id.slice(-4)}-${Date.now()}-${shopOrder.items[0]?.productId.slice(-3) || 'ITEM'}`,
              orderId: shopOrder.id,
              product: shopOrder.items.map(it => it.name).join(', '),
              shopName: relevantCartItemForShopName?.owner?.name || "Unknown Shop",
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
          console.log(`Rental history for user ${user.id} saved:`, userRentals);
        });
      }
      
      setIsSubmitting(false);
      setIsComplete(true);
      clearCart();
      
      setTimeout(() => {
        navigate('/profile', { state: { refreshRentals: true, tab: 'rentals' } });
      }, 3000);
    }, 1500);
  };
  
  const subtotal = totalPrice;
  const serviceFee = subtotal * 0.05;
  const tax = subtotal * 0.10;
  const orderTotal = subtotal + serviceFee + tax;
  
  if (items.length === 0 && !isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
        <ShoppingCart size={48} className="text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Add some items to your cart before checkout.</p>
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
          <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="container-custom py-8">
        {isComplete ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center ring-4 ring-primary-200">
              <CheckCircle size={32} className="text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Order Complete!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your rental. You will receive a confirmation email shortly (simulated).
            </p>
            <Link to="/" className="btn-primary">
              Return to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="font-semibold text-xl">Payment Details</h2>
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
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="input w-full" />
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-3 text-gray-800">Billing Address</h3>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input id="address" type="text" name="address" value={formData.address} onChange={handleInputChange} required className="input w-full" />
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
                  
                  <h3 className="font-semibold text-lg mb-3 text-gray-800">Payment Information</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                      <input id="cardName" type="text" name="cardName" value={formData.cardName} onChange={handleInputChange} required className="input w-full" />
                    </div>
                    <div>
                      <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                      <input id="cardNumber" type="text" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} maxLength={19} placeholder="xxxx xxxx xxxx xxxx" required className="input w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6">
                      <div>
                        <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input id="cardExpiry" type="text" name="cardExpiry" value={formData.cardExpiry} onChange={handleInputChange} placeholder="MM/YY" maxLength={5} required className="input w-full" />
                      </div>
                      <div>
                        <label htmlFor="cardCvc" className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                        <input id="cardCvc" type="text" name="cardCvc" value={formData.cardCvc} onChange={handleInputChange} maxLength={3} placeholder="123" required className="input w-full" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isSubmitting || items.length === 0}
                      className={`btn-primary w-full text-base py-3 ${isSubmitting || items.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Processing...' : `Pay $${orderTotal.toFixed(2)}`}
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    By completing this order, you agree to Melar's Terms of Service and Privacy Policy.
                  </p>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="font-semibold text-xl mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                  {items.map((item) => {
                    const start = new Date(item.rentalPeriod.startDate);
                    const end = new Date(item.rentalPeriod.endDate);
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
                    const itemTotal = item.price * days * item.quantity;
                    
                    return (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {format(start, 'MMM d')} - {format(end, 'MMM d')} ({days} {days > 1 ? 'days' : 'day'})
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
                    <span className="text-gray-600">Service Fee (5%)</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (10%)</span>
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