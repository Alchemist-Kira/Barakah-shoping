import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CategoriesTab() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subcategories: '',
    image: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.categories) {
        let cats = JSON.parse(data.categories);
        // Ensure every cat has a unique ID for drag/drop and delete reliability
        cats = cats.map(c => ({...c, id: c.id || `c${Math.random().toString(36).substr(2, 9)}`}));
        setCategories(cats);
      } else {
        setCategories([]);
      }
    } catch (e) {
      console.error("Failed to load categories:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const saveSettings = async (updatedCategories) => {
    if (!token) return;
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ key: 'categories', value: updatedCategories })
      });
      setCategories(updatedCategories);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const subsArray = formData.subcategories.split(',').map(s => s.trim()).filter(Boolean);
    let finalImageUrl = formData.image;
    
    if (selectedFile) {
      if (!token) return;
      const form = new FormData();
      form.append('image', selectedFile);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) finalImageUrl = uploadData.url;
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    
    let updated;
    if (editingCat) {
      updated = categories.map(c => c.id === editingCat.id ? { 
        ...c, 
        name: formData.name, 
        subcategories: subsArray,
        image: finalImageUrl
      } : c);
    } else {
      updated = [...categories, { 
        id: `c${Date.now()}`, 
        name: formData.name, 
        subcategories: subsArray,
        image: finalImageUrl
      }];
    }
    
    await saveSettings(updated);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Delete this category?')) {
      const updated = categories.filter(c => c.id !== id);
      await saveSettings(updated);
    }
  };

  const openEdit = (cat) => {
    setEditingCat(cat);
    setFormData({ 
      name: cat.name, 
      subcategories: cat.subcategories ? cat.subcategories.join(', ') : '',
      image: cat.image || ''
    });
    setSelectedFile(null);
    setPreviewUrl(cat.image ? (cat.image.startsWith('http') ? cat.image : `${cat.image}`) : '');
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingCat(null);
    setFormData({ name: '', subcategories: '', image: '' });
    setSelectedFile(null);
    setPreviewUrl('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // NATIVE DRAG AND DROP
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // For transparent drag effect
    const ghost = e.currentTarget.cloneNode(true);
    ghost.style.opacity = '0.5';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const list = [...categories];
    const itemBeingDragged = list[draggedItemIndex];
    list.splice(draggedItemIndex, 1);
    list.splice(index, 0, itemBeingDragged);
    setDraggedItemIndex(null);
    setDragOverIndex(null);
    saveSettings(list);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  if (isLoading) return <div className="admin-loading">Loading categories...</div>;

  return (
    <div className="admin-categories animate-fade-in">
      <div className="categories-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="admin-tab-title" style={{ margin: 0 }}>Product Collections</h2>
        <button onClick={openAdd} className="btn-add-product">
          <Plus size={18} /> ADD COLLECTION
        </button>
      </div>

      <div className="table-responsive" onDragOver={(e) => e.preventDefault()}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Order</th>
              <th>Collection</th>
              <th>Sub Collections</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr 
                key={cat.id} 
                className={`sortable-row ${draggedItemIndex === index ? 'dragging-row' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDragEnd={() => { setDraggedItemIndex(null); setDragOverIndex(null); }}
                onDrop={(e) => handleDrop(e, index)}
              >
                <td>
                  <div className="drag-handle">
                    <GripVertical size={20} />
                  </div>
                </td>
                <td>
                  <div className="product-row-cell" style={{ gap: '1rem' }}>
                    {cat.image ? (
                      <img src={cat.image.startsWith('http') ? cat.image : `${cat.image}`} alt={cat.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', backgroundColor: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        <ImageIcon size={20} />
                      </div>
                    )}
                    <span style={{ fontWeight: 600, color: 'var(--secondary-color)' }}>{cat.name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories.map(sub => (
                      <span key={sub} style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#475569' }}>{sub}</span>
                    )) : <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>—</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => openEdit(cat)} className="btn-edit" style={{ marginRight: '0.5rem' }}>
                    <Edit size={14} /> EDIT
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="btn-delete">
                    <Trash2 size={14} /> DELETE
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>No collections found. Create your first one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h3>{editingCat ? 'Edit Collection' : 'Add New Collection'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="admin-modal-body">
                <div className="form-group">
                  <label className="form-label">Collection Name</label>
                  <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Eid Collection" />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Thumbnail Image</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" />
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" style={{ marginTop: '1rem', width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Sub Collections (comma separated)</label>
                  <input className="form-input" value={formData.subcategories} onChange={e => setFormData({...formData, subcategories: e.target.value})} placeholder="e.g. Luxe, Premium, Basic" />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Save Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
