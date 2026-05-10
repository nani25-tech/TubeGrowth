import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(searchParams.get('amount') || '50');

  // Check authentication on mount and Razorpay script
  useEffect(() => {
    if (!isAuthenticated || !user?.youtubeChannelId) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (!window.Razorpay) {
      setError('Razorpay checkout is not loaded. Please refresh the page.');
    }
  }, [isAuthenticated, user?.youtubeChannelId, navigate]);

  // Define packages and credit mapping
  const packages = [
    { amount: 10, credits: 100, label: 'Premium Pack', badge: null },
    { amount: 50, credits: 500, label: 'Premium Pack', badge: 'BEST VALUE' },
    { amount: 100, credits: 1000, label: 'Premium Pack', badge: null },
  ];

  const creditsByAmount = {
    10: 100,
    50: 500,
    100: 1000,
  };

  // Guard: don't render if not authenticated
  if (!isAuthenticated || !user?.youtubeChannelId) {
    return null;
  }

  const handlePayment = async (amountParam) => {
    // amountParam (optional) allows immediate checkout from a package button
    const amountToUse = amountParam ? String(amountParam) : selectedAmount;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout', search: `?amount=${amountToUse}` } } });
      return;
    }

    setSelectedAmount(String(amountToUse));
    setLoading(true);
    setError(null);

    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'https://tubegrowth.onrender.com';
      const response = await fetch(`${apiBase}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amountToUse) * 100 }), // Convert to paise
      });
      
      if (!response.ok) {
        // If backend endpoint is missing (404), fall back to client-only Razorpay checkout
        if (response.status === 404) {
          const fallbackKey = process.env.REACT_APP_RAZORPAY_KEY_ID || '';
          const amountPaise = Number(amountToUse) * 100;
          if (!fallbackKey) throw new Error('Server endpoint missing and Razorpay key not configured');
          // Open Razorpay directly (less secure) as temporary fallback
          const fallbackOptions = {
            key: fallbackKey,
            amount: amountPaise,
            currency: 'INR',
            name: 'TubeGrowth',
            description: `${creditsByAmount[amountToUse] || amountToUse} Credits for ${user?.name || user?.youtubeChannelId}`,
            prefill: { 
              name: user?.name || user?.youtubeChannelId || '', 
              email: user?.email || '' 
            },
            theme: { color: '#FBBF24' },
            handler: function(paymentResponse) {
              // Notify user and redirect — server verification still needed separately
              const creditsToAdd = creditsByAmount[amountToUse] || 0;
              navigate(`/dashboard?payment=success&amount=${amountToUse}&credits=${creditsToAdd}`);
            },
            modal: { ondismiss: () => setLoading(false) },
          };
          const rzpFallback = new window.Razorpay(fallbackOptions);
          rzpFallback.open();
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const order = data.order;
      const keyId = data.keyId;

      if (!order?.id || !keyId) {
        throw new Error('Unable to create payment order');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay is not loaded');
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'TubeGrowth',
        description: `${creditsByAmount[amountToUse] || amountToUse} Credits for ${user?.name || user?.youtubeChannelId}`,
        order_id: order.id,
        prefill: {
          name: user?.name || user?.youtubeChannelId || '',
          email: user?.email || '',
        },
        theme: { color: '#FBBF24' },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch(`${apiBase}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paymentResponse),
            });
            
            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              const creditsToAdd = creditsByAmount[amountToUse] || 0;
              navigate(`/dashboard?payment=success&amount=${amountToUse}&credits=${creditsToAdd}`);
              return;
            }
            throw new Error('Payment verification failed');
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Unable to open payment checkout');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark pt-20">
      {/* PROMO BANNER - reuse index/home layout */}
      <div className="bg-dark py-6 mb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="border-2 border-yellow-400/50 rounded-lg py-4 px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 uppercase tracking-wide">
              FREE YOUTUBE SUBSCRIBERS & FREE YOUTUBE LIKES
            </h2>
          </div>
        </div>
      </div>

      {/* HERO + PACKAGES - match index.html / HomePage structure */}
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
          BUY CREDITS FOR YOUR CHANNEL<br />
          FAST, SECURE & RELIABLE
        </h1>

        <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">
          Choose a credits package below and proceed to secure checkout powered by Razorpay.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`relative bg-gradient-to-b from-slate-800 to-slate-900 border-2 rounded-2xl p-8 text-center transition-all cursor-pointer hover:border-yellow-400 ${
                selectedAmount === String(pkg.amount) ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50' : 'border-slate-700'
              }`}
              onClick={() => setSelectedAmount(String(pkg.amount))}
            >
              {pkg.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-400 text-dark px-4 py-1 rounded-full text-xs font-bold">
                    {pkg.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-5xl md:text-6xl font-bold text-white mb-2">{pkg.credits.toLocaleString()}</p>
                <p className="text-gray-400 text-lg font-semibold">CREDITS</p>
              </div>

              <div className="mb-8">
                <p className="text-white text-2xl md:text-3xl font-bold mb-2">
                  ₹{pkg.amount}
                </p>
                <p className="text-gray-400">{pkg.label}</p>
              </div>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const amt = String(pkg.amount);
                  setSelectedAmount(amt);
                  setLoading(false);
                  setError(null);
                  await handlePayment(amt);
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-dark font-bold py-3 px-6 rounded-xl transition-all text-lg"
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>

        <div className="py-12"></div>
      </div>
    </div>
  );
};

export default CheckoutPage;
