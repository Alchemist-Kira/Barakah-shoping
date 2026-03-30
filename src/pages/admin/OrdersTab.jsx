import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Printer, Trash2, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function OrdersTab({ orders, fetchOrders, handleUpdateOrderStatus }) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [fraudResults, setFraudResults] = useState({});
  const [fraudLoading, setFraudLoading] = useState({});

  // Filter & Sort Logic
  const ordersList = Array.isArray(orders) ? orders : [];
  const filteredOrders = ordersList.filter((order) => {
    const matchSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerInfo.phone.includes(searchTerm);
    
    const matchStatus = statusFilter === 'All' || order.status === statusFilter;
    
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    const valA = Number(a.grandTotal) || 0;
    const valB = Number(b.grandTotal) || 0;
    const dateA = new Date(a.date || a.createdAt);
    const dateB = new Date(b.date || b.createdAt);

    if (sortBy === 'date-desc') return dateB - dateA;
    if (sortBy === 'date-asc') return dateA - dateB;
    if (sortBy === 'amount-desc') return valB - valA;
    if (sortBy === 'amount-asc') return valA - valB;
    return 0;
  });

  const handleClearHistory = async () => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to clear ALL non-pending orders? Only Pending orders will be kept. This action cannot be undone.")) return;
    try {
      const res = await fetch('/api/orders/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch(e) {}
      if (res.ok) { 
        alert("Order history cleared. Only Pending orders remain.");
        fetchOrders(); 
      } else {
        alert("Failed to clear history (" + res.status + "): " + (data.error || text.substring(0, 100)));
      }
    } catch (e) { 
      console.error("Failed to clear history", e); 
      alert("Network error: " + e.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!token) return;
    if (!window.confirm(`Permanently delete order #${orderId}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch(e) {}
      if (res.ok) { 
        fetchOrders(); 
      } else {
        alert("Failed to delete order (" + res.status + "): " + (data.error || text.substring(0, 100)));
      }
    } catch (e) { 
      console.error("Failed to delete order", e); 
      alert("Network error: " + e.message);
    }
  };

  const handleFraudCheck = async (orderId, phone) => {
    if (!token) return;
    setFraudLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch('/api/fraud-check', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      setFraudResults(prev => ({ ...prev, [orderId]: data }));
    } catch (e) {
      setFraudResults(prev => ({ ...prev, [orderId]: { error: e.message } }));
    } finally {
      setFraudLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - ${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700;800&display=swap');
            @page { margin: 10mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.4; font-size: 13px; }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1.5px solid #e2e8f0; }
            .brand-name { font-family: 'Playfair Display', serif; font-size: 2rem; color: #0f172a; margin: 0; letter-spacing: 1px; }
            .tagline { text-transform: uppercase; font-size: 0.7rem; letter-spacing: 4px; color: #94a3b8; margin-top: 2px; font-weight: 500; }
            
            .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
            .section-label { font-weight: 800; color: #94a3b8; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
            .customer-name { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
            .customer-text { margin: 0; color: #475569; font-size: 0.85rem; }
            
            .order-details { text-align: right; }
            .order-details p { margin: 2px 0; font-size: 0.85rem; color: #475569; }
            .order-details strong { color: #0f172a; font-weight: 700; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { text-align: left; padding: 10px 8px; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 1px; color: #94a3b8; font-weight: 700; border-bottom: 1.5px solid #e2e8f0; border-top: 1.5px solid #e2e8f0; }
            td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            
            .item-desc { font-weight: 700; font-size: 0.9rem; color: #0f172a; margin-bottom: 1px; }
            .item-meta { font-size: 0.75rem; color: #94a3b8; }
            .price-col { text-align: right; font-weight: 500; white-space: nowrap; }
            .total-col { text-align: right; font-weight: 800; color: #0f172a; white-space: nowrap; }
            
            .totals-container { width: 260px; margin-left: auto; margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; font-size: 0.9rem; }
            .grand-total { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 8px; color: #0f172a; font-size: 1.15rem; font-weight: 900; }
            
            .footer-msg { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 0.85rem; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1 class="brand-name">Barakah</h1>
            <div class="tagline">Premium Collection</div>
          </div>
          
          <div class="info-grid">
            <div>
              <div class="section-label">BILLED TO</div>
              <h2 class="customer-name">${order.customerInfo.name}</h2>
              <p class="customer-text">${order.customerInfo.phone}</p>
              <p class="customer-text">${order.customerInfo.address}</p>
            </div>
            <div class="order-details">
              <div class="section-label">ORDER DETAILS</div>
              <p><strong>Order ID:</strong> #${order.id.replace('ORD-', '')}</p>
              <p><strong>Date:</strong> ${new Date(order.date || order.createdAt).toLocaleDateString()}</p>
              <p><strong>Payment:</strong> ${order.paymentMethod} (COD)</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">ITEM</th>
                <th style="text-align: center">QTY</th>
                <th style="text-align: right">PRICE</th>
                <th style="text-align: right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>
                    <div class="item-desc">${item.product.name}</div>
                    <div class="item-meta">
                      ${[
                        item.variants?.size ? `Size: ${item.variants.size}` : null,
                        item.variants?.color ? `Color: ${item.variants.color.split(' (')[0]}` : null
                      ].filter(Boolean).join(' | ')}
                    </div>
                  </td>
                  <td style="text-align: center">${item.quantity}</td>
                  <td class="price-col">${Number(item.product.price).toLocaleString()} ৳</td>
                  <td class="total-col">${(Number(item.product.price) * item.quantity).toLocaleString()} ৳</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${Number(order.subtotal).toLocaleString()} ৳</span>
            </div>
            <div class="total-row">
              <span>Shipping (${order.customerInfo.location === 'inside' ? 'Inside' : 'Outside'} Dhaka)</span>
              <span>${Number(order.deliveryCharge).toLocaleString()} ৳</span>
            </div>
            <div class="total-row grand-total">
              <span>Total (COD)</span>
              <span>${Number(order.grandTotal).toLocaleString()} ৳</span>
            </div>
          </div>

          <div class="footer-msg">
            Thank you for shopping with Barakah!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="admin-orders animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header Controls */}
      <div className="orders-header-bar admin-flex-stack" style={{ 
        marginBottom: '2rem' 
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900', color: '#111827', letterSpacing: '-0.5px' }}>Order Management</h2>
          <p style={{ color: '#6B7280', marginTop: '0.2rem', fontSize: '0.9rem' }}>Fulfill customer orders in real-time</p>
        </div>
        
        <div className="orders-controls admin-flex-stack">
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9CA3AF' }} />
            <input 
              type="text" 
              placeholder="Search ID, Customer, Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '40px', width: '100%', maxWidth: '320px', borderRadius: '10px', border: '1.5px solid #E5E7EB', height: '40px', fontSize: '0.9rem' }}
            />
          </div>
          
          <select 
            className="form-select" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', borderRadius: '10px', border: '1.5px solid #E5E7EB', height: '40px', padding: '0 2rem 0 0.75rem', fontWeight: '600', fontSize: '0.85rem', backgroundColor: '#fff', appearance: 'auto' }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select 
            className="form-select" 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto', borderRadius: '10px', border: '1.5px solid #E5E7EB', height: '40px', padding: '0 2rem 0 0.75rem', fontWeight: '600', fontSize: '0.85rem', backgroundColor: '#fff', appearance: 'auto' }}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount (High-Low)</option>
            <option value="amount-asc">Amount (Low-High)</option>
          </select>

          <button 
            onClick={handleClearHistory}
            className="mobile-tap-target"
            style={{ 
              backgroundColor: '#FEE2E2', 
              color: '#991B1B', 
              padding: '0 1rem', 
              borderRadius: '10px', 
              border: '1.5px solid #FCA5A5',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Trash2 size={16} /> Clear History
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '20px', border: '1px dashed #D1D5DB' }}>
          <Search size={28} style={{ color: '#9CA3AF', marginBottom: '1rem' }} />
          <h3 style={{ color: '#111827', fontSize: '1.1rem', margin: '0' }}>No orders found</h3>
        </div>
      ) : (
        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{ 
              backgroundColor: 'white', 
              borderRadius: '16px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              border: '1px solid #F3F4F6'
            }}>
              {/* Card Header */}
              <div className="admin-flex-stack" style={{ 
                padding: '1rem 1.5rem', 
                backgroundColor: '#F9FAFB', 
                borderBottom: '1px solid #F3F4F6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: 'var(--secondary-color)', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>ORDER ID</span>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem', fontWeight: '900' }}>#{order.id}</h3>
                  </div>
                  <div style={{ marginLeft: '0.5rem', borderLeft: '1.5px solid #E5E7EB', paddingLeft: '1.5rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>PLACED AT</span>
                    <p style={{ margin: 0, color: '#4B5563', fontSize: '0.85rem', fontWeight: '600' }}>{new Date(order.date || order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {order.status === 'Pending' ? (
                    <>
                      <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>PENDING</div>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Processing')} style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>Confirm</button>
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')} style={{ backgroundColor: 'white', color: '#DC2626', border: '1px solid #FCA5A5', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div style={{ 
                        backgroundColor: order.status === 'Delivered' ? '#D1FAE5' : order.status === 'Cancelled' ? '#FEE2E2' : '#DBEAFE', 
                        color: order.status === 'Delivered' ? '#065F46' : order.status === 'Cancelled' ? '#991B1B' : '#1E40AF', 
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800'
                      }}>
                        {order.status.toUpperCase()}
                      </div>
                      {order.status !== 'Cancelled' && (
                        <select 
                          value={order.status} 
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                          style={{ height: '32px', padding: '0 1.5rem 0 0.75rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #E5E7EB', fontWeight: '700' }}
                        >
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      )}
                      {order.status !== 'Cancelled' && (
                        <button onClick={() => handlePrint(order)} style={{ height: '32px', padding: '0 0.75rem', border: '1px solid var(--secondary-color)', color: 'var(--secondary-color)', borderRadius: '6px', backgroundColor: 'transparent', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                          <Printer size={14} /> Print
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="admin-card-grid" style={{ padding: '1.25rem 1.5rem' }}>
                {/* Customer Column */}
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Customer</h4>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '1.25rem', borderRadius: '12px', border: '1px solid #F3F4F6', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '700' }}>NAME</span>
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.95rem', fontWeight: '800', color: '#111827' }}>{order.customerInfo.name}</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '700' }}>PHONE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--secondary-color)' }}>{order.customerInfo.phone}</p>
                        {!fraudResults[order.id] && (
                          <button
                            onClick={() => handleFraudCheck(order.id, order.customerInfo.phone)}
                            disabled={fraudLoading[order.id]}
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              borderRadius: '6px',
                              border: '1px solid #93C5FD',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            {fraudLoading[order.id] ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={12} />}
                            {fraudLoading[order.id] ? 'Checking...' : 'Fraud Check'}
                          </button>
                        )}
                      </div>
                      {/* Fraud Check Results - BDCourier */}
                      {fraudResults[order.id] && (() => {
                        const result = fraudResults[order.id];

                        // Handle network/server error
                        if (result.error) {
                          return (
                            <div style={{ marginTop: '0.5rem', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: '0.75rem' }}>
                              <div style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ShieldAlert size={14} /> {result.error}
                              </div>
                            </div>
                          );
                        }

                        // BDCourier — handle non-success status (message field present on errors)
                        if (result.message && !result.summary) {
                          return (
                            <div style={{ marginTop: '0.5rem', padding: '0.6rem', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: '0.75rem' }}>
                              <div style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ShieldAlert size={14} /> {result.message}
                              </div>
                            </div>
                          );
                        }

                        // --- Parse BDCourier exact response format ---
                        // Response: { status: "success", data: { pathao:{}, ..., summary:{} }, reports:[] }
                        const apiData = result.data || result;
                        const summary = apiData.summary || {};
                        const total       = summary.total_parcel     ?? 0;
                        const success     = summary.success_parcel   ?? 0;
                        const cancel      = summary.cancelled_parcel ?? 0;
                        const successRate = summary.success_ratio    ?? 0;
                        const cancelRate  = total > 0 ? (cancel / total * 100) : 0;

                        // Courier entries — inside apiData, skip 'summary', filter zero-parcel couriers
                        const courierEntries = Object.entries(apiData)
                          .filter(([key, val]) => key !== 'summary' && val && typeof val === 'object' && val.name);

                        // Derive risk level from cancel rate
                        let riskLevel  = 'low';
                        let riskLabel  = 'LOW RISK';
                        let riskColor  = '#059669';
                        let riskBg     = '#F0FDF4';
                        let riskBorder = '#BBF7D0';

                        if      (cancelRate > 40) { riskLevel = 'very_high'; }
                        else if (cancelRate > 25) { riskLevel = 'high'; }
                        else if (cancelRate > 15) { riskLevel = 'medium'; }

                        if (riskLevel === 'very_high' || riskLevel === 'high') {
                          riskLabel = riskLevel === 'very_high' ? 'VERY HIGH RISK' : 'HIGH RISK';
                          riskColor = '#DC2626'; riskBg = '#FEF2F2'; riskBorder = '#FCA5A5';
                        } else if (riskLevel === 'medium') {
                          riskLabel = 'MODERATE RISK';
                          riskColor = '#D97706'; riskBg = '#FFFBEB'; riskBorder = '#FDE68A';
                        } else if (total === 0) {
                          riskLabel = 'NO HISTORY';
                          riskColor = '#6B7280'; riskBg = '#F9FAFB'; riskBorder = '#E5E7EB';
                        }

                        return (
                          <div style={{ marginTop: '0.5rem', padding: '0.6rem', borderRadius: '8px', backgroundColor: riskBg, border: `1px solid ${riskBorder}`, fontSize: '0.75rem' }}>
                            {/* Risk Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem', fontWeight: '800' }}>
                              {riskColor === '#059669' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                              <span style={{ color: riskColor }}>{riskLabel}</span>
                            </div>

                            {/* Total Summary */}
                            {total > 0 && (
                              <div style={{ display: 'flex', gap: '0.75rem', color: '#4B5563', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                <span>Total: <strong>{total}</strong></span>
                                <span>Delivered: <strong style={{ color: '#059669' }}>{success}</strong> ({Number(successRate).toFixed(1)}%)</span>
                                <span>Cancelled: <strong style={{ color: cancel > 0 ? '#DC2626' : '#059669' }}>{cancel}</strong> ({Number(cancelRate).toFixed(1)}%)</span>
                              </div>
                            )}

                            {/* Per-courier breakdown */}
                            {courierEntries.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                {courierEntries.map(([key, c]) => (
                                  <span key={key} style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                                    backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid #E5E7EB', color: '#374151'
                                  }}>
                                    {c.name}: {c.success_parcel ?? 0}/{c.total_parcel ?? 0}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '700' }}>ADDRESS</span>
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: '#4B5563', fontWeight: '500' }}>
                        {order.customerInfo.address}
                        <span style={{ display: 'inline-block', marginLeft: '8px', padding: '2px 6px', backgroundColor: '#EDE9FE', color: '#5B21B6', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
                          {order.customerInfo.location === 'inside' ? 'Dhaka' : 'Outside'}
                        </span>
                      </p>
                    </div>
                    {order.customerInfo.note && (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E5E7EB', fontStyle: 'italic', fontSize: '0.8rem', color: '#92400E' }}>
                        Note: "{order.customerInfo.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Column */}
                <div>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Ordered Items</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {order.items.map((item, idx) => {
                      const img = item.product.mainImage || item.product.thumbnail || item.product.image;
                      const finalImg = img?.startsWith('/uploads') ? `${img}` : (img || 'https://placehold.co/100x100?text=No+Image');
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #F3F4F6' }}>
                          <Link to={`/product/${item.product.id}`}>
                            <img src={finalImg} alt={item.product.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                          </Link>
                          <div style={{ flex: 1 }}>
                            <Link to={`/product/${item.product.id}`} style={{ textDecoration: 'none' }}>
                              <h5 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: '800', color: '#1E293B', cursor: 'pointer' }}>{item.product.name}</h5>
                            </Link>
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                              {item.variants?.size && <span>Size: <strong>{item.variants.size}</strong></span>}
                              {item.variants?.color && <span>Color: <strong>{item.variants.color.split(' (')[0]}</strong></span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{item.quantity} × ৳{Number(item.product.price).toLocaleString()}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#1E293B' }}>৳{(item.product.price * item.quantity).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#F9FAFB', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6B7280' }}>
                  Via: <span style={{ color: '#111827' }}>{order.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF' }}>
                    Sub: ৳{Number(order.subtotal).toLocaleString()} | Del: ৳{Number(order.deliveryCharge).toLocaleString()}
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '0.4rem 1.25rem', borderRadius: '10px', border: '1.5px solid #E5E7EB' }}>
                    <span style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: '900', display: 'block' }}>TOTAL</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: '950', color: 'var(--secondary-color)', lineHeight: '1' }}>৳{Number(order.grandTotal).toLocaleString()}</div>
                  </div>
                  {order.status !== 'Pending' && (
                  <button 
                    onClick={() => handleDeleteOrder(order.id)} 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      border: '1.5px solid #FCA5A5', 
                      color: '#DC2626', 
                      backgroundColor: '#FEF2F2', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                    title="Delete Order"
                  >
                    <Trash2 size={18} />
                  </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
