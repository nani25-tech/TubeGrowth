

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header, Footer } from './components';
import { ToastContainer } from './components';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { EarnPage } from './pages/EarnPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { BuyCreditsPage } from './pages';
import './index.css';





function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-dark flex flex-col">
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/earn" element={<EarnPage />} />
                <Route path="/buy" element={<BuyCreditsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
