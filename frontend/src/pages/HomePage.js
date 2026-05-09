import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const [channelInput, setChannelInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleChannelSearch = async () => {
    if (!channelInput.trim()) return;
    setIsSearching(true);
    // TODO: Implement YouTube channel lookup via backend API
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-dark pt-20">
      {/* PROMO BANNER */}
      <div className="bg-dark py-6 mb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="border-2 border-yellow-400/50 rounded-lg py-4 px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 uppercase tracking-wide">
              FREE YOUTUBE SUBSCRIBERS & FREE YOUTUBE LIKES
            </h2>
          </div>
        </div>
      </div>

      {/* MAIN HERO SECTION */}
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
          GROW YOUR <span className="text-white">YOUTUBE CHANNEL</span><br />
          FASTER THAN EVER<br />
          BEFORE!
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-3xl mx-auto leading-relaxed">
          TubeBoost is the best platform to boost your YouTube channel with thousands of real youtube subscribers.
        </p>

        {/* SEARCH FORM */}
        <div className="bg-dark-secondary border border-text-secondary/30 rounded-2xl p-8 mb-12 max-w-2xl mx-auto">
          <h3 className="text-white text-lg font-bold mb-6 text-left">
            Enter YouTube Channel Link / Channel ID:
          </h3>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="UCXsx4kQEJslMrdAtm-mayuw"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChannelSearch()}
              className="flex-1 bg-dark-tertiary text-white placeholder-gray-500 px-6 py-3 rounded-lg border border-text-secondary/20 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            <button
              onClick={handleChannelSearch}
              disabled={isSearching}
              className="bg-yellow-400 text-dark font-bold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {isSearching ? 'SEARCHING...' : 'SEARCH CHANNEL'}
            </button>
          </div>
          
          <a href="#" className="text-text-secondary text-sm hover:text-white transition-colors">
            Where I can find my YouTube Channel ID
          </a>
        </div>

        {/* CTA BUTTON */}
        <button
          onClick={() => navigate('/campaigns')}
          className="bg-yellow-400 text-dark font-bold text-lg px-8 py-4 rounded-lg hover:bg-yellow-300 transition-colors inline-flex items-center gap-2 uppercase tracking-wide"
        >
          <span>📊</span> ANALYZE YOUR YOUTUBE VIDEOS FOR FREE
        </button>
      </div>

      {/* SPACER */}
      <div className="py-12"></div>
    </div>
  );
};

export default HomePage;
