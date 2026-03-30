import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, X, Image as ImageIcon, Box, DollarSign, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

let adminProductsCache = null;

export default function ProductsTab({ products: ignoredProducts, setProducts: ignoredSetProducts }) {
  const { token } = useAuth();
  
  const [availableCategories, setAvailableCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  
  const querySignature = JSON.stringify({ searchTerm, categoryFilter, sortBy });
  const isCacheHit = adminProductsCache && adminProductsCache.signature === querySignature;

  const [products, setProducts] = useState(isCacheHit ? adminProductsCache.products : []);
  const [page, setPage] = useState(isCacheHit ? adminProductsCache.page : 1);
  const [hasMore, setHasMore] = useState(isCacheHit ? adminProductsCache.hasMore : false);
  const [isLoading, setIsLoading] = useState(!isCacheHit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '', description: '', category: '', subcategory: '',
    regularPrice: '', salePrice: '', stockQuantity: '',
    inStock: true, sizes: '', colors: '', isNew: false
  });
  
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#b8860b');
  
  const [productImages, setProductImages] = useState([]); // Array of { id, type: 'url'|'file', content: string|File, preview: string }

  // Persist State to Cache internally
  const stateRef = useRef({ products, page, hasMore, signature: querySignature });
  useEffect(() => {
    stateRef.current = { products, page, hasMore, signature: querySignature };
  }, [products, page, hasMore, querySignature]);

  useEffect(() => {
    if (isCacheHit && adminProductsCache.scrollY) {
      setTimeout(() => window.scrollTo(0, adminProductsCache.scrollY), 0);
    }
    return () => {
      adminProductsCache = { ...stateRef.current, scrollY: window.scrollY };
    };
  }, [isCacheHit]);

  // Observer
  const observer = useRef();
  const isFetchingRef = useRef(false);

  const lastRowRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  // Reset page safely
  useEffect(() => {
    if (!isCacheHit) {
      setPage(1);
      setProducts([]);
    }
  }, [querySignature, isCacheHit]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if(data.categories) setAvailableCategories(JSON.parse(data.categories));
      } catch (err) {}
    }
    fetchCats();
  }, []);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    
    const fetchProducts = async () => {
      if (isCacheHit && page === adminProductsCache.page && products.length > 0) return;
      
      if (products.length === 0) setIsLoading(true);
      isFetchingRef.current = true;
      try {
        const qs = new URLSearchParams();
        if (searchTerm) qs.append('search', searchTerm);
        if (categoryFilter !== 'All') qs.append('category', categoryFilter);
        qs.append('sortBy', sortBy);
        qs.append('page', page);
        qs.append('limit', 20);

        const res = await fetch(`/api/admin/products?${qs.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (!isMounted) return;
        const fetched = data.products || [];
        
        if (page === 1) {
          setProducts(fetched);
        } else {
          setProducts(prev => {
            const added = fetched.filter(fp => !prev.some(p => p.id === fp.id));
            return [...prev, ...added];
          });
        }
        setHasMore(data.page < data.totalPages);
      } catch (e) {
        console.error('Failed', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      }
    };
    fetchProducts();
    
    return () => { isMounted = false; };
  }, [page, querySignature, token]);

  // Smart Size Memory: Auto-fill sizes based on category + subcategory
  useEffect(() => {
    if (formData.category && formData.subcategory && !editingProduct && !formData.sizes) {
      const similarProduct = products.find(p => {
        if (p.category !== formData.category || p.subcategory !== formData.subcategory) return false;
        
        // Parse sizes safely
        let pSizes = p.sizes;
        if (typeof pSizes === 'string') {
          try { pSizes = JSON.parse(pSizes); } catch (e) { pSizes = pSizes.split(',').map(s => s.trim()); }
        }
        return Array.isArray(pSizes) && pSizes.length > 0;
      });

      if (similarProduct) {
        let pSizes = similarProduct.sizes;
        if (typeof pSizes === 'string' && pSizes.startsWith('[')) {
          try { pSizes = JSON.parse(pSizes); } catch (e) { /* ignore */ }
        }
        const sizesString = Array.isArray(pSizes) ? pSizes.join(', ') : pSizes;
        
        if (sizesString && sizesString !== '[]') {
          setFormData(prev => ({ ...prev, sizes: sizesString }));
        }
      }
    }
  }, [formData.category, formData.subcategory, products, editingProduct]);

  // Safely grab unique active categories purely for fallback checks
  const uniqueProductCategories = [...new Set(products.map(p => p.category))];

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    const sendData = new FormData();
    sendData.append('name', formData.name);
    sendData.append('description', formData.description);
    sendData.append('category', formData.category);
    sendData.append('subcategory', formData.subcategory);
    sendData.append('regularPrice', formData.regularPrice);
    sendData.append('salePrice', formData.salePrice);
    sendData.append('stockQuantity', formData.stockQuantity);
    sendData.append('inStock', formData.inStock);
    sendData.append('isNew', formData.isNew);
    
    sendData.append('sizes', JSON.stringify(formData.sizes.split(',').map(s=>s.trim()).filter(Boolean)));
    sendData.append('colors', JSON.stringify(formData.colors.split(',').map(s=>s.trim()).filter(Boolean)));

    // Handle ordered images
    const imageOrder = [];
    productImages.forEach(img => {
      if (img.type === 'url') {
        imageOrder.push(img.content);
      } else {
        imageOrder.push('new');
        sendData.append('galleryImages', img.content);
      }
    });
    sendData.append('images', JSON.stringify(imageOrder));

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: sendData
      });
      
      if (res.ok) {
        adminProductsCache = null; // Bust cache forcefully
        setPage(1); // Drives native React loop resetting and re-fetching
        setIsModalOpen(false);
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch(err) {
      console.error(err);
      alert('Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!token) return;
    if(window.confirm('Delete this product permanently?')) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          adminProductsCache = null;
          setProducts(prev => prev.filter(p => p.id !== id));
        } else {
          alert('Failed to delete product from database.');
        }
      } catch (err) {
        console.error(err);
        alert('Server error while deleting.');
      }
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      regularPrice: product.regularPrice || product.price || '',
      salePrice: product.salePrice || '',
      stockQuantity: product.stockQuantity || '',
      inStock: product.inStock !== undefined ? product.inStock : true,
      sizes: (product.sizes || []).join(', '),
      colors: (product.colors || []).join(', '),
      isNew: product.isNew || false
    });
    
    let imagesArray = [];
    if (product.images) {
      imagesArray = Array.isArray(product.images) ? product.images : JSON.parse(product.images);
    } else if (product.galleryImages) {
      imagesArray = Array.isArray(product.galleryImages) ? product.galleryImages : JSON.parse(product.galleryImages);
    }
    
    // Safety check: ensure entries are strings (URLs)
    const activeUrls = imagesArray.filter(u => typeof u === 'string').map((url, i) => ({
      id: `existing-${Date.now()}-${i}`,
      type: 'url',
      content: url,
      preview: url.startsWith('http') ? url : `${url}`
    }));
    
    setProductImages(activeUrls);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '', description: '', category: '', subcategory: '', 
      regularPrice: '', salePrice: '', sku: '', stockQuantity: '', 
      inStock: true, sizes: '', colors: '', isNew: false
    });
    setProductImages([]);
    setIsModalOpen(true);
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    const colorTag = `${newColorName.trim()} (${newColorHex})`;
    const currentColors = formData.colors ? formData.colors.split(',').map(c=>c.trim()).filter(Boolean) : [];
    if (!currentColors.includes(colorTag)) {
      const updated = [...currentColors, colorTag].join(', ');
      setFormData(prev => ({ ...prev, colors: updated }));
      setNewColorName('');
    }
  };

  const handleRemoveColor = (index) => {
    const currentColors = formData.colors.split(',').map(c=>c.trim()).filter(Boolean);
    const updated = currentColors.filter((_, i) => i !== index).join(', ');
    setFormData(prev => ({ ...prev, colors: updated }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newImgs = files.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      type: 'file',
      content: file,
      preview: URL.createObjectURL(file)
    }));
    setProductImages(prev => [...prev, ...newImgs]);
  };

  const handleReorderImage = (index, direction) => {
    const newImgs = [...productImages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newImgs.length) return;
    [newImgs[index], newImgs[targetIndex]] = [newImgs[targetIndex], newImgs[index]];
    setProductImages(newImgs);
  };

  const handleRemoveImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="admin-products animate-fade-in">
      <div className="products-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', margin: 0 }}>Inventory Management</h2>
        
        <div className="products-controls" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            className="form-select minimalist-select filter-cat" 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 'auto', padding: '0.6rem 2rem 0.6rem 1rem', fontSize: '0.9rem' }}
          >
            <option value="All">All Categories</option>
            {availableCategories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
          </select>

          <select 
            className="form-select minimalist-select filter-sort" 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', padding: '0.6rem 2rem 0.6rem 1rem', fontSize: '0.9rem' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="stock-low">Stock: Low to High</option>
            <option value="stock-high">Stock: High to Low</option>
          </select>

          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input minimalist-input search-input"
            style={{ width: '220px', padding: '0.6rem 1rem', fontSize: '0.9rem' }}
          />

          <button onClick={openAddModal} className="btn-add-product">
            + ADD PRODUCT
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Product</th>
              <th>Variants</th>
              <th>Price</th>
              <th>Stock</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(products || []).map((product, index) => {
              const isLast = index === products.length - 1;
              return (
              <tr key={product.id} ref={isLast ? lastRowRef : null}>
                <td className="mobile-full-cell">
                  <div className="product-card-mobile-inner">
                    <div className="product-row-cell mobile-top-info">
                      <img 
                        src={product.thumbnail ? (product.thumbnail.startsWith('http') ? product.thumbnail : `${product.thumbnail}`) : `${product.mainImage}`} 
                        alt={product.name} 
                        className="mobile-product-img"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/36x36?text=WP'; }}
                      />
                      <div className="product-info-wrapper">
                        <div className="product-list-name">{product.name}</div>
                        <div className="product-list-collection">{product.category}</div>
                        <div className="mobile-stats">
                          <span className="price-tag">Price: <strong>{Math.round(product.salePrice || product.regularPrice || product.price || 0)}৳</strong></span>
                          <span className="stock-tag">Stock: <strong>{product.stockQuantity || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mobile-action-bar">
                      <button onClick={() => window.open(`/product/${product.id}`, '_blank')} className="btn-m-view">View</button>
                      <button onClick={() => openEditModal(product)} className="btn-m-edit">Edit</button>
                      <button onClick={() => handleDelete(product.id)} className="btn-m-delete">Delete</button>
                    </div>
                  </div>
                </td>
                <td className="desktop-only">
                  <div className="product-row-cell">
                    <img 
                      src={product.thumbnail ? (product.thumbnail.startsWith('http') ? product.thumbnail : `${product.thumbnail}`) : `${product.mainImage}`} 
                      alt={product.name} 
                      style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E5E7EB' }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/36x36?text=WP'; }}
                    />
                    <div className="product-info-wrapper">
                      <div className="product-list-name">{product.name}</div>
                      <div className="product-list-collection">{product.category}</div>
                      <div className="product-list-desc">{product.description}</div>
                    </div>
                  </div>
                </td>
                <td className="desktop-only">
                  <div className="variant-info-cell">
                    <div><span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Sizes:</span> <span style={{ fontSize: '0.85rem' }}>{Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes}</span></div>
                    <div><span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Colors:</span> <span style={{ fontSize: '0.85rem' }}>{Array.isArray(product.colors) ? product.colors.map(c => typeof c === 'string' ? c.split(' (')[0] : c).join(', ') : product.colors}</span></div>
                  </div>
                </td>
                <td className="desktop-only">
                  <div className="price-bold">
                    {Math.round(product.salePrice || product.regularPrice || product.price || 0)} ৳
                  </div>
                </td>
                <td className="desktop-only">
                  <div className={`stock-bold ${product.stockQuantity < 5 ? 'stock-low' : ''}`}>
                    {product.stockQuantity || 0}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }} className="desktop-only">
                  <div className="action-btns">
                    <button onClick={() => window.open(`/product/${product.id}`, '_blank')} className="btn-action-outline">View</button>
                    <button onClick={() => openEditModal(product)} className="btn-action-outline">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="btn-action-delete">Delete</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--primary-color)' }}>
            Loading products...
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content animate-fade-in" style={{ maxWidth: '1200px', width: '95%' }}>
            
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, color: 'var(--secondary-color)', fontSize: '1.25rem', fontWeight: '700' }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="admin-modal-body" style={{ background: 'white' }}>
                  <div className="product-form-grid">
                    {/* Left Column */}
                    <div className="form-left-col">
                      <div className="form-section-card">
                        <div className="form-group">
                          <label className="form-label">Product Name</label>
                          <input 
                            required 
                            type="text" 
                            className="form-input" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                          />
                        </div>
                        
                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Category</label>
                          <select 
                            required 
                            className="form-select" 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})}
                          >
                            <option value="">Choose Collection</option>
                            {availableCategories.map(cat => (
                              <option key={cat.name} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Sub Collection</label>
                          <select 
                            className="form-select" 
                            value={formData.subcategory} 
                            onChange={e => setFormData({...formData, subcategory: e.target.value})}
                          >
                            <option value="">Choose Sub Collection</option>
                            {availableCategories.find(c => c.name === formData.category)?.subcategories?.map(sub => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Description</label>
                          <textarea 
                            className="form-textarea" 
                            rows="6" 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                          ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                          <div className="form-group">
                            <label className="form-label">Prev Price (৳)</label>
                            <input 
                              type="number" 
                              className="form-input" 
                              value={formData.regularPrice} 
                              onChange={e => setFormData({...formData, regularPrice: e.target.value})} 
                              placeholder="Original Price"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Price (৳)</label>
                            <input 
                              required 
                              type="number" 
                              className="form-input" 
                              value={formData.salePrice} 
                              onChange={e => setFormData({...formData, salePrice: e.target.value})} 
                              placeholder="Selling Price"
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Stock</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={formData.stockQuantity} 
                            onChange={e => setFormData({...formData, stockQuantity: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="form-right-col">
                      <div className="form-section-card">
                        <div className="form-group">
                          <label className="form-label">Available Sizes (Comma Separated)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={formData.sizes} 
                            onChange={e => setFormData({...formData, sizes: e.target.value})} 
                            placeholder="M-40, L-42, XL-44"
                          />
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Product Colors</label>
                          
                          {/* Color List Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                            {(formData.colors ? formData.colors.split(',') : []).map((c, i) => {
                              const trimC = c.trim();
                              if(!trimC) return null;
                              const hexMatch = trimC.match(/\((#[a-fA-F0-9]+)\)/);
                              const hex = hexMatch ? hexMatch[1] : '#f1f5f9';
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '16px', gap: '8px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: hex }} />
                                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{trimC.split(' (')[0]}</span>
                                  <button type="button" onClick={() => handleRemoveColor(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', color: '#64748b' }}>×</button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Color Adder Mini-Tool */}
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ flex: 1 }}
                              placeholder="Color Name (e.g. Royal Blue)"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                            />
                            <input 
                              type="color" 
                              className="color-picker-input"
                              style={{ width: '44px', height: '44px', padding: '2px', cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                              value={newColorHex}
                              onChange={(e) => setNewColorHex(e.target.value)}
                            />
                            <button 
                              type="button" 
                              className="btn-action-outline"
                              onClick={handleAddColor}
                              style={{ padding: '0.6rem 1rem' }}
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Search Tags <span style={{ textTransform: 'none', fontWeight: '400', fontSize: '0.7rem' }}>(Internal: "summer, formal, blue")</span></label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder=""
                          />
                          <p className="tag-instruction">These tags remain hidden but help customers find this product.</p>
                        </div>

                        <div className="form-group" style={{ marginTop: '2rem' }}>
                          <label className="form-label">Product Images</label>
                          
                          <div className="upload-guidelines-box">
                            <div className="guidelines-header">
                              <span style={{ backgroundColor: '#374151', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', fontSize: '0.6rem' }}>i</span>
                              Upload Guidelines
                            </div>
                            <ul className="guidelines-list">
                              <li>Orientation: Portrait (3:4 ratio) is highly recommended.</li>
                              <li>Formats: JPG, PNG, or WebP.</li>
                              <li>Size: Max 2MB per image for fast loading.</li>
                            </ul>
                          </div>

                          <div className="image-manager-grid">
                            {productImages.map((img, idx) => (
                              <div key={img.id} className="image-preview-card">
                                <img src={img.preview} alt="Product preview" />
                                <button type="button" className="remove-btn" onClick={() => handleRemoveImage(idx)}>×</button>
                                
                                {/* Image Reorder Controls */}
                                <div className="reorder-btns">
                                  <button 
                                    type="button" 
                                    className="reorder-btn" 
                                    disabled={idx === 0}
                                    onClick={() => handleReorderImage(idx, -1)}
                                  >
                                    &lt;
                                  </button>
                                  <button 
                                    type="button" 
                                    className="reorder-btn" 
                                    disabled={idx === productImages.length - 1}
                                    onClick={() => handleReorderImage(idx, 1)}
                                  >
                                    &gt;
                                  </button>
                                </div>

                                {idx === 0 && <div className="main-tag">MAIN</div>}
                              </div>
                            ))}
                            <label className="add-image-placeholder">
                              <Plus size={20} />
                              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Add Image</span>
                              <input type="file" accept="image/*" multiple className="hidden" style={{ display: 'none' }} onChange={handleFileChange} />
                            </label>
                          </div>
                          <p className="tag-instruction" style={{ marginTop: '0.5rem' }}>Select photos to upload.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline" style={{ border: 'none', color: '#64748B' }}>Discard</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '8px' }}>{editingProduct ? 'Save Changes' : 'Publish Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
