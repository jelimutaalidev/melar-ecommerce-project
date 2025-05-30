import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail, MapPin, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-xl font-bold text-white">Melar</span>
            </div>
            <p className="text-gray-400 mb-4">
              Your trusted platform for renting high-quality products and creating your own rental shop.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link to="/create-shop" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Create Shop
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin size={18} className="text-primary-400 mt-1 mr-2 flex-shrink-0" />
                <p className="text-gray-400">
                  123 Rental Street, Commerce City, Land of Rentals
                </p>
              </div>
              <div className="flex items-center">
                <Phone size={18} className="text-primary-400 mr-2 flex-shrink-0" />
                <p className="text-gray-400">+123 456 7890</p>
              </div>
              <div className="flex items-center">
                <Mail size={18} className="text-primary-400 mr-2 flex-shrink-0" />
                <p className="text-gray-400">support@melar.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Melar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;