import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-dark pt-20">
      {/* HERO SECTION */}
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          GROW YOUR <span className="text-primary">YOUTUBE</span> CHANNEL
        </h1>
        <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
          Get real subscribers, genuine likes, and authentic views from active YouTube users. 
          No bots. No fake accounts. 100% organic growth.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-secondary rounded-lg p-6">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">Real Subscribers</h3>
            <p className="text-text-secondary">Genuine subscribers interested in your niche.</p>
          </div>
          <div className="bg-secondary rounded-lg p-6">
            <div className="text-4xl mb-4">👍</div>
            <h3 className="text-xl font-bold text-white mb-2">Video Likes</h3>
            <p className="text-text-secondary">Boost your like-to-view ratio instantly.</p>
          </div>
          <div className="bg-secondary rounded-lg p-6">
            <div className="text-4xl mb-4">👁️</div>
            <h3 className="text-xl font-bold text-white mb-2">Video Views</h3>
            <p className="text-text-secondary">High retention views from real users.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <a href="/earn" className="btn-primary inline-block">
            Earn Credits
          </a>
          <a href="/campaigns" className="btn-secondary inline-block">
            Boost Your Channel
          </a>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="bg-secondary py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <p className="text-text-secondary">Active Users</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">2.4M+</div>
              <p className="text-text-secondary">Subscribers Delivered</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-success mb-2">95M+</div>
              <p className="text-text-secondary">Views Driven</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">4.9/5</div>
              <p className="text-text-secondary">User Rating</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
