import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ChannelLoginPage = () => {
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState('');
  const { channelLogin, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname || '/';
  const fromSearch = location.state?.from?.search || '';
  const from = `${fromPath}${fromSearch}`;

  useEffect(() => {
    if (isAuthenticated && user?.youtubeChannelId) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, navigate, user?.youtubeChannelId]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedChannelId = channelId.trim();
    if (!trimmedChannelId) {
      setError('Please enter your YouTube Channel ID.');
      return;
    }

    channelLogin(trimmedChannelId, channelName.trim() || trimmedChannelId);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,0,0.14),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-10 shadow-2xl shadow-black/30">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-red-400 mb-6">
            Channel Login Required
          </div>
          <h1 className="font-black text-4xl md:text-6xl leading-tight uppercase tracking-tight">
            Enter your <span className="text-red-500">YouTube Channel ID</span>
          </h1>
          <p className="mt-5 text-gray-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Login with your channel ID first. After that, you can use the dashboard, campaigns, earn page, and checkout.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-[0.25em] text-red-400 mb-2">Channel ID</label>
            <input
              type="text"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
              placeholder="UCXsx4kQEJslMrdAtm-mayuw"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.25em] text-red-400 mb-2">Channel Name optional</label>
            <input
              type="text"
              value={channelName}
              onChange={(event) => setChannelName(event.target.value)}
              placeholder="TubeBoost Official"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-red-500"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-red-500 px-6 py-4 text-lg font-black uppercase tracking-wide text-white hover:bg-red-600 transition-colors"
          >
            Continue
          </button>
        </form>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-center text-xs text-gray-400">
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">Dashboard access</div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">Earn credits</div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">Buy packages</div>
        </div>
      </div>
    </div>
  );
};

export default ChannelLoginPage;
