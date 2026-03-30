import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { cartCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [expandedNavCategories, setExpandedNavCategories] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllSettings = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/settings');
        const data = await res.json();

        if (data.categories) setCategories(JSON.parse(data.categories));
        if (data.app_settings) setAppSettings(JSON.parse(data.app_settings));

      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    fetchAllSettings();
  }, []);

  const toggleNavExpand = (catName, e) => {
    e.preventDefault();
    setExpandedNavCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/store?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="navbar-wrapper">
      {appSettings?.announcement && (
        <div className="announcement-bar">
          <p>{appSettings.announcement}</p>
        </div>
      )}

      <div className="navbar">
        <div className="container navbar-container">

          {/* Mobile Menu Toggle */}
          <button className="mobile-toggle" onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false); }}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Search & Nav */}
          <nav className={`navbar-nav ${isMenuOpen ? 'open' : ''}`}>
            <ul className="nav-links">
              <li><Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link></li>
              <li><Link to="/store" onClick={() => setIsMenuOpen(false)}>Store</Link></li>


              {/* Dynamic categories for hamburger menu */}
              {categories.map(cat => (
                <li key={cat.name} className="mobile-only" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Link to={`/store?category=${encodeURIComponent(cat.name)}`} onClick={() => setIsMenuOpen(false)} style={{ flex: 1 }}>
                      {cat.name}
                    </Link>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <button onClick={(e) => toggleNavExpand(cat.name, e)} style={{ padding: '0.25rem 0.5rem', color: 'var(--primary-color)' }}>
                        {expandedNavCategories.includes(cat.name) ? <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-</span> : <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>+</span>}
                      </button>
                    )}
                  </div>
                  {expandedNavCategories.includes(cat.name) && cat.subcategories && cat.subcategories.length > 0 && (
                    <ul style={{ paddingLeft: '1.5rem', paddingTop: '1rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--gray-subtle)', marginTop: '0.5rem' }}>
                      {cat.subcategories.map(sub => (
                        <li key={sub}>
                          <Link to={`/store?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub)}`} onClick={() => setIsMenuOpen(false)} style={{ fontSize: '1.05rem', color: 'var(--gray-text)' }}>
                            {sub}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Logo (Centered on Desktop) */}
          <Link to="/" className="navbar-brand" onClick={() => setIsMenuOpen(false)}>
            {appSettings?.storeName || 'Barakah'}
          </Link>

          {/* Right Icons */}
          <div className="navbar-actions">
            {/* Desktop search input */}
            <form onSubmit={handleSearch} className="desktop-search-form">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-desktop"
              />
              <button type="submit" className="search-btn-desktop"><Search size={18} /></button>
            </form>

            {/* Mobile search icon */}
            <button className="action-btn mobile-search-icon" onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false); }}>
              <Search size={22} />
            </button>

            <Link to="/checkout" className="action-btn cart-btn">
              <ShoppingCart size={22} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Mobile Search Dropdown Overlay */}
        <div className={`mobile-search-dropdown ${isSearchOpen ? 'open' : ''}`}>
          <div className="container">
            <form onSubmit={handleSearch} className="mobile-dropdown-form">
              <input
                type="text"
                placeholder="Search Panjabis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-dropdown-input"
              />
              <button type="submit" className="mobile-dropdown-btn">SEARCH</button>
            </form>
          </div>
        </div>
      </div>

      {/* Backdrop Overlay for Mobile sidebar */}
      {isMenuOpen && (
        <div 
          className="navbar-overlay" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
}
