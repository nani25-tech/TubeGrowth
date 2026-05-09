import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const BuyCreditsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(searchParams.get('amount') || '50');

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated || !user?.youtubeChannelId) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user?.youtubeChannelId, navigate]);

  // Define packages
  const packages = [
    { amount: 10, credits: 100, label: 'Premium Pack', badge: null },
    { amount: 50, credits: 500, label: 'Premium Pack', badge: 'BEST VALUE' },
    { amount: 100, credits: 1000, label: 'Premium Pack', badge: null },
  ];

  // Guard: don't render if not authenticated
  if (!isAuthenticated || !user?.youtubeChannelId) {
    return null;
  }

  const handleSelectPackage = (amount) => {
    navigate(`/checkout?amount=${amount}`);
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-glass">
        <div className="container-custom py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-white hover:opacity-80 transition-opacity"
          >
            TUBE<span className="text-yellow-400">BOOST</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <span>💰</span>
            <span className="font-bold">{user?.credits ?? 1000} Credits</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container-custom py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Buy Credits
            </h1>
            <p className="text-text-secondary text-lg">
              Choose a package and get instant credits to boost your channel
            </p>
          </div>

          {/* Credit Packages Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {packages.map((pkg) => (
              <div
                key={pkg.amount}
                className={`card relative overflow-hidden transition-all ${
                  pkg.badge ? 'ring-2 ring-yellow-400 scale-105' : 'hover:scale-105'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute top-4 right-4 bg-yellow-400 text-dark px-3 py-1 rounded text-sm font-bold">
                    {pkg.badge}
                  </div>
                )}

                <div className="p-8 text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">
                    {pkg.credits}
                  </div>
                  <div className="text-sm text-text-secondary mb-6">Credits</div>

                  <div className="bg-dark rounded p-4 mb-6">
                    <div className="text-2xl font-bold text-white mb-1">
                      Rs {pkg.amount}
                    </div>
                    <div className="text-xs text-text-secondary">
                      ${pkg.amount === 10 ? '1' : pkg.amount === 50 ? '15' : '50'}
                    </div>
                  </div>

                  <div className="text-sm text-text-secondary mb-8">
                    {pkg.label}
                  </div>

                  <button
                    onClick={() => handleSelectPackage(pkg.amount)}
                    className="btn-primary w-full py-3 font-bold"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="bg-dark rounded-lg border border-glass p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-4">🔒 Secure Payment</h3>
            <p className="text-text-secondary mb-4">
              Your payment is processed securely through Razorpay. All transactions are encrypted and protected.
            </p>
            <div className="flex justify-center items-center gap-4 text-sm text-text-secondary">
              <span>✓ Instant Credits</span>
              <span>•</span>
              <span>✓ Secure Payment</span>
              <span>•</span>
              <span>✓ 24/7 Support</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuyCreditsPage;
