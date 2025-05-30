import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { format } from 'date-fns';

const CartPage: React.FC = () => {
  const { items, removeItem, updateQuantity, totalPrice } = useCart();
  const navigate = useNavigate();

  // Calculate rental duration in days for an item
  const getRentalDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate item total (price * days * quantity)
  const getItemTotal = (price: number, startDate: string, endDate: string, quantity: number) => {
    const days = getRentalDays(startDate, endDate);
    return price * Math.max(1, days) * quantity;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16 fade-in">
      <div className="bg-white border-b">
        <div className="container-custom py-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center">
            <ShoppingCart className="mr-3" />
            Your Cart
          </h1>
        </div>
      </div>

      <div className="container-custom py-8">
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <ShoppingBag size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Looks like you haven't added any items to rent yet.</p>
            <Link 
              to="/products" 
              className="btn-primary"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-lg">Cart Items ({items.length})</h2>
                </div>
                
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-24 h-24 bg-gray-100 rounded-md overflow-hidden mb-4 md:mb-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 md:ml-4">
                          <div className="flex flex-col md:flex-row md:justify-between">
                            <div>
                              <h3 className="font-medium">{item.name}</h3>
                              <p className="text-sm text-gray-500">
                                ${item.price.toFixed(2)} per day
                              </p>
                            </div>
                            
                            <div className="mt-2 md:mt-0 text-right">
                              <p className="font-bold">
                                ${getItemTotal(
                                  item.price, 
                                  item.rentalPeriod.startDate, 
                                  item.rentalPeriod.endDate, 
                                  item.quantity
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex flex-col md:flex-row md:justify-between md:items-center">
                            <div>
                              <p className="text-sm">
                                <span className="text-gray-600">Rental period:</span>{' '}
                                <span className="font-medium">
                                  {format(new Date(item.rentalPeriod.startDate), 'MMM dd, yyyy')} - {format(new Date(item.rentalPeriod.endDate), 'MMM dd, yyyy')}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600">
                                {getRentalDays(item.rentalPeriod.startDate, item.rentalPeriod.endDate)} days
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3 md:mt-0">
                              <div className="flex items-center">
                                <button 
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="w-8 h-8 rounded-md flex items-center justify-center border border-gray-300 text-gray-600 hover:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="mx-3">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded-md flex items-center justify-center border border-gray-300 text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                              
                              <button 
                                onClick={() => removeItem(item.id)}
                                className="ml-4 p-2 text-red-500 hover:text-red-600"
                              >
                                <Trash size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => navigate('/products')}
                className="mt-4 flex items-center text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft size={16} className="mr-1" />
                Continue Shopping
              </button>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
                
                <div className="space-y-3 text-sm border-b pb-4 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Fee</span>
                    <span>${(totalPrice * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>${(totalPrice * 0.1).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between font-bold mb-6">
                  <span>Total</span>
                  <span>${(totalPrice * 1.15).toFixed(2)}</span>
                </div>
                
                <Link
                  to="/checkout"
                  className="btn-primary w-full mb-3"
                >
                  Proceed to Checkout
                </Link>
                
                <p className="text-xs text-gray-500 text-center">
                  Secure payment powered by Stripe
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;