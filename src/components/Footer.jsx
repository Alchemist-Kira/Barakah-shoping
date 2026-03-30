import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const [settings, setSettings] = useState({
    storeName: 'Barakah',
    contactEmail: 'support@barakah.com',
    contactPhone: '+880 1234 567890',
    businessAddress: 'Dhaka, Bangladesh',
    whatsapp: '',
    facebook: '',
    instagram: '',
    footerText: `© ${new Date().getFullYear()} Barakah. All rights reserved.`
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.app_settings) {
          const s = JSON.parse(data.app_settings);
          setSettings({
            storeName: s.storeName || 'Barakah',
            contactEmail: s.contactEmail || 'support@barakah.com',
            contactPhone: s.contactPhone || '+880 1234 567890',
            businessAddress: s.businessAddress || 'Dhaka, Bangladesh',
            whatsapp: s.whatsapp || '',
            facebook: s.facebook || '',
            instagram: s.instagram || '',
            footerText: s.footerText || `© ${new Date().getFullYear()} ${s.storeName || 'Barakah'}. All rights reserved.`
          });
        }
      } catch (err) {
        console.error('Failed to load footer settings', err);
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>{settings.storeName}</h3>
            <p>Premium quality clothing and essentials. Bringing elegance to your everyday life.</p>
            
            <div className="footer-socials">
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="social-icon-btn facebook" title="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </a>
              )}
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="social-icon-btn instagram" title="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>
              )}
              {settings.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-icon-btn whatsapp" title="WhatsApp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/store">Store</Link></li>
              <li><Link to="/checkout">Checkout</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Contact Info</h4>
            <p><Mail size={16} /> {settings.contactEmail}</p>
            <p><Phone size={16} /> {settings.contactPhone}</p>
            <p><MapPin size={16} /> {settings.businessAddress}</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{settings.footerText}</p>
        </div>
      </div>
    </footer>
  );
}
