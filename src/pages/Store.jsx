import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Filter, X, Plus, Minus } from 'lucide-react';
import './Store.css';

let storePageCache = null;

export default function Store() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUrl = searchParams.toString();

  const isCacheHit = storePageCache && storePageCache.url === currentUrl;

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [absoluteMaxPrice, setAbsoluteMaxPrice] = useState(10000);

  const [products, setProducts] = useState(isCacheHit ? storePageCache.products : []);
  const [page, setPage] = useState(isCacheHit ? storePageCache.page : 1);
  const [hasMore, setHasMore] = useState(isCacheHit ? storePageCache.hasMore : false);
  const [isLoading, setIsLoading] = useState(!isCacheHit);
  
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  
  const querySearch = searchParams.get('search') || '';
  const queryCategory = searchParams.get('category') || '';
  const querySubcategory = searchParams.get('subcategory') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  // Cache Unmount Persistence
  const stateRef = useRef({ products, page, hasMore, url: currentUrl });
  useEffect(() => {
    stateRef.current = { products, page, hasMore, url: currentUrl };
  }, [products, page, hasMore, currentUrl]);

  useEffect(() => {
    if (isCacheHit && storePageCache.scrollY) {
      setTimeout(() => window.scrollTo(0, storePageCache.scrollY), 0);
    }
    return () => {
      // Upon unmount or reroute, persist current snapshot to cache
      storePageCache = { ...stateRef.current, scrollY: window.scrollY };
    };
  }, [isCacheHit]);

  // Observer Setup
  const observer = useRef();
  const isFetchingRef = useRef(false);

  const lastProductElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Sync Input States with Search Params
  useEffect(() => {
    if (minPrice) setMinPriceInput(minPrice);
    if (maxPrice) setMaxPriceInput(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    // Reset explicitly when navigating contexts
    if (!isCacheHit) {
      setPage(1);
      setProducts([]);
    }
  }, [currentUrl, isCacheHit]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.categories) setAllCategories(JSON.parse(data.categories));
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchMaxPrice = async () => {
      try {
        const res = await fetch('/api/store/products?limit=1000');
        const data = await res.json();
        const allProds = data.products || [];
        if (allProds.length > 0) {
          const max = Math.max(...allProds.map(p => Number(p.salePrice || p.regularPrice || p.price || 0)));
          setAbsoluteMaxPrice(Math.ceil(max / 50) * 50);
        }
      } catch(e) {}
    };
    fetchMaxPrice();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      // Do not re-fetch if restoring identically
      if (isCacheHit && page === storePageCache.page && products.length > 0) return;

      if (products.length === 0) setIsLoading(true);
      isFetchingRef.current = true;
      try {
        const queryParams = new URLSearchParams(currentUrl);
        queryParams.set('page', page);
        queryParams.set('limit', 12);

        const res = await fetch(`/api/store/products?${queryParams.toString()}`);
        const data = await res.json();
        
        if (!isMounted) return;

        let fetchedProducts = data.products || [];
        if (page === 1) {
          setProducts(fetchedProducts);
        } else {
          setProducts(prev => {
            const added = fetchedProducts.filter(fp => !prev.some(p => p.id === fp.id));
            return [...prev, ...added];
          });
        }
        
        setHasMore(data.page < data.totalPages);
      } catch (e) { console.error(e); } finally {
        if (isMounted) {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      }
    };
    fetchProducts();
    
    return () => { isMounted = false; };
  }, [page, currentUrl]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // If we're updating the category, clear the subcategory
    if (key === 'category') {
      newParams.delete('subcategory');
    }
    setSearchParams(newParams);
  };

  const handleSubcategoryClick = (catName, subName) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('category', catName);
    newParams.set('subcategory', subName);
    setSearchParams(newParams);
  };

  const handleCategoryClick = (catName) => {
    updateParam('category', catName);
    if (!expandedCategories.includes(catName)) {
      setExpandedCategories(prev => [...prev, catName]);
    }
  };

  const toggleExpand = (catName, e) => {
    e.stopPropagation();
    setExpandedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const applyPriceFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    if (minPriceInput) newParams.set('minPrice', minPriceInput);
    else newParams.delete('minPrice');
    
    if (maxPriceInput) newParams.set('maxPrice', maxPriceInput);
    else newParams.delete('maxPrice');
    
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setMinPriceInput('');
    setMaxPriceInput('');
  };

  const MAX_PRICE = absoluteMaxPrice;
  const currentMinPrice = minPriceInput === '' ? 0 : Number(minPriceInput);
  const currentMaxPrice = maxPriceInput === '' ? MAX_PRICE : Number(maxPriceInput);

  const leftPercent = (currentMinPrice / MAX_PRICE) * 100;
  const rightPercent = 100 - (currentMaxPrice / MAX_PRICE) * 100;

  return (
    <div className="store-page container animate-fade-in" style={{ paddingTop: '2rem' }}>
      <div className="store-header" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', borderBottom: '1px solid var(--gray-subtle)', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <div className="section-header" style={{ paddingTop: '1rem', marginBottom: '0', justifyContent: 'center', width: '100%' }}>
          <h1 className="title-main">
            {querySearch ? `Search: "${querySearch}"` : queryCategory || 'Store Collection'}
          </h1>
        </div>
        
        <div className="store-controls-row">
          <button 
            className="filter-options-btn mobile-filter-btn"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter size={18} /> Filter Options
          </button>

          <div className="sort-container">
            <span className="sort-label">Sort By:</span>
            <div className="sort-dropdown">
              <select 
                className="form-select"
                value={sortBy}
                onChange={(e) => updateParam('sortBy', e.target.value)}
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="store-layout" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <aside className={`store-sidebar ${isFilterOpen ? 'open' : ''}`} style={{ width: '250px', flexShrink: 0 }}>
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--secondary-color)', margin: 0 }}>Filters</h3>
            <button className="close-filter-btn" onClick={() => setIsFilterOpen(false)} style={{ display: 'none' }}>
              <X size={24} />
            </button>
          </div>
          
          <div className="filter-group" style={{ marginBottom: '2.5rem' }}>
            <h4 className="filter-title" style={{ fontSize: '0.9rem', marginBottom: '2rem', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Filter by Price</h4>
            
            <div className="dual-slider-container">
              <div className="slider-track-bg"></div>
              <div 
                className="slider-track-fill" 
                style={{ 
                  left: `${leftPercent}%`, 
                  right: `${rightPercent}%` 
                }}
              ></div>
              <input 
                type="range" 
                min="0" 
                max={MAX_PRICE} 
                step="50"
                value={currentMinPrice}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), currentMaxPrice - 50);
                  setMinPriceInput(val);
                }}
                onMouseUp={applyPriceFilter}
                onTouchEnd={applyPriceFilter}
                className="dual-slider min-slider"
              />
              <input 
                type="range" 
                min="0" 
                max={MAX_PRICE} 
                step="50"
                value={currentMaxPrice}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), currentMinPrice + 50);
                  setMaxPriceInput(val);
                }}
                onMouseUp={applyPriceFilter}
                onTouchEnd={applyPriceFilter}
                className="dual-slider max-slider"
              />
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#4B5563', fontSize: '0.9rem', fontWeight: '500' }}>
              Price: <span style={{ color: '#1A1A1A', fontWeight: '700' }}>{currentMinPrice} ৳</span> — <span style={{ color: '#1A1A1A', fontWeight: '700' }}>{currentMaxPrice} ৳</span>
            </div>
          </div>

          <div className="filter-group" style={{ marginBottom: '2rem' }}>
            <h4 className="filter-title" style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>Categories</h4>
            <ul className="filter-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <button 
                  className={`filter-btn ${!queryCategory ? 'active' : ''}`}
                  onClick={() => updateParam('category', '')}
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: !queryCategory ? 'rgba(184, 134, 11, 0.1)' : 'transparent', color: !queryCategory ? 'var(--primary-color)' : 'var(--gray-text)', fontWeight: !queryCategory ? '700' : '500' }}
                >
                  All Products
                </button>
              </li>
              {allCategories.map(cat => (
                <li key={cat.id || cat.name} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleCategoryClick(cat.name)}
                      style={{ flex: 1, textAlign: 'left', padding: '0.5rem', borderRadius: '4px', backgroundColor: queryCategory === cat.name ? 'rgba(184, 134, 11, 0.1)' : 'transparent', color: queryCategory === cat.name ? 'var(--primary-color)' : 'var(--gray-text)', fontWeight: queryCategory === cat.name ? '700' : '500' }}
                    >
                      {cat.name}
                    </button>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <button 
                        onClick={(e) => toggleExpand(cat.name, e)}
                        style={{ padding: '0.5rem', color: expandedCategories.includes(cat.name) ? 'var(--primary-color)' : 'var(--gray-text)' }}
                      >
                        {expandedCategories.includes(cat.name) ? <Minus size={16} /> : <Plus size={16} />}
                      </button>
                    )}
                  </div>
                  
                  {expandedCategories.includes(cat.name) && cat.subcategories && cat.subcategories.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: '0.5rem 0 0.5rem 1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '2px solid #E5E7EB', marginLeft: '0.75rem' }}>
                      {cat.subcategories.map(sub => (
                        <li key={sub}>
                          <button 
                            onClick={() => handleSubcategoryClick(cat.name, sub)}
                            style={{ textAlign: 'left', width: '100%', padding: '0.25rem 0.5rem', fontSize: '0.9rem', color: querySubcategory === sub ? 'var(--primary-color)' : 'var(--gray-text)', fontWeight: querySubcategory === sub ? '600' : '400' }}
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {(querySearch || queryCategory || querySubcategory || minPrice || maxPrice) && (
            <button 
              className="clear-filters-btn" 
              onClick={clearAllFilters}
              style={{ width: '100%', padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '4px', fontWeight: '600', marginTop: '1rem' }}
            >
              Clear All Filters
            </button>
          )}
        </aside>
        
        <main className="store-main" style={{ flex: 1 }}>
          {products.length === 0 && !isLoading ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ color: 'var(--secondary-color)', marginBottom: '1rem' }}>No products found</h2>
              <p style={{ color: 'var(--gray-text)' }}>Try adjusting your search or filters to find what you're looking for.</p>
              <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="results-count" style={{ marginBottom: '1.5rem', color: 'var(--gray-text)', fontSize: '0.9rem' }}>
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </div>
              <div className="products-grid-store">
                {products.map((product, index) => {
                  if (products.length === index + 1) {
                    return <ProductCard ref={lastProductElementRef} key={product.id} product={product} />;
                  } else {
                    return <ProductCard key={product.id} product={product} />;
                  }
                })}
              </div>
              
              {isLoading && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary-color)', fontWeight: '600' }}>
                  Loading...
                </div>
              )}
              
              {!hasMore && products.length > 0 && !isLoading && (
                <div style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem', color: 'var(--gray-text)', fontSize: '0.9rem' }}>
                  You've reached the end of the collection.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {isFilterOpen && (
        <div className="filter-overlay" onClick={() => setIsFilterOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} />
      )}
      <style>{`
        /* Mobile: Same Row, Filter Left, Sort Right */
        .store-controls-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 0.75rem;
          width: 100%;
        }

        .mobile-filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 0.5rem; /* Reduced horizontal padding to prevent overflow */
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          background-color: #FFFFFF;
          font-weight: 500;
          color: var(--text-dark);
          flex: 1; /* Split 50/50 */
          width: 0; /* Ensures identical basis */
          justify-content: center;
          font-size: 0.9rem;
          box-sizing: border-box;
        }

        .sort-container {
          display: flex;
          align-items: center;
          flex: 1; /* Split 50/50 */
          width: 0; /* Ensures identical basis */
          box-sizing: border-box;
        }

        .sort-label {
          display: none; 
        }

        .sort-dropdown {
          width: 100%;
          height: 100%;
        }

        .form-select {
          padding: 0.75rem 1.5rem 0.75rem 0.75rem;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          background-color: #FFFFFF;
          width: 100%;
          height: 100%;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234B5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
          background-size: 1rem;
          font-size: 0.9rem;
          color: var(--text-dark);
          box-sizing: border-box;
          text-align: center;
        }

        /* PC View: Stacked on Left (Sort top, Filter bottom) */
        @media (min-width: 768px) {
          .store-header {
            align-items: stretch !important;
          }

          .store-controls-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
          }

          .sort-container {
            flex: initial;
            width: auto;
            gap: 0.75rem; /* Increased gap based on reference */
          }

          .sort-label {
            display: block; /* Show "Sort By:" on PC */
            font-size: 1rem;
            color: #4B5563;
            font-weight: 400; /* Matching the weight in the image */
          }

          .sort-dropdown {
            width: 180px; /* More compact based on reference */
          }

          .form-select {
            padding: 0.6rem 2rem 0.6rem 0.85rem; /* Precise padding from reference */
            border: 1px solid #D1D5DB; /* Slightly more defined border */
            border-radius: 6px;
            color: #111827; /* Darker text from reference */
            background-position: right 0.5rem center;
            background-size: 0.9rem;
          }

          .mobile-filter-btn {
            flex: initial;
            width: auto;
            min-width: 200px; /* Matched to sort-dropdown width */
            order: 2; /* Filter on bottom on PC */
          }

          .sort-container {
            order: 1; /* Sort on top on PC */
          }
        }

        @media (max-width: 768px) {
          .store-layout { flex-direction: column; }
          .store-sidebar {
            position: fixed;
            top: 0; left: -100%; height: 100vh;
            background: white; z-index: 100;
            padding: 2rem; width: 80% !important; max-width: 300px;
            transition: left 0.3s ease;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          }
          .store-sidebar.open { left: 0; }
          .close-filter-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
