import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { AppProduct } from '../../types'

interface ProductCardProps {
  product: AppProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200">
        <img 
          src={(product.images && product.images.length > 0 && product.images[0].image) ? product.images[0].image : 'https://via.placeholder.com/150.png?text=No+Image'} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
          {!product.available && (
            <div className="absolute top-0 right-0 m-2 px-2 py-1 bg-red-500 text-white text-xs rounded-md">
              Unavailable
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center mb-1">
            <span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-md">
              {product.category}
            </span>
            <div className="flex items-center ml-auto">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  className={`${
                    i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-200'
                  } fill-current`} 
                />
              ))}
              <span className="ml-1 text-xs text-gray-500">{product.rating.toFixed(1)}</span>
            </div>
          </div>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-primary-700 font-bold">${product.price.toFixed(2)}<span className="text-gray-500 font-normal text-sm"> / day</span></p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;