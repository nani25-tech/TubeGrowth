

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
import { ChannelLoginPage } from './pages/ChannelLoginPage';
import { useAuth } from './context/AuthContext';
import './index.css';

function RequireChannelAccess({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-dark" />;
  }

  if (!isAuthenticated || !user?.youtubeChannelId) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return children;
}

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
      <Route path="/login" element={<ChannelLoginPage />} />
      <Route
        path="/"
        element={
          <RequireChannelAccess>
            <HomePage />
          </RequireChannelAccess>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireChannelAccess>
            <DashboardPage />
          </RequireChannelAccess>
        }
      />
      <Route
        path="/campaigns"
        element={
          <RequireChannelAccess>
            <CampaignsPage />
          </RequireChannelAccess>
        }
      />
      <Route
        path="/earn"
        element={
          <RequireChannelAccess>
            <EarnPage />
          </RequireChannelAccess>
        }
      />
      <Route
        path="/buy"
        element={
          <RequireChannelAccess>
            <BuyCreditsPage />
          </RequireChannelAccess>
        }
      />
      <Route
        path="/checkout"
        element={
          <RequireChannelAccess>
            <CheckoutPage />
          </RequireChannelAccess>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const showGlobalChrome = !['/', '/checkout', '/login'].includes(location.pathname);

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
