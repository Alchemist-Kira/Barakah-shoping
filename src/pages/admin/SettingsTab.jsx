import React, { useState, useEffect } from 'react';
import { Save, Lock, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    shippingChargeInside: 60,
    shippingChargeOutside: 120,
    storeName: 'Barakah',
    contactEmail: 'contact@barakah.com',
    contactPhone: '+880 1234-567890',
    businessAddress: 'Dhaka, Bangladesh',
    whatsapp: '',
    facebook: '',
    instagram: '',
    announcement: 'Welcome to Barakah! Enjoy our new collection.',
    footerText: '© 2026 Barakah. All Rights Reserved.'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const { token } = useAuth();

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '', username: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.app_settings) setSettings(JSON.parse(data.app_settings));
    } catch (e) { console.error("Failed to load settings:", e); }
    finally { setIsLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: 'app_settings', value: settings })
      });
      if (res.ok) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (e) { setMessage({ text: 'Failed to save.', type: 'error' }); }
    finally { setIsSaving(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: name.includes('shipping') ? Number(value) : value }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });
    if (passwordData.new && passwordData.new.length < 6) { setPasswordMessage({ text: 'Min 6 characters required.', type: 'error' }); return; }
    if (passwordData.new && passwordData.new !== passwordData.confirm) { setPasswordMessage({ text: 'Passwords do not match.', type: 'error' }); return; }
    if (passwordData.username && passwordData.username.trim().length < 3) { setPasswordMessage({ text: 'Username must be at least 3 characters.', type: 'error' }); return; }
    if (!passwordData.new && !passwordData.username) { setPasswordMessage({ text: 'Enter a new username or password to update.', type: 'error' }); return; }
    setIsChangingPassword(true);
    try {
      const hash = async (pwd) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      };
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPasswordHash: await hash(passwordData.current),
          ...(passwordData.new ? { newPasswordHash: await hash(passwordData.new) } : {}),
          ...(passwordData.username ? { newUsername: passwordData.username.trim() } : {})
        })
      });
      const data = await res.json();
      if (res.ok) { setPasswordMessage({ text: 'Credentials updated!', type: 'success' }); setPasswordData({ current: '', new: '', confirm: '', username: '' }); }
      else { setPasswordMessage({ text: data.error || 'Failed.', type: 'error' }); }
    } catch { setPasswordMessage({ text: 'Network error.', type: 'error' }); }
    finally { setIsChangingPassword(false); setTimeout(() => setPasswordMessage({ text: '', type: '' }), 4000); }
  };

  if (isLoading) return <div className="admin-loading">Loading settings...</div>;

  const s = {
    card: { backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EAECF0', padding: '1.5rem' },
    label: { fontSize: '0.875rem', fontWeight: 600, color: '#344054', marginBottom: '6px', display: 'block' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '1rem', color: '#101828', backgroundColor: '#fff', outline: 'none' },
    heading: { fontSize: '1.05rem', fontWeight: 700, color: '#101828', margin: '0 0 1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #F2F4F7' },
    field: { marginBottom: '14px' },
    pair: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }
  };

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {message.text && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
          backgroundColor: message.type === 'success' ? '#12B76A' : '#F04438', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          {message.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 className="admin-tab-title" style={{ margin: 0, fontSize: '1.5rem' }}>Settings</h2>
        <button onClick={handleSave} disabled={isSaving} className="btn-add-product"
          style={{ padding: '8px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* Main 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>

          {/* Left column: Store + Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Store */}
            <div style={s.card}>
              <h3 style={s.heading}>Store Information</h3>
              <div style={s.field}>
                <label style={s.label}>Store Name</label>
                <input style={s.input} name="storeName" value={settings.storeName} onChange={handleChange} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Business Address</label>
                <input style={s.input} name="businessAddress" value={settings.businessAddress} onChange={handleChange} placeholder="Dhaka, Bangladesh" />
              </div>
              <div>
                <label style={s.label}>Announcement Bar</label>
                <input style={s.input} name="announcement" value={settings.announcement} onChange={handleChange} placeholder="e.g. Free shipping over ৳5000" />
              </div>
            </div>

            {/* Contact */}
            <div style={s.card}>
              <h3 style={s.heading}>Contact & Support</h3>
              <div style={s.pair}>
                <div>
                  <label style={s.label}>Email</label>
                  <input style={s.input} type="email" name="contactEmail" value={settings.contactEmail} onChange={handleChange} required />
                </div>
                <div>
                  <label style={s.label}>Phone</label>
                  <input style={s.input} name="contactPhone" value={settings.contactPhone} onChange={handleChange} required />
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Shipping + Social */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Shipping */}
            <div style={s.card}>
              <h3 style={s.heading}>Shipping Rates</h3>
              <div style={s.pair}>
                <div>
                  <label style={s.label}>Inside Dhaka (৳)</label>
                  <input style={s.input} type="number" name="shippingChargeInside" value={settings.shippingChargeInside} onChange={handleChange} required />
                </div>
                <div>
                  <label style={s.label}>Outside Dhaka (৳)</label>
                  <input style={s.input} type="number" name="shippingChargeOutside" value={settings.shippingChargeOutside} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* Social */}
            <div style={s.card}>
              <h3 style={s.heading}>Social Links</h3>
              <div style={s.pair}>
                <div>
                  <label style={s.label}>WhatsApp</label>
                  <input style={s.input} name="whatsapp" value={settings.whatsapp} onChange={handleChange} placeholder="+880..." />
                </div>
                <div>
                  <label style={s.label}>Facebook</label>
                  <input style={s.input} name="facebook" value={settings.facebook} onChange={handleChange} placeholder="fb.com/..." />
                </div>
              </div>
              <div>
                <label style={s.label}>Instagram</label>
                <input style={s.input} name="instagram" value={settings.instagram} onChange={handleChange} placeholder="@brand" />
              </div>
            </div>
          </div>

          {/* Full-width: Footer */}
          <div style={{ ...s.card, gridColumn: '1 / -1' }}>
            <h3 style={s.heading}>Footer</h3>
            <div>
              <label style={s.label}>Copyright Text</label>
              <input style={s.input} name="footerText" value={settings.footerText} onChange={handleChange} />
            </div>
          </div>
        </div>
      </form>

      {/* Password — full width */}
      <div style={{ ...s.card, marginTop: '1.5rem', borderColor: '#FEE4E2' }}>
        <h3 style={{ ...s.heading, display: 'flex', alignItems: 'center', gap: '8px', borderColor: '#FEE4E2' }}>
          <Lock size={16} color="#F04438" /> Change Password
        </h3>

        {passwordMessage.text && (
          <div style={{
            padding: '6px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem', fontWeight: 600,
            backgroundColor: passwordMessage.type === 'success' ? '#ECFDF3' : '#FEF3F2',
            color: passwordMessage.type === 'success' ? '#027A48' : '#B42318',
            border: `1px solid ${passwordMessage.type === 'success' ? '#A6F4C5' : '#FECDCA'}`
          }}>
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange}>
          {/* Username */}
          <div style={{ marginBottom: '14px' }}>
            <label style={s.label}>New Username <span style={{ fontWeight: 400, color: '#98A2B3' }}>(optional)</span></label>
            <input
              value={passwordData.username}
              onChange={(e) => setPasswordData(p => ({ ...p, username: e.target.value }))}
              placeholder="Leave empty to keep current"
              style={{ ...s.input, maxWidth: '340px' }}
            />
          </div>
          {/* Passwords */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { key: 'current', lbl: 'Current Password', ph: 'Required to save', req: true },
              { key: 'new', lbl: 'New Password', ph: 'Leave empty to keep current', req: false },
              { key: 'confirm', lbl: 'Confirm Password', ph: 'Re-enter new password', req: false }
            ].map(({ key, lbl, ph, req }) => (
              <div key={key}>
                <label style={s.label}>{lbl}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords[key] ? 'text' : 'password'}
                    required={req} value={passwordData[key]}
                    onChange={(e) => setPasswordData(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{ ...s.input, paddingRight: '34px' }}
                  />
                  <button type="button"
                    onClick={() => setShowPasswords(p => ({ ...p, [key]: !p[key] }))}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', display: 'flex', padding: '2px' }}>
                    {showPasswords[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={isChangingPassword}
            style={{
              backgroundColor: '#F04438', color: '#fff', border: 'none', padding: '8px 18px',
              borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              opacity: isChangingPassword ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px'
            }}>
            <Lock size={14} /> {isChangingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Responsive: stack columns on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .animate-fade-in [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
          .animate-fade-in [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
