import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Minus, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import './Checkout.css';

export default function Checkout() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    location: '', // empty by default
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});
  const [shippingSettings, setShippingSettings] = useState({ inside: 80, outside: 150 });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings');
      const data = await res.json();
      if (data.app_settings) {
        const settings = JSON.parse(data.app_settings);
        setShippingSettings({
          inside: settings.shippingChargeInside || 80,
          outside: settings.shippingChargeOutside || 150
        });
      }
    } catch (e) {
      console.error("Failed to load shipping settings:", e);
    }
  };

  const deliveryCharge = formData.location === 'inside' ? shippingSettings.inside : (formData.location === 'outside' ? shippingSettings.outside : 0);
  const grandTotal = cartTotal + deliveryCharge;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error instantly on input
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if(cartItems.length === 0) return;
    
    setFormError('');
    let newErrors = {};

    if (!formData.location) {
      newErrors.location = "Please select a delivery location.";
    }

    // Sanitize phone number before checking
    let cleanPhone = formData.phone.replace(/[^\d+]/g, '');
    if (cleanPhone.startsWith('+8801')) {
      cleanPhone = cleanPhone.replace('+88', '');
    } else if (cleanPhone.startsWith('8801')) {
      cleanPhone = cleanPhone.replace('88', '');
    }

    const bdPhoneRegex = /^\d{11}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      newErrors.phone = "Please enter a valid 11-digit phone number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to the first error element smoothly so the user sees it
      setTimeout(() => {
        const firstError = document.querySelector('.input-error, .input-error-group');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    setIsSubmitting(true);

    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const orderData = {
      id: orderId,
      date: new Date().toISOString(),
      customerInfo: { ...formData, phone: cleanPhone },
      items: cartItems,
      subtotal: cartTotal,
      deliveryCharge,
      grandTotal,
      status: 'Pending',
      paymentMethod: 'Cash on Delivery'
    };

    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        clearCart();
        setOrderSuccess({ id: orderId, total: grandTotal, phone: formData.phone });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError("Failed to place order. Please try again.");
      }
    } catch (err) {
      console.error("Order error:", err);
      setFormError("Something went wrong. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="checkout-page container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="success-card">
          <div className="success-icon-wrapper">
             <CheckCircle2 size={50} strokeWidth={2.5} />
          </div>
          <h2 className="success-title">Order Confirmed!</h2>
          <p className="success-subtitle">Your order has been successfully placed.</p>
          
          <div className="success-details-box">
             <div className="sd-row">
               <span>Payment Method</span>
               <strong>Cash on Delivery</strong>
             </div>
             <div className="sd-row">
               <span>Total Payable</span>
               <strong style={{ color: 'var(--primary-color)' }}>৳ {orderSuccess.total.toLocaleString()}</strong>
             </div>
          </div>
          
          <p className="success-note">We'll contact you shortly at <strong style={{ color: '#1F2937' }}>{orderSuccess.phone}</strong> to confirm your order.</p>
          
          <div className="success-actions">
            <Link to="/store" className="btn-primary" style={{ display: 'block', width: '100%', textAlign: 'center', marginBottom: '1rem', padding: '1rem' }}>Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page container animate-fade-in">
      <h1 className="title-main">Checkout</h1>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart-state">
          <h3>Your cart is empty</h3>
          <p>Add some products to your cart before proceeding to checkout.</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/store')}>Browse Store</button>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* Cart Summary */}
          <div className="cart-summary-section">
            <h2 className="section-title">Order Summary</h2>
            
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={item.product.id} className="cart-item">
                  <img 
                    src={item.product.mainImage?.startsWith('/uploads') ? `http://localhost:5000${item.product.mainImage}` : (item.product.mainImage || 'https://placehold.co/100x100?text=No+Image')} 
                    alt={item.product.name} 
                    className="cart-item-image" 
                  />
                  
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">{item.product.name}</h4>
                    
                    {item.variants && (
                      <div className="cart-item-variants" style={{ fontSize: '0.8rem', color: 'var(--gray-text)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem' }}>
                        {item.variants.size && <span>Size: <strong>{item.variants.size}</strong></span>}
                        {item.variants.color && <span>Color: <strong>{item.variants.color}</strong></span>}
                      </div>
                    )}
                    
                    <p className="cart-item-price" style={{ marginTop: '0.5rem' }}>৳ {item.product.price.toLocaleString()}</p>
                    
                    <div className="cart-item-actions">
                      <div className="qty-controls-small">
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button 
                        type="button" 
                        className="remove-item-btn"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="cart-item-total">
                    ৳ {(item.product.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>৳ {cartTotal.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Delivery Charge {formData.location ? `(${formData.location === 'inside' ? 'Inside' : 'Outside'} Dhaka)` : ''}</span>
                <span>{formData.location ? `৳ ${deliveryCharge}` : 'Select location'}</span>
              </div>
              <div className="total-row grand-total">
                <span>Total Payable (Cash on Delivery)</span>
                <span>৳ {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="checkout-form-section">
            <h2 className="section-title">Delivery Details</h2>
            
            <form onSubmit={handlePlaceOrder} className="checkout-form">
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name *</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  className="form-input" 
                  required 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone Number *</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone" 
                  className={`form-input ${errors.phone ? 'input-error' : ''}`} 
                  required 
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="01XXXXXXXXX"
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Location *</label>
                <div className={`radio-group-modern ${errors.location ? 'input-error-group' : ''}`}>
                  <label className={`radio-label ${formData.location === 'inside' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="location" 
                      value="inside" 
                      checked={formData.location === 'inside'}
                      onChange={handleInputChange}
                    />
                    <span>Inside Dhaka (৳ {shippingSettings.inside})</span>
                  </label>
                  <label className={`radio-label ${formData.location === 'outside' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="location" 
                      value="outside" 
                      checked={formData.location === 'outside'}
                      onChange={handleInputChange}
                    />
                    <span>Outside Dhaka (৳ {shippingSettings.outside})</span>
                  </label>
                </div>
                {errors.location && <span className="error-text">{errors.location}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="address">Detailed Address *</label>
                <textarea 
                  id="address" 
                  name="address" 
                  className="form-textarea" 
                  required 
                  rows="3"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="House, Road, Area, City"
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note">Order Note (Optional)</label>
                <textarea 
                  id="note" 
                  name="note" 
                  className="form-textarea" 
                  rows="2"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Any special instructions for delivery..."
                ></textarea>
              </div>

              <div className="payment-method-box">
                <p><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
                <p className="text-sm">Pay the delivery agent when you receive your order.</p>
              </div>
              
              {formError && (
                <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid #F87171', fontWeight: '500' }}>
                  {formError}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary place-order-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Placing Order...' : `Confirm Order - ৳ ${grandTotal.toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
