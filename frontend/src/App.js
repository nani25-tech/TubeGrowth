

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header, Footer } from './components';
import { ToastContainer } from './components';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { EarnPage } from './pages/EarnPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { BuyCreditsPage, CheckoutPage } from './pages';
import './index.css';

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle GitHub Pages 404 redirect
    const redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect !== window.location.pathname) {
      navigate(redirect, { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/earn" element={<EarnPage />} />
      <Route path="/buy" element={<BuyCreditsPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const showGlobalChrome = location.pathname !== '/' && location.pathname !== '/checkout';

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {showGlobalChrome ? <Header /> : null}
      <main className="flex-grow">
        <AppRoutes />
      </main>
      {showGlobalChrome ? <Footer /> : null}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
