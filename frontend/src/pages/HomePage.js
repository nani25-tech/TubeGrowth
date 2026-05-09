import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const stats = [
  { icon: 'bi-people-fill', label: '2.4M+ Subscribers Delivered' },
  { icon: 'bi-hand-thumbs-up-fill', label: '18M+ Likes Generated' },
  { icon: 'bi-play-circle-fill', label: '95M+ Views Driven' },
  { icon: 'bi-star-fill', label: '4.9/5 Average Rating' },
  { icon: 'bi-shield-check', label: '100% Safe & Secure' },
  { icon: 'bi-lightning-charge-fill', label: 'Delivery in 24-72 Hours' },
  { icon: 'bi-globe2', label: 'Global Real Users' },
  { icon: 'bi-trophy-fill', label: '10,000+ Channels Grown' },
];

const services = [
  { title: 'YouTube Subscribers', description: 'Grow your channel with stable subscriber packages.' },
  { title: 'YouTube Likes', description: 'Increase engagement with targeted like boosts.' },
  { title: 'YouTube Views', description: 'Promote videos with view-based campaigns.' },
];

const howItWorks = [
  {
    number: '01',
    icon: 'bi-send-check-fill',
    title: 'Submit Your Order',
    text: 'Fill out the form with your YouTube channel URL, choose your service, and select a package.',
  },
  {
    number: '02',
    icon: 'bi-gear-fill',
    title: 'We Process It',
    text: 'Our team activates your campaign using a real-user network and begins delivery after payment.',
  },
  {
    number: '03',
    icon: 'bi-graph-up-arrow',
    title: 'Watch It Grow',
    text: 'Track the progress as your numbers climb and your channel reach expands.',
  },
  {
    number: '04',
    icon: 'bi-rocket-takeoff-fill',
    title: 'Scale & Repeat',
    text: 'Once you see results, return monthly to keep the momentum going strong.',
  },
];

const testimonials = [
  {
    name: 'Alex Mercer',
    handle: 'Gaming Channel -+ 12.4K subs',
    text: 'I went from 800 to 5,400 subscribers in less than two weeks. The engagement feels organic and my videos are now getting recommended.',
  },
  {
    name: 'Priya Sharma',
    handle: 'Cooking Channel -+ 8.2K subs',
    text: 'Hit monetization in 3 weeks with TubeBoost. The team was responsive and the results were real.',
  },
  {
    name: 'Jordan Lee',
    handle: 'Music Channel -+ 6.7K subs',
    text: 'My music channel was stuck at 300 subs for months. After one month with TubeBoost I crossed 3,000.',
  },
];

const packages = [
  { amount: 10, credits: 100, label: 'Premium Pack', badge: null },
  { amount: 50, credits: 500, label: 'Premium Pack', badge: 'BEST VALUE' },
  { amount: 100, credits: 1000, label: 'Premium Pack', badge: null },
];

