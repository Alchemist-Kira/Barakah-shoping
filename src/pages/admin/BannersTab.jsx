import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BannersTab() {
  const [banners, setBanners] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const { token } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image: '',
    buttonText: '',
    buttonLink: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fetchBanners = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.banners) {
        let items = JSON.parse(data.banners);
        // Ensure unique IDs
        items = items.map(b => ({...b, id: b.id || `b${Math.random().toString(36).substr(2, 9)}`}));
        setBanners(items);
      } else {
        setBanners([]);
      }
    } catch (e) {
      console.error("Failed to load banners:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const saveSettings = async (updatedBanners) => {
    try {
      await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ key: 'banners', value: updatedBanners })
      });
      setBanners(updatedBanners);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let finalImageUrl = formData.image;
    
    if (selectedFile) {
      const form = new FormData();
      form.append('image', selectedFile);
      try {
        const uploadRes = await fetch('http://localhost:5000/api/upload', {
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

    if (!finalImageUrl) {
      alert("Please upload an image!");
      return;
    }
    
    let updated;
    if (editingBanner) {
      updated = banners.map(b => b.id === editingBanner.id ? { ...b, ...formData, image: finalImageUrl } : b);
    } else {
      updated = [...banners, { id: `b${Date.now()}`, ...formData, image: finalImageUrl }];
    }
    
    await saveSettings(updated);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Delete this banner?')) {
      const updated = banners.filter(b => b.id !== id);
      await saveSettings(updated);
    }
  };

  // NATIVE DRAG AND DROP
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const list = [...banners];
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

  const openEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({ 
      title: banner.title || '', 
      subtitle: banner.subtitle || '', 
      image: banner.image || '', 
      buttonText: banner.buttonText || '', 
      buttonLink: banner.buttonLink || '' 
    });
    setSelectedFile(null);
    setPreviewUrl(banner.image ? (banner.image.startsWith('http') ? banner.image : `http://localhost:5000${banner.image}`) : '');
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingBanner(null);
    setFormData({ title: '', subtitle: '', image: '', buttonText: '', buttonLink: '' });
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

  if (isLoading) return <div className="admin-loading">Loading banners...</div>;

  return (
    <div className="admin-banners animate-fade-in">
      <div className="banners-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="admin-tab-title" style={{ margin: 0 }}>Home Banners</h2>
        <button onClick={openAdd} className="btn-add-product">
          <Plus size={18} /> ADD BANNER
        </button>
      </div>

      <div className="table-responsive" onDragOver={(e) => e.preventDefault()}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Order</th>
              <th style={{ width: '250px' }}>Preview</th>
              <th>Banner Content</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner, index) => (
              <tr 
                key={banner.id}
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
                  <img 
                    src={banner.image.startsWith('http') ? banner.image : `http://localhost:5000${banner.image}`} 
                    alt={banner.title} 
                    style={{ height: '70px', width: '200px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#F1F5F9' }} 
                  />
                </td>
                <td>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--secondary-color)', fontSize: '1rem' }}>{banner.title || 'Untitled'}</span>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>{banner.subtitle || 'No subtitle'}</span>
                    {banner.buttonText && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#475569' }}>
                          Btn: {banner.buttonText} → {banner.buttonLink}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => openEdit(banner)} className="btn-edit" style={{ marginRight: '0.5rem' }}>
                    <Edit size={14} /> EDIT
                  </button>
                  <button onClick={() => handleDelete(banner.id)} className="btn-delete">
                    <Trash2 size={14} /> DELETE
                  </button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>No banners configured yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <h3>{editingBanner ? 'Edit Banner' : 'Create Banner'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="admin-modal-body">
                <div className="form-group">
                  <label className="form-label">Banner Image</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" />
                  {previewUrl && (
                    <img src={previewUrl} alt="Preview" style={{ marginTop: '1rem', width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Primary Title</label>
                    <input className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. New Seasonal Arrival" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subtitle</label>
                    <input className="form-input" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="e.g. Up to 50% Off" />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Button Label</label>
                    <input className="form-input" value={formData.buttonText} onChange={e => setFormData({...formData, buttonText: e.target.value})} placeholder="e.g. SHOP NOW" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link destination</label>
                    <input className="form-input" value={formData.buttonLink} onChange={e => setFormData({...formData, buttonLink: e.target.value})} placeholder="e.g. /store" />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
