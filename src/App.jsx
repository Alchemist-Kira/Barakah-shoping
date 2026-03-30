import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Store from './pages/Store';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import AdminDashboard from './pages/admin/Dashboard';
import Login from './pages/admin/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Security Guard: Automatically logs out temporary users when they leave the dashboard
const SecurityGuard = ({ children }) => {
  const { isAdmin, isPersistent, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If logged in via temporary session (not persistent) and leaves dashboard...
    if (isAdmin && !isPersistent && !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/login')) {
      console.log("Strict Security: Logging out temporary session after navigation.");
      logout();
    }
  }, [location, isAdmin, isPersistent, logout]);

  return children;
};

const StoreLayout = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <SecurityGuard>
          <CartProvider>
            <Routes>
              <Route element={<StoreLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/store" element={<Store />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
              </Route>

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<div style={{ textAlign: 'center', padding: '10rem 2rem' }}><h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p></div>} />
            </Routes>
          </CartProvider>
        </SecurityGuard>
      </AuthProvider>
    </Router>
  );
}

export default App;
