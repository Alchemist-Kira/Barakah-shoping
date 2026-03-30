import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import './Home.css';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);

  // Prepared extended banners for seamless looping: [Last, ...Banners, First]
  const extendedBanners = banners.length > 1
    ? [banners[banners.length - 1], ...banners, banners[0]]
    : banners;

  // Sync slide position when banners load
  useEffect(() => {
    if (banners.length > 1) {
      // Start at 1 (the first real slide)
      setCurrentSlide(1);
      setIsTransitioning(false); // No animation on initial set
    }
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isDragging) return;
    const slideInterval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [banners.length, currentSlide, isDragging]);

  const handleNext = () => {
    if (banners.length <= 1) return;
    
    // Recovery: if stuck at the fake end slide, silently jump to the first real slide, then proceed
    if (currentSlide >= extendedBanners.length - 1) {
      setIsTransitioning(false);
      setCurrentSlide(1);
      // Require an execution frame to apply the silent jump before re-enabling transition
      setTimeout(() => {
        setIsTransitioning(true);
        setCurrentSlide(2);
      }, 50);
      return;
    }
    
    setIsTransitioning(true);
    setCurrentSlide(prev => prev + 1);
  };

  const handlePrev = () => {
    if (banners.length <= 1) return;
    
    // Recovery: if stuck at the fake start slide, silently jump to the last real slide, then proceed
    if (currentSlide <= 0) {
      setIsTransitioning(false);
      setCurrentSlide(banners.length);
      setTimeout(() => {
        setIsTransitioning(true);
        setCurrentSlide(banners.length - 1);
      }, 50);
      return;
    }

    setIsTransitioning(true);
    setCurrentSlide(prev => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (banners.length <= 1) return;

    // Step B: The Seamless Jump logic
    if (currentSlide === 0) {
      setIsTransitioning(false); 
      setCurrentSlide(banners.length); 
    } else if (currentSlide === banners.length + 1) {
      setIsTransitioning(false); 
      setCurrentSlide(1); 
    }
  };

  // Drag handlers
  const handleDragStart = (e) => {
    // If the user grabs while on a replica slide due to a missing transitionEnd,
    // seamlessly snap them back to the real slide before the drag moves.
    if (currentSlide >= extendedBanners.length - 1) {
      setCurrentSlide(1);
    } else if (currentSlide <= 0) {
      setCurrentSlide(banners.length);
    }
    
    setIsDragging(true);
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    setStartX(clientX);
    setIsTransitioning(false);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const currentOffset = clientX - startX;
    setDragOffset(currentOffset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 50; // min distance for swipe
    if (dragOffset < -threshold) {
      handleNext();
    } else if (dragOffset > threshold) {
      handlePrev();
    } else {
      setIsTransitioning(true);
    }
    setDragOffset(0);
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const prodRes = await fetch('/api/store/products?limit=8');
        const prodData = await prodRes.json();
        if (prodData.products) setFeaturedProducts(prodData.products);
      } catch (err) {
        console.error('Failed to fetch latest products', err);
      }

      try {
        const setRes = await fetch('/api/settings');
        const setData = await setRes.json();

        if (setData.categories) {
          setCategories(JSON.parse(setData.categories));
        }

        if (setData.banners) {
          setBanners(JSON.parse(setData.banners));
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    loadHomeData();
  }, []);

  return (
    <div className="home-page animate-fade-in">
      {/* Hero Slider Section */}
      {banners.length > 0 && (
        <section
          className="hero-slider"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div
            className="slider-track"
            style={{
              transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`,
              transition: isTransitioning ? 'transform 0.8s ease-in-out' : 'none'
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedBanners.map((banner, idx) => {
              const imgUrl = banner.image ? (banner.image.startsWith('http') || banner.image.startsWith('/images') ? banner.image : `${banner.image}`) : '';
              // A slide is "active" if it's the current slide OR if it's a replica of the current real slide
              const isActive = idx === currentSlide;

              return (
                <div
                  key={`${banner.id}-${idx}`}
                  className={`slide ${isActive ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${imgUrl})` }}
                  draggable={false}
                >
                  <div className="slide-content" style={{ pointerEvents: 'none' }}>
                    <h2 className="slide-title fade-in-up">{banner.title}</h2>
                    <p className="slide-subtitle fade-in-up">{banner.subtitle}</p>
                    {(banner.buttonText || banner.buttonLink) && (
                      <Link to={banner.buttonLink || '/store'} className="btn-primary slide-btn fade-in-up" style={{ pointerEvents: 'auto' }}>
                        {banner.buttonText || 'Shop Now'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Navigation Controls */}
          {banners.length > 1 && (
            <>
              <button className="carousel-control prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
                &#10094;
              </button>
              <button className="carousel-control next" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
                &#10095;
              </button>
              <div className="carousel-indicators">
                {banners.map((_, idx) => {
                  // real slide index runs from 1 to banners.length
                  let realIndex = currentSlide;
                  if (currentSlide === 0) realIndex = banners.length;
                  if (currentSlide === banners.length + 1) realIndex = 1;

                  return (
                    <button
                      key={idx}
                      className={`indicator ${realIndex === idx + 1 ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTransitioning(true);
                        setCurrentSlide(idx + 1);
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}

        </section>
      )}

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="categories-section container">
          <div className="section-header">
            <h2 className="title-main">Top Category</h2>
          </div>
          <div className="categories-grid">
            {categories.map((cat, index) => {
              const imgUrl = cat.image ? `${cat.image}` : null;
              return (
                <Link
                  key={cat.id || index}
                  to={`/store?category=${encodeURIComponent(cat.name)}`}
                  className="category-card"
                  style={imgUrl ? { backgroundImage: `url(${imgUrl})` } : {}}
                >
                  <div className="category-content">
                    <h3>{cat.name}</h3>
                    <span className="shop-link-text">Explore &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="featured-section container">
        <div className="section-header">
          <h2 className="title-main">Featured Collections</h2>
          <Link to="/store" className="view-all-link">View All &rarr;</Link>
        </div>
        <div className="products-grid">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

    </div>
  );
}
