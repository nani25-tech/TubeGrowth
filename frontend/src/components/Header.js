import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header = () => {
  const { user } = useAuth();
  const balance = user?.credits ?? 1000;

  return (
    <header className="sticky top-0 z-40 glass border-b border-glass">
      <div className="container-custom py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white">
            TB
          </div>
          <span className="text-xl font-bold text-white hidden sm:inline">
            TubeGrowth
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-text-secondary hover:text-white transition-colors">
            Home
          </Link>
          <Link
            to="/dashboard"
            className="text-text-secondary hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/campaigns"
            className="text-text-secondary hover:text-white transition-colors"
          >
            Campaigns
          </Link>
          <Link
            to="/earn"
            className="text-text-secondary hover:text-white transition-colors"
          >
            Earn Credits
          </Link>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">💰</span>
                <span className="font-bold text-white">{balance}</span>
              </div>
              <div className="text-sm text-text-secondary">
                {user.isGuest ? 'Guest' : user.name}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};