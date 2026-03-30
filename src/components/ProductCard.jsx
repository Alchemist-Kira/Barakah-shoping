import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = forwardRef(({ product }, ref) => {

  const displayPrice = product.price || product.salePrice || product.regularPrice || 0;
  let displayImage = product.image || product.thumbnail || product.mainImage || 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
  if (displayImage.startsWith('/uploads')) {
    displayImage = `http://localhost:5000${displayImage}`;
  }

  const isOutOfStock = product.inStock === false || product.inStock === 0 || product.inStock === '0' || product.stockQuantity <= 0;

  return (
    <div className={`product-card group ${isOutOfStock ? 'out-of-stock-card' : ''}`} ref={ref}>
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div className="image-wrapper">
          <img src={displayImage} alt={product.name} className="product-image" loading="lazy" />
          
          {isOutOfStock ? (
            <div className="sold-out-badge" style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#EF4444', color: 'white', padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', zIndex: 5, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              SOLD OUT
            </div>
          ) : (
            <div className="overlay-actions">
              <button 
                className="add-btn"
                aria-label="View Details"
              >
                View Details
              </button>
            </div>
          )}
        </div>
      </Link>
      
      <div className="product-info">
        <Link to={`/product/${product.id}`} className="product-title-link">
          <h3 className="product-title">{product.name}</h3>
        </Link>
        
        <div className="product-price-container">
          {product.regularPrice && Number(product.regularPrice) > Number(product.salePrice) ? (
            <div className="price-group">
              <span className="price-sale">৳{Number(product.salePrice).toLocaleString()}</span>
              <span className="price-regular-struck">৳{Number(product.regularPrice).toLocaleString()}</span>
            </div>
          ) : (
            <span className="price-single">৳{Number(product.salePrice || product.regularPrice || product.price || 0).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