export const HomePage = () => {
  const [channelInput, setChannelInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleChannelSearch = async () => {
    if (!channelInput.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  const handlePay = (amount) => {
    navigate(`/checkout?amount=${amount}`);
  };

  return (
    <div className="min-h-screen bg-dark text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-1 text-2xl md:text-3xl font-black tracking-tight text-white">
            TUBE<span className="text-yellow-400">BOOST</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handlePay(50)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-95"
            >
              Buy Credits
            </button>
            <div className="hidden sm:flex items-center gap-2 text-yellow-400 text-sm font-bold">
              <span>💰</span>
              <span>1000 Credits</span>
            </div>
          </div>
        </div>
      </nav>

      <section id="top" className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-5xl border border-yellow-400/50 rounded-xl px-6 py-4 text-center">
            <p className="text-yellow-400 text-xl md:text-3xl font-bold uppercase tracking-wide">
              Free YouTube Subscribers & Free YouTube Likes
            </p>
          </div>

          <div className="max-w-5xl mx-auto text-center pt-16 md:pt-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs md:text-sm text-gray-300">
              <i className="bi bi-patch-check-fill text-yellow-400" />
              Trusted by 10,000+ YouTubers Worldwide
            </div>
            <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight uppercase">
              Grow your <span className="text-yellow-400">YouTube</span> channel fast
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base md:text-xl text-gray-300 leading-relaxed">
              Get real subscribers, genuine likes, and authentic views from active YouTube users. No bots. No fake accounts. 100% organic growth.
            </p>

            <div className="mt-10 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 text-left">
              <label htmlFor="channelSearch" className="block text-white text-lg font-bold mb-4">
                Enter YouTube Channel Link / Channel ID:
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  id="channelSearch"
                  type="text"
                  placeholder="UCXsx4kQEJslMrdAtm-mayuw"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()}
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-5 py-3 text-white placeholder:text-gray-500 outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  onClick={handleChannelSearch}
                  disabled={isSearching}
                  className="rounded-lg bg-yellow-400 px-6 py-3 font-bold text-dark hover:bg-yellow-300 disabled:opacity-50"
                >
                  {isSearching ? 'SEARCHING...' : 'SEARCH CHANNEL'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate('/campaigns')}
                className="mt-4 text-sm text-gray-300 hover:text-white"
              >
                Where I can find my YouTube Channel ID
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/campaigns')}
              className="mt-10 inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-6 py-4 text-lg font-black uppercase tracking-wide text-dark hover:bg-yellow-300"
            >
              <span>📊</span> Analyze your YouTube videos for free
            </button>
          </div>
        </div>
      </section>

      <div className="border-y border-white/5 bg-black/60 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-300">
          {stats.slice(0, 4).map((item) => (
            <div key={item.label} className="flex items-center gap-2 whitespace-nowrap">
              <i className={`bi ${item.icon} text-yellow-400`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 py-16" id="dashboard-preview">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="bg-primary px-6 py-4 text-2xl font-black">DASHBOARD</div>
            <div className="p-6 space-y-3 text-gray-300">
              <div className="text-sm uppercase tracking-wider text-yellow-400">Profile information</div>
              <div className="text-3xl font-black text-white">AD official</div>
              <p><strong>YT Channel ID :</strong> UCXsX4kQEJslMrdAtm-mayuw</p>
              <p>Your Credits : 0</p>
              <p>Subscribers : 0</p>
              <p>Watch Time : 0h</p>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="bg-primary px-6 py-4 text-2xl font-black">DAILY BONUS</div>
            <div className="p-6 text-gray-300">
              <div className="text-5xl font-black text-white mb-4">25</div>
              <p>You have already claimed daily bonus for today. You can again claim it tomorrow.</p>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="bg-primary px-6 py-4 text-2xl font-black">REFER &amp; EARN</div>
            <div className="p-6 text-gray-300">
              <p className="mb-4">Refer your friends to TubeBoost and earn credits.</p>
              <button className="rounded-lg bg-yellow-400 px-5 py-3 font-bold text-dark">REFER &amp; EARN</button>
            </div>
          </article>
        </div>
      </section>

      <section id="services" className="border-t border-white/5 bg-[#101010] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">Services</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">View Promotions</h2>
          <p className="text-gray-300 max-w-3xl mb-10">Your credits can be used across subscriber, like, and view campaigns. Choose the package that fits your goal.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {services.map((service) => (
              <div key={service.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                <p className="text-gray-300">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-300 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Required</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Spent Credits</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Promoted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-200">
                <tr>
                  <td className="px-4 py-4">3394791</td>
                  <td className="px-4 py-4">Youtube Channel Subscribers</td>
                  <td className="px-4 py-4">https://www.youtube.co</td>
                  <td className="px-4 py-4">10</td>
                  <td className="px-4 py-4">10</td>
                  <td className="px-4 py-4">20</td>
                  <td className="px-4 py-4 text-green-400 font-bold">Completed</td>
                  <td className="px-4 py-4">01-May-2026</td>
                </tr>
                <tr>
                  <td className="px-4 py-4">3398670</td>
                  <td className="px-4 py-4">Youtube Channel Subscribers</td>
                  <td className="px-4 py-4">https://www.youtube.co</td>
                  <td className="px-4 py-4">20</td>
                  <td className="px-4 py-4">4</td>
                  <td className="px-4 py-4">40</td>
                  <td className="px-4 py-4 text-yellow-400 font-bold">In Progress</td>
                  <td className="px-4 py-4">07-May-2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-dark py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">The Process</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">How It Works</h2>
          <p className="text-gray-300 max-w-3xl mb-10">Three simple steps to explosive YouTube growth.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.number} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-yellow-400 text-sm font-bold mb-4">STEP {step.number}</div>
                <div className="text-3xl mb-4"><i className={`bi ${step.icon}`} /></div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-300">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="buy-credits" className="bg-[#101010] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">Credit System</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Buy Credits</h2>
          <p className="text-gray-300 max-w-3xl mb-10">Premium packs in both currencies: Rs 10 ($1), Rs 50 ($15), Rs 100 ($50).</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.amount}
                className={`relative rounded-2xl border p-8 text-center ${pkg.badge ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/10 bg-white/5'}`}
              >
                {pkg.badge ? (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1 text-xs font-black text-dark">
                    {pkg.badge}
                  </div>
                ) : null}
                <div className="text-6xl font-black text-white mb-2">{pkg.credits}</div>
                <div className="text-gray-300 text-lg font-semibold mb-6">Credits</div>
                <div className="text-white text-2xl font-black mb-2">Rs {pkg.amount} / ${pkg.amount === 10 ? '1' : pkg.amount === 50 ? '15' : '50'}</div>
                <div className="text-gray-400 mb-8">{pkg.label}</div>
                <button
                  type="button"
                  onClick={() => handlePay(pkg.amount)}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 px-6 py-3 font-black text-dark hover:from-yellow-300 hover:to-orange-300"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-dark py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">Social Proof</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">What Our Clients Say</h2>
          <p className="text-gray-300 max-w-3xl mb-10">Real results from real creators who trusted TubeBoost.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-yellow-400 mb-4">
                  <i className="bi bi-star-fill" /> <i className="bi bi-star-fill" /> <i className="bi bi-star-fill" /> <i className="bi bi-star-fill" /> <i className="bi bi-star-fill" />
                </div>
                <p className="text-gray-200 leading-relaxed mb-6">&quot;{item.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-xl"><i className="bi bi-person-circle" /></div>
                  <div>
                    <div className="font-bold text-white">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.handle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-started" className="bg-[#101010] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-yellow-400 text-sm font-bold uppercase tracking-[0.3em] mb-2">Start Here</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">Boost Profile</h2>
          <p className="text-gray-300 max-w-3xl mb-10">Add a promotion and track the credits needed before you launch your next campaign.</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="bg-primary px-6 py-4 text-2xl font-black">ADD PROMOTION</div>
              <div className="p-6 space-y-5 text-gray-300">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Select Promotion Type</label>
                  <select className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white">
                    <option>Select promotion type</option>
                    <option>YouTube Video Likes</option>
                    <option>YouTube Subscribers</option>
                    <option>YouTube Video Views</option>
                    <option>YouTube Comments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">YouTube Video Link</label>
                  <input className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white" value="https://youtu.be/AAVBn_fHA" readOnly />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">Number Of Likes</label>
                  <input className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white" value="10" readOnly />
                </div>

                <div className="text-yellow-400 font-black">CREDITS NEEDED : 10</div>
                <button className="rounded-lg bg-yellow-400 px-5 py-3 font-black text-dark">ADD PROMOTION</button>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white mb-3">How to add promotion?</h3>
                <ol className="space-y-3 text-gray-300 list-decimal list-inside">
                  <li>Select promotion type from above.</li>
                  <li>Provide your YouTube video link or Channel ID.</li>
                  <li>Enter the number of likes or subscribers and add the promotion.</li>
                </ol>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-bold text-white mb-3">Important</h3>
                <ul className="space-y-3 text-gray-300 list-disc list-inside">
                  <li>You cannot boost the same link more than one time.</li>
                  <li>You cannot use credits for another user.</li>
                  <li>Credits cannot be transferred to any other username.</li>
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/70">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div>
            <div className="text-xl font-black text-white">Tube<span className="text-yellow-400">Boost</span></div>
            <p className="mt-2">&copy; 2025 TubeBoost. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#top" className="hover:text-white">Privacy Policy</a>
            <a href="#top" className="hover:text-white">Terms of Service</a>
            <a href="#top" className="hover:text-white">Refund Policy</a>
            <a href="#get-started" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;