import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 fade-in">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-primary-600 rounded-md flex items-center justify-center">
            <MapPin className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="text-5xl font-bold text-gray-900 mb-4">404</h2>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
          <Link to="/products" className="btn-secondary">
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;