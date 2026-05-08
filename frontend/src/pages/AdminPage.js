import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../utils/api';

const AdminPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [statsRes, paymentsRes] = await Promise.all([
          adminAPI.getSystemStats(),
          adminAPI.getPayments(),
        ]);

        if (!isMounted) return;

        setStats(statsRes.data?.stats || null);
        setPayments(paymentsRes.data?.transactions || []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Unable to load admin data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user?.isAdmin) {
      loadAdminData();
    } else {
      setLoading(false);
      setError('Admin access required');
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-dark pt-24 px-4 text-center text-white">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-300">Payments, credits and system summary.</p>
        </div>

        {loading && <div className="text-white">Loading...</div>}
        {error && <div className="mb-6 rounded bg-red-600/20 border border-red-500 text-white p-4">{error}</div>}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded bg-white p-4">
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </div>
            <div className="rounded bg-white p-4">
              <div className="text-sm text-gray-500">Banned Users</div>
              <div className="text-2xl font-bold">{stats.bannedUsers}</div>
            </div>
            <div className="rounded bg-white p-4">
              <div className="text-sm text-gray-500">Credits in System</div>
              <div className="text-2xl font-bold">{stats.totalCreditsInSystem}</div>
            </div>
          </div>
        )}

        <div className="rounded bg-white overflow-hidden">
          <div className="px-4 py-3 border-b font-bold">Recent Payments</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Credits</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Order</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.orderId} className="border-t">
                    <td className="p-3">{payment.user?.name || 'Unknown'}</td>
                    <td className="p-3">₹{payment.amountINR}</td>
                    <td className="p-3">{payment.creditsToAdd}</td>
                    <td className="p-3">{payment.status}</td>
                    <td className="p-3">{payment.orderId}</td>
                  </tr>
                ))}
                {!loading && payments.length === 0 && (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan="5">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;