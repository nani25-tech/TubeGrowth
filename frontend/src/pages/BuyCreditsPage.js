import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';

const premiumPackages = [
  { label: '₹10 - 100 credits', amount: 10 },
  { label: '₹50 - 500 credits', amount: 50 },
  { label: '₹100 - 1000 credits', amount: 100 },
];

const BuyCreditsPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryAmount = Number(params.get('amount') || localStorage.getItem('selectedBuyAmount') || 50);
    if ([10, 50, 100].includes(queryAmount)) {
      setSelectedAmount(queryAmount);
    }
  }, [location.search]);

  const loadRazorpayIfMissing = () => {
    if (window.Razorpay) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBuy = async () => {
    if (!user || user.isGuest) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);

      const sdkLoaded = await loadRazorpayIfMissing();
      if (!sdkLoaded || !window.Razorpay) {
        alert('Payment SDK failed to load. Please try again.');
        return;
      }

      const orderRes = await userAPI.createPaymentOrder({ amountINR: Number(selectedAmount) });
      const order = orderRes?.data?.order;
      const keyId = orderRes?.data?.keyId;

      if (!order || !keyId) {
        alert('Unable to create payment order. Please try again.');
        return;
      }

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'TubeGrowth',
        description: `Buy ${orderRes?.data?.creditsToAdd || ''} credits`,
        order_id: order.id,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#f59e0b',
        },
        handler: async (response) => {
          try {
            const verifyRes = await userAPI.verifyPayment(response);
            if (verifyRes?.data?.user) {
              updateUser(verifyRes.data.user);
            }
            alert('Payment successful. Credits added to your account.');
          } catch (verifyError) {
            console.error(verifyError);
            alert('Payment completed but verification failed. Contact support.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', () => {
        setLoading(false);
        alert('Payment failed. Please try again.');
      });
      paymentObject.open();
    } catch (err) {
      console.error(err);
      alert('Purchase failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-white mb-6">
          <h1 className="text-3xl font-bold">Buy Credits</h1>
          <p className="text-sm text-gray-300">Purchase credits and use them on any service. Credits never expire.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {premiumPackages.map((pkg) => (
            <div key={pkg.amount} className={`p-6 rounded-lg ${selectedAmount === pkg.amount ? 'border-2 border-yellow-500' : 'border'} bg-white`}>
              <div className="text-lg font-bold mb-2">{pkg.label.split(' - ')[1]}</div>
              <div className="text-2xl font-extrabold mb-4">{pkg.label.split(' - ')[0]}</div>
              <p className="text-sm text-gray-600 mb-4">Best value package</p>
              <button
                className={`w-full py-2 rounded ${selectedAmount === pkg.amount ? 'bg-yellow-500 text-white' : 'bg-primary text-white'}`}
                onClick={() => setSelectedAmount(pkg.amount)}
              >
                Select
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 max-w-sm">
          <div className="bg-white p-4 rounded">
            <label className="text-sm text-gray-600">Custom INR amount (fallback: 1 INR = 1 credit)</label>
            <input
              type="number"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2 mt-2"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleBuy}
                disabled={loading}
                className="flex-1 bg-yellow-500 text-white py-2 rounded font-bold hover:bg-yellow-600"
              >
                {loading ? 'Processing...' : `Buy for ₹${selectedAmount}`}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-bold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCreditsPage;
