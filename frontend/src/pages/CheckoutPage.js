import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(searchParams.get('amount') || '50');

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

  const creditsToAdd = creditsByAmount[selectedAmount] || selectedAmount;

  useEffect(() => {
    if (!window.Razorpay) {
      setError('Razorpay checkout is not loaded. Please refresh the page.');
    }
  }, []);

  const handlePayment = async (amountParam) => {
    // amountParam (optional) allows immediate checkout from a package button
    const amountToUse = amountParam ? String(amountParam) : selectedAmount;
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
            description: `Buy ${creditsByAmount[amountToUse] || amountToUse} Credits`,
            prefill: { name: '', email: '' },
            theme: { color: '#FBBF24' },
            handler: function(paymentResponse) {
              // Notify user and redirect — server verification still needed separately
              navigate('/dashboard?payment=success');
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
        description: `Buy ${creditsByAmount[amountToUse] || amountToUse} Credits`,
        order_id: order.id,
        prefill: {
          name: '',
          email: '',
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
              navigate('/dashboard?payment=success');
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
    <div className="min-h-screen bg-dark pt-20 pb-12">
      {/* PACKAGES SECTION */}
      <div className="max-w-6xl mx-auto px-4 mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          SELECT YOUR CREDIT PACKAGE
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  ₹{pkg.amount} / ${Math.round(pkg.amount / 33.5)}
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
                  // immediately start payment for this package
                  await handlePayment(amt);
                }}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-dark font-bold py-3 px-6 rounded-xl transition-all text-lg"
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ORDER & PAYMENT SECTION */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ORDER SUMMARY */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <div className="bg-primary text-white p-6">
              <h2 className="text-2xl font-bold">ORDER SUMMARY</h2>
            </div>
            <div className="p-8">
              <div className="mb-6">
                <p className="text-gray-600 text-sm uppercase tracking-wide mb-2">Credits Package</p>
                <p className="text-4xl font-bold text-dark">{creditsToAdd}</p>
                <p className="text-gray-500 text-sm mt-1">Credits</p>
              </div>

              <hr className="my-6" />

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Price (INR)</span>
                  <span className="font-bold text-lg">₹{selectedAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Tax</span>
                  <span className="font-bold text-lg">₹0</span>
                </div>
              </div>

              <hr className="my-6" />

              <div className="flex justify-between items-center mb-8">
                <span className="text-lg font-bold text-dark">TOTAL</span>
                <span className="text-3xl font-bold text-primary">₹{selectedAmount}</span>
              </div>

              <div className="bg-blue-50 border-l-4 border-primary p-4 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Credits are added immediately after successful payment. You can use them to boost your YouTube channel.
                </p>
              </div>
            </div>
          </div>

          {/* PAYMENT SECTION */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <div className="bg-primary text-white p-6">
              <h2 className="text-2xl font-bold">PAYMENT</h2>
            </div>
            <div className="p-8">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-6">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-bold text-dark mb-4">Select Payment Method</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Click the button below to proceed with Razorpay checkout. You can pay using:
                </p>
                <ul className="text-gray-600 text-sm space-y-2 mb-6">
                  <li>✓ UPI (Google Pay, PhonePe, Paytm, etc.)</li>
                  <li>✓ Debit/Credit Cards</li>
                  <li>✓ Net Banking</li>
                  <li>✓ Digital Wallets</li>
                  <li>✓ BNPL (Buy Now Pay Later)</li>
                </ul>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-primary hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
              >
                {loading ? 'Opening Checkout...' : `Pay ₹${selectedAmount} and Get ${creditsToAdd} Credits`}
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-dark font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <div className="mt-8 pt-6 border-t">
                <p className="text-xs text-gray-500 text-center">
                  <i className="bi bi-shield-lock"></i> Secured by Razorpay | Safe & Secure Payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
