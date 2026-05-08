import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const CampaignsPage = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [campaigns] = useState([
    {
      id: 1,
      channelName: 'Tech Review Channel',
      type: 'Subscribers',
      target: 100,
      current: 45,
      cost: 500,
      status: 'active'
    },
    {
      id: 2,
      channelName: 'Music Production',
      type: 'Likes',
      target: 1000,
      current: 620,
      cost: 250,
      status: 'active'
    },
    {
      id: 3,
      channelName: 'Vlog Channel',
      type: 'Views',
      target: 10000,
      current: 7800,
      cost: 750,
      status: 'completed'
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    channelUrl: '',
    serviceType: 'subscribers',
    quantity: 100,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : value
    }));
  };

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!formData.channelUrl || !formData.serviceType) {
      error('Please fill in all fields');
      return;
    }
    success('Campaign created successfully!');
    setShowCreateForm(false);
    setFormData({ channelUrl: '', serviceType: 'subscribers', quantity: 100 });
  };

  return (
    <div className="min-h-screen bg-dark pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* HEADER */}
        <div className="bg-primary text-white rounded-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">BOOST YOUR CHANNEL</h1>
              <p className="text-lg">Create campaigns to grow your YouTube presence</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-white text-primary px-6 py-3 rounded font-bold hover:bg-gray-100 transition"
            >
              {showCreateForm ? 'Cancel' : '+ New Campaign'}
            </button>
          </div>
        </div>

        {/* CREATE CAMPAIGN FORM */}
        {showCreateForm && (
          <div className="bg-secondary rounded-lg p-8 mb-8 border-2 border-primary">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Campaign</h2>
            <form onSubmit={handleCreateCampaign} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-bold mb-2">YouTube Channel URL</label>
                  <input
                    type="text"
                    name="channelUrl"
                    value={formData.channelUrl}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full bg-dark text-white px-4 py-2 rounded border border-accent focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-white font-bold mb-2">Service Type</label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    className="w-full bg-dark text-white px-4 py-2 rounded border border-accent focus:outline-none focus:border-primary"
                  >
                    <option value="subscribers">Subscribers</option>
                    <option value="likes">Likes</option>
                    <option value="views">Views</option>
                    <option value="comments">Comments</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white font-bold mb-2">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="10"
                    className="w-full bg-dark text-white px-4 py-2 rounded border border-accent focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-white font-bold mb-2">Estimated Cost</label>
                  <input
                    type="text"
                    disabled
                    value={`${formData.quantity * 5} Credits`}
                    className="w-full bg-dark text-accent px-4 py-2 rounded border border-accent cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-3 rounded font-bold hover:bg-red-700 transition"
              >
                Create Campaign
              </button>
            </form>
          </div>
        )}

        {/* ACTIVE CAMPAIGNS */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Active Campaigns</h2>
          <div className="space-y-4">
            {campaigns.filter(c => c.status === 'active').map(campaign => (
              <div key={campaign.id} className="bg-secondary rounded-lg p-6 border border-accent">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{campaign.channelName}</h3>
                    <p className="text-text-secondary">{campaign.type} Campaign</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{campaign.current}/{campaign.target}</div>
                    <p className="text-text-secondary text-sm">Cost: {campaign.cost} credits</p>
                  </div>
                </div>
                <div className="w-full bg-dark rounded-full h-2 mb-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${(campaign.current / campaign.target) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right text-sm text-text-secondary">
                  {Math.round((campaign.current / campaign.target) * 100)}% Complete
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPLETED CAMPAIGNS */}
        {campaigns.filter(c => c.status === 'completed').length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Completed Campaigns</h2>
            <div className="space-y-4">
              {campaigns.filter(c => c.status === 'completed').map(campaign => (
                <div key={campaign.id} className="bg-secondary rounded-lg p-6 border border-success opacity-75">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{campaign.channelName}</h3>
                      <p className="text-success">✓ Completed</p>
                    </div>
                    <div className="text-success text-2xl font-bold">{campaign.target}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
