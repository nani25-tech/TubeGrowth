import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authStorage } from '../utils/storage';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const balance = user?.credits ?? 1000;
  const isLoggedIn = authStorage.isAuthenticated();

  const handleBuyCredits = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: '/buy', search: '' } } });
      return;
    }

    navigate('/buy');
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-glass">
      <div className="container-custom py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">
            TUBE<span className="text-yellow-400">BOOST</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#services" className="text-text-secondary hover:text-white transition-colors">
            Services
          </a>
          <a href="#how-it-works" className="text-text-secondary hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#reviews" className="text-text-secondary hover:text-white transition-colors">
            Reviews
          </a>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleBuyCredits} className="btn-primary text-sm py-2 px-4">
            Buy Credits
          </button>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <span>💰</span>
            <span className="font-bold">{balance} Credits</span>
          </div>
        </div>
      </div>
    </header>
  );
};