import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ArrowLeft, Minus, Plus, ShoppingCart, ShieldCheck, Truck, X, Maximize2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import './ProductDetails.css';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [showColorWarning, setShowColorWarning] = useState(false);

  // Image Gallery States
  const [zoomProps, setZoomProps] = useState({ show: false, x: 0, y: 0 });
  const [activeImage, setActiveImage] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        // Map backend schema to frontend component expectations
        let imageList = [];
        if (data.images) {
          imageList = Array.isArray(data.images) ? data.images : JSON.parse(data.images);
        } else if (data.galleryImages) {
          imageList = Array.isArray(data.galleryImages) ? data.galleryImages : JSON.parse(data.galleryImages);
        }

        const mainImg = data.mainImage || (imageList.length > 0 ? imageList[0] : 'https://placehold.co/800x800/e2e8f0/64748b?text=No+Image');
        const finalMainImg = mainImg.startsWith('/uploads') ? `${mainImg}` : mainImg;

        const preparedImages = imageList.map(img => img.startsWith('/uploads') ? `${img}` : img);

        const sizesArr = typeof data.sizes === 'string' ? JSON.parse(data.sizes || '[]') : (data.sizes || []);
        const colorsArr = typeof data.colors === 'string' ? JSON.parse(data.colors || '[]') : (data.colors || []);

        setProduct({
          ...data,
          imagesList: preparedImages,
          price: data.salePrice || data.regularPrice,
          sizes: sizesArr,
          colors: colorsArr
        });
        setActiveImage(preparedImages[0] || finalMainImg);

        // Don't auto-select size anymore
        setSelectedSize(null);

        if (colorsArr.length > 0) setSelectedColor(colorsArr[0]);
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Hide Navbar when Lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.classList.add('lightbox-active');
    } else {
      document.body.classList.remove('lightbox-active');
    }

    return () => document.body.classList.remove('lightbox-active');
  }, [isLightboxOpen]);

  const handleDecreaseQuantity = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  const handleIncreaseQuantity = () => {
    if (quantity < 10) setQuantity(prev => prev + 1); // Mock limit of 10
  };

  const isOutOfStock = product && (product.inStock === false || product.inStock === 0 || product.inStock === '0' || product.stockQuantity <= 0);

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setShowSizeWarning(true);
      setTimeout(() => setShowSizeWarning(false), 2000);
      return;
    }

    setIsAdding(true);
    addToCart(product, quantity, { size: selectedSize, color: selectedColor });
    setTimeout(() => setIsAdding(false), 800);
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setShowSizeWarning(true);
      setTimeout(() => setShowSizeWarning(false), 2000);
      return;
    }

    addToCart(product, quantity, { size: selectedSize, color: selectedColor });
    navigate('/checkout');
  };

  // Hover Zoom Logic
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomProps({ show: true, x, y });
  };

  const handleMouseLeave = () => {
    setZoomProps({ show: false, x: 0, y: 0 });
  };

  const handleNextImage = (e) => {
    if (e) e.stopPropagation();
    if (!product || !product.imagesList || product.imagesList.length <= 1) return;
    const currentIndex = product.imagesList.indexOf(activeImage);
    const nextIndex = (currentIndex + 1) % product.imagesList.length;
    setActiveImage(product.imagesList[nextIndex]);
  };

  const handlePrevImage = (e) => {
    if (e) e.stopPropagation();
    if (!product || !product.imagesList || product.imagesList.length <= 1) return;
    const currentIndex = product.imagesList.indexOf(activeImage);
    const prevIndex = (currentIndex - 1 + product.imagesList.length) % product.imagesList.length;
    setActiveImage(product.imagesList[prevIndex]);
  };

  if (loading) {
    return <div className="loading-state container">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="not-found-state container">
        <h2>Product Not Found</h2>
        <p>The product you are looking for does not exist or has been removed.</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/store')}>
          Go to Store
        </button>
      </div>
    );
  }

  return (
    <div className="product-details-page container animate-fade-in">
      {/* Breadcrumb / Back button */}
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} /> Back
      </button>

      <div className="product-details-grid">
        {/* Image Gallery */}
        <div className="product-image-section">
          <div
            className="product-image-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              if (window.innerWidth <= 768) {
                setIsLightboxOpen(true);
              }
            }}
          >
            <img
              src={activeImage}
              alt={product.name}
              className="main-image"
              style={{
                transform: zoomProps.show ? 'scale(2.5)' : 'scale(1)',
                transformOrigin: `${zoomProps.x}% ${zoomProps.y}%`
              }}
            />

            {/* Navigation Arrows */}
            {product.imagesList && product.imagesList.length > 1 && (
              <>
                <button className="img-nav-btn prev" onClick={handlePrevImage}>
                  <ChevronLeft size={24} />
                </button>
                <button className="img-nav-btn next" onClick={handleNextImage}>
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            {/* Mobile Hint */}
            <div className="mobile-zoom-hint">
              <Search size={14} /> Tap to Zoom
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {product.imagesList && product.imagesList.length > 1 && (
            <div className="thumbnail-gallery-row">
              {product.imagesList.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail-square ${activeImage === img ? 'active' : ''}`}
                  onClick={() => setActiveImage(img)}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox / Fullscreen Zoom */}
        {isLightboxOpen && (
          <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-lightbox" onClick={() => setIsLightboxOpen(false)}>
                <X size={24} />
              </button>
              <TransformWrapper initialScale={1} minScale={1} maxScale={4}>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={activeImage} alt={product.name} className="lightbox-image" />
                </TransformComponent>
              </TransformWrapper>

              {/* Lightbox Navigation */}
              {product.imagesList && product.imagesList.length > 1 && (
                <>
                  <button className="lightbox-nav-btn prev" onClick={handlePrevImage}>
                    <ChevronLeft size={28} />
                  </button>
                  <button className="lightbox-nav-btn next" onClick={handleNextImage}>
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Product Info */}
        <div className="product-info-container">
          <div className="breadcrumbs">
            <Link to="/store">Store</Link> &gt;
            <Link to={`/store?category=${encodeURIComponent(product.category)}`}> {product.category}</Link> &gt;
            <span> {product.subcategory}</span>
          </div>

          <h1 className="product-title-large">{product.name}</h1>

          <div className="product-price-large" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
            {product.regularPrice && Number(product.regularPrice) > Number(product.salePrice) ? (
              <>
                <span className="sale-price-accent">৳ {Number(product.salePrice).toLocaleString()}</span>
                <span className="regular-price-struck">৳ {Number(product.regularPrice).toLocaleString()}</span>
              </>
            ) : (
              <span className="sale-price-accent">৳ {Number(product.salePrice || product.regularPrice).toLocaleString()}</span>
            )}
          </div>

          <div className="product-selection-controls">
            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="selector-group">
                <span className="selector-label">Color: {selectedColor ? selectedColor.split(' (')[0] : 'None'}</span>
                <div className="color-options">
                  {product.colors.map((color, idx) => {
                    const hexMatch = color.match(/\((#[a-fA-F0-9]+)\)/);
                    const hex = hexMatch ? hexMatch[1] : color.toLowerCase();
                    const colorName = color.split(' (')[0];
                    return (
                      <div
                        key={idx}
                        className={`color-dot-wrapper ${selectedColor === color ? 'active' : ''}`}
                        onClick={() => setSelectedColor(color)}
                        title={colorName}
                      >
                        <div className="color-dot" style={{ backgroundColor: hex }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className={`selector-group ${showSizeWarning ? 'shake' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="selector-label">Select Size: {selectedSize || 'None'}</span>
                  {showSizeWarning && <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: '600' }}> Please select a size</span>}
                </div>
                <div className="size-options">
                  {product.sizes.map((size, idx) => (
                    <div
                      key={idx}
                      className={`size-box ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedSize(size);
                        setShowSizeWarning(false);
                      }}
                    >
                      {size}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="product-actions" style={{ marginTop: '1rem' }}>
            {isOutOfStock ? (
              <button type="button" className="btn-out-of-stock" disabled>
                OUT OF STOCK
              </button>
            ) : (
              <>
                <div className="quantity-selector">
                  <span className="qty-label">Quantity:</span>
                  <div className="qty-controls">
                    <button type="button" className="qty-btn" onClick={handleDecreaseQuantity}>
                      <Minus size={16} />
                    </button>
                    <span className="qty-display">{quantity}</span>
                    <button type="button" className="qty-btn" onClick={handleIncreaseQuantity}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="action-buttons-container">
                  <button
                    className="btn-buy-now"
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </button>

                  <button
                    className={`btn-add-to-cart ${isAdding ? 'added' : ''}`}
                    onClick={handleAddToCart}
                  >
                    {isAdding ? 'Added to Cart' : 'Add to Cart'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="product-description" style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--secondary-color)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product Details</h3>
            <p style={{ color: 'var(--gray-text)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{product.description}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
