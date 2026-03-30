import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Settings, LogOut, Package, Image as ImageIcon, Grid, Menu } from 'lucide-react';
import './Dashboard.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import OrdersTab from './OrdersTab';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import BannersTab from './BannersTab';
import SettingsTab from './SettingsTab';

import { useSearchParams } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';
  
  const [orders, setOrders] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const knownOrderIds = React.useRef(new Set());
  const isFirstLoad = React.useRef(true);


  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [token]); // Re-fetch if token changes



  // Play a notification beep sound
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Sound not supported');
    }
  };

  // Show browser notification + sound + title flash for new orders
  const showNewOrderNotification = (order) => {
    playNotificationSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      const total = order.grandTotal ? `৳${order.grandTotal}` : '';
      const name = order.customerInfo?.name || order.customerName || 'Customer';
      new Notification('🛒 New Order!', {
        body: `${name} placed an order ${total}`,
        icon: '/favicon.ico',
        tag: `order-${order.id}`
      });
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.status === 401 || res.status === 403 || data.error === 'Invalid token' || data.error === 'Access denied') {
        console.error("Session expired or invalid. Logging out.");
        logout();
        navigate('/login');
        return;
      }

      if (Array.isArray(data)) {
        // Detect new orders (skip on first load so we don't spam)
        if (!isFirstLoad.current) {
          data.forEach(order => {
            if (!knownOrderIds.current.has(order.id)) {
              showNewOrderNotification(order);
            }
          });
        }

        // Update known IDs
        knownOrderIds.current = new Set(data.map(o => o.id));
        isFirstLoad.current = false;
        setOrders(data);
      } else {
        console.error("Orders response is not an array:", data);
        setOrders([]);
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    }
  };


  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const navItemClick = (tabId) => {
    setSearchParams({ tab: tabId });
    setIsSidebarOpen(false); // Auto close sidebar on mobile
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'orders':
        return <OrdersTab orders={orders} fetchOrders={fetchOrders} handleUpdateOrderStatus={handleUpdateOrderStatus} />;
      case 'products':
        return <ProductsTab />;
      case 'categories':
        return <CategoriesTab />;
      case 'banners':
        return <BannersTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OrdersTab orders={orders} fetchOrders={fetchOrders} handleUpdateOrderStatus={handleUpdateOrderStatus} />;
    }
  };

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F8FA', position: 'relative' }}>
      
      {/* Mobile Menu Toggle Header */}
      <div className="mobile-header">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mobile-menu-btn">
          <Menu size={24} />
        </button>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '1.25rem', fontWeight: 700, marginLeft: '1rem', flex: 1 }}>Marbilo Admin</h3>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Barakah</Link>
          <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>Dashboard</div>
        </div>
        <nav className="admin-nav" style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          <button className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => navItemClick('orders')}>
            <ShoppingBag size={20} /> Orders
          </button>
          <button className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => navItemClick('products')}>
            <Package size={20} /> Products
          </button>
          <button className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => navItemClick('categories')}>
            <Grid size={20} /> Categories
          </button>
          <button className={`admin-nav-item ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => navItemClick('banners')}>
            <ImageIcon size={20} /> Banners
          </button>
          <button className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => navItemClick('settings')}>
            <Settings size={20} /> Settings
          </button>
        </nav>
        
        <div className="admin-logout" style={{ padding: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/" target="_blank" className="admin-nav-item" style={{ color: 'var(--secondary-color)', padding: '0.5rem 1rem' }}>
            <LogOut size={20} style={{ transform: 'rotate(180deg)' }} /> Visit Store
          </Link>
          <button onClick={() => { logout(); navigate('/login'); }} className="admin-nav-item" style={{ color: '#EF4444', padding: '0.5rem 1rem' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main" style={{ flex: 1, padding: '2rem', minWidth: 0, backgroundColor: '#f3f4f6' }}>
        {renderContent()}
      </main>
    </div>
  );
}
