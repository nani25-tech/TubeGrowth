import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const packages = [
  { amount: 10, credits: 100, label: 'Premium Pack', featured: false },
  { amount: 50, credits: 500, label: 'Premium Pack', featured: true },
  { amount: 100, credits: 1000, label: 'Premium Pack', featured: false },
];

const testimonials = [
  {
    name: 'Alex Mercer',
    handle: 'Gaming Channel -+ 12.4K subs',
    text: 'I went from 800 to 5,400 subscribers in less than two weeks. The engagement feels organic and my videos are now getting recommended. Absolutely worth it.',
  },
  {
    name: 'Priya Sharma',
    handle: 'Cooking Channel -+ 8.2K subs',
    text: 'Hit monetization in 3 weeks with TubeBoost. I needed the watch hours and they delivered fast. The team was super responsive and the results were real.',
  },
  {
    name: 'Jordan Lee',
    handle: 'Music Channel -+ 6.7K subs',
    text: 'My music channel was stuck at 300 subs for months. After one month with TubeBoost I crossed 3,000. The algorithm started picking up my videos naturally after that!',
  },
];

const services = [
  { id: '3394791', type: 'Youtube Channel Subscribers', required: 10, delivered: 10, spent: 20, status: 'Completed', promoted: '01-May-2026' },
  { id: '3398670', type: 'Youtube Channel Subscribers', required: 20, delivered: 4, spent: 40, status: 'In Progress', promoted: '07-May-2026' },
  { id: '3392191', type: 'Youtube Channel Subscribers', required: 10, delivered: 10, spent: 20, status: 'Completed', promoted: '26-Apr-2026' },
  { id: '3394088', type: 'Youtube Channel Subscribers', required: 10, delivered: 10, spent: 20, status: 'Completed', promoted: '29-Apr-2026' },
];

const layoutStyles = `
:root {
  --red: #FF0000;
  --red-dark: #CC0000;
  --black: #0A0A0A;
  --dark: #111111;
  --card: #181818;
  --border: #2a2a2a;
  --text: #F7F7F7;
  --muted: #C8C8C8;
  --gold: #FFD700;
}

body {
  background: var(--black);
  color: var(--text);
}

.home-index {
  background: var(--black);
  color: var(--text);
  overflow-x: hidden;
}

.home-index nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 60px;
  background: rgba(10,10,10,0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.home-index .logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  letter-spacing: 2px;
}
.home-index .logo span { color: var(--red); }

.home-index nav ul {
  list-style: none;
  display: flex;
  gap: 36px;
  padding: 0;
  margin: 0;
}
.home-index nav ul a {
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.home-index nav ul a:hover { color: var(--text); }

.home-index .nav-cta,
.home-index .credit-display {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.home-index .nav-cta {
  background: var(--red);
  color: #fff;
  padding: 12px 28px;
  border-radius: 4px;
  font-weight: 700;
  text-decoration: none;
  min-height: 44px;
}
.home-index .nav-cta:hover { background: var(--red-dark); }

.home-index .credit-display {
  gap: 12px;
  background: rgba(255,0,0,0.08);
  border: 1px solid rgba(255,0,0,0.2);
  padding: 10px 18px;
  border-radius: 50px;
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}
.home-index .credit-balance strong { color: var(--red); }

.home-index section {
  padding: 100px 60px;
}

.home-index .free-boost-section {
  background: #f5f5f5;
  color: #111;
  padding: 40px 0 80px;
  border-top: 4px solid #39b54a;
}

.home-index .free-boost-banner {
  max-width: 1200px;
  margin: 0 auto 40px;
  width: fit-content;
  background: #39b54a;
  border: 2px solid #2a8e39;
  border-radius: 12px;
  color: #1a1a1a;
  text-align: center;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 16px 36px;
}
.home-index .free-boost-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
}
.home-index .free-boost-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 52px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1px;
  margin-bottom: 16px;
  line-height: 1.1;
}
.home-index .free-boost-subtitle {
  font-size: 14px;
  color: #111;
  margin-bottom: 40px;
  line-height: 1.6;
}
.home-index .free-boost-form-box,
.home-index .dashboard-shell,
.home-index .dashboard-area,
.home-index .view-promo-shell,
.home-index .view-promo-layout,
.home-index .boost-shell,
.home-index .boost-layout {
  color: #111;
}
.home-index .free-boost-form-box {
  background: #fff;
  border: 3px solid #39b54a;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.home-index .form-label {
  text-align: left;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 14px;
  display: block;
}
.home-index .free-boost-form { display: flex; gap: 12px; margin-bottom: 16px; }
.home-index .free-boost-input,
.home-index .search-bar input,
.home-index .boost-form-group input,
.home-index .boost-form-group select,
.home-index .view-promo-search-bar input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  color: #333;
  font-family: inherit;
  background: #fff;
}
.home-index .free-boost-search-btn,
.home-index .analyze-videos-btn,
.home-index .search-btn,
.home-index .credit-btn,
.home-index .boost-add-promo-btn,
.home-index .feedback-btn,
.home-index .modal-verify-btn,
.home-index .modal-link-btn,
.home-index .refer-btn,
.home-index .boost-shell-tab,
.home-index .view-promo-shell-tab,
.home-index .dash-tab,
.home-index .pagination-btn {
  border: none;
  text-decoration: none;
  cursor: pointer;
}
.home-index .free-boost-search-btn {
  background: #39b54a;
  border-radius: 6px;
  color: #fff;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 16px 36px;
  min-height: 50px;
}
.home-index .form-help { font-size: 11px; color: #111; }
.home-index .form-link { color: #0066cc; text-decoration: none; font-weight: 700; }
.home-index .free-boost-cta { margin-bottom: 60px; }
.home-index .analyze-videos-btn {
  background: #a855f7;
  border-radius: 6px;
  color: #fff;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 18px 44px;
  min-height: 50px;
}
.home-index .how-it-works-section {
  text-align: center;
  border-top: 2px solid #ddd;
  padding-top: 60px;
}
.home-index .how-it-works-title,
.home-index .section-title,
.home-index .dashboard-topbar,
.home-index .dashboard-shell,
.home-index .dash-card-head,
.home-index .view-promo-shell-topbar,
.home-index .boost-shell-topbar,
.home-index .boost-panel-head,
.home-index .view-promo-info-head,
.home-index .earn-panel-head {
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 1px;
}
.home-index .how-it-works-title { font-size: 42px; color: #555; margin-bottom: 40px; }
.home-index .how-it-works-steps, .home-index .steps, .home-index .testimonials-grid, .home-index .credits-grid, .home-index .services-grid {
  display: grid;
  gap: 30px;
}
.home-index .how-it-works-steps { grid-template-columns: repeat(3, 1fr); }
.home-index .how-it-works-step,
.home-index .service-card,
.home-index .credit-card,
.home-index .testi-card,
.home-index .dash-card,
.home-index .boost-panel,
.home-index .boost-info-card,
.home-index .view-promo-info-card,
.home-index .earn-panel,
.home-index .view-promo-table-wrapper {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}
.home-index .step-number { display: block; font-family: 'Bebas Neue', sans-serif; font-size: 22px; font-weight: 700; color: #333; margin-bottom: 14px; }
.home-index .how-it-works-step p { font-size: 13px; color: #666; line-height: 1.6; }
.home-index .dashboard-preview-section { background: #dedede; padding: 100px 0 34px; }
.home-index .dashboard-shell,
.home-index .view-promo-shell,
.home-index .boost-shell {
  max-width: 930px;
  margin: 0 auto;
  background: #efefef;
  border: 1px solid #cfcfcf;
  border-radius: 4px;
  overflow: hidden;
}
.home-index .dashboard-topbar,
.home-index .view-promo-shell-topbar,
.home-index .boost-shell-topbar {
  background: #e30d3d;
  color: #fff;
  text-align: center;
  font-size: 33px;
  padding: 20px 12px;
}
.home-index .dashboard-tabs,
.home-index .view-promo-shell-tabs,
.home-index .boost-shell-tabs {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 20px;
}
.home-index .dash-tab,
.home-index .view-promo-shell-tab,
.home-index .boost-shell-tab {
  display: inline-block;
  border: 1px solid #dddddd;
  border-radius: 999px;
  background: #fff;
  color: #232323;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.6px;
  padding: 9px 16px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.08);
}
.home-index .dashboard-area,
.home-index .view-promo-layout,
.home-index .boost-layout { max-width: 1730px; margin: 0 auto; padding: 0 0 24px; }
.home-index .dashboard-layout { display: grid; grid-template-columns: 1.1fr 1.1fr 0.8fr; gap: 24px; align-items: start; }
.home-index .dash-card-head,
.home-index .boost-panel-head { background: #e30d3d; color: #fff; text-align: center; padding: 14px 10px; font-size: 32px; }
.home-index .dash-card-body,
.home-index .boost-panel-body,
.home-index .view-promo-info-body,
.home-index .earn-panel-body { padding: 22px 18px 26px; }
.home-index .profile-body { text-align: center; }
.home-index .profile-avatar { width: 186px; height: 186px; border-radius: 50%; margin: 4px auto 18px; background: #d0d3d7; }
.home-index .profile-name { font-size: 33px; margin-bottom: 6px; }
.home-index .profile-channel { font-size: 14px; margin-bottom: 14px; }
.home-index .profile-credits { display: inline-block; background: #39b54a; color: #fff; border: 1px solid #2a8e39; border-radius: 4px; font-size: 16px; font-family: 'Bebas Neue', sans-serif; padding: 2px 12px; }
.home-index .bonus-head { background: #972db9; }
.home-index .bonus-head span { background: #33b34a; border-radius: 4px; padding: 1px 7px; margin-left: 8px; font-size: 0.8em; }
.home-index .bonus-note { border: 1px solid #8ca6cc; background: #bcd0ee; color: #274f87; padding: 13px 10px; text-align: center; font-size: 21px; }
.home-index .refer-body { text-align: center; }
.home-index .refer-body p { font-size: 22px; margin-bottom: 18px; }
.home-index .refer-btn { border: 1px solid #d6d6d6; border-radius: 999px; background: #fff; color: #111; font-family: 'Space Mono', monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; padding: 11px 28px; }
.home-index .hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 120px 60px 80px; position: relative; overflow: hidden; }
.home-index .hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,0,0,0.08) 0%, transparent 70%); }
.home-index .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 60px 60px; opacity: 0.3; }
.home-index .hero-content { text-align: center; position: relative; z-index: 1; max-width: 900px; }
.home-index .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,0,0,0.12); border: 1px solid rgba(255,0,0,0.3); padding: 8px 20px; border-radius: 100px; font-size: 13px; font-family: 'Space Mono', monospace; color: var(--red); margin-bottom: 36px; }
.home-index h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(64px, 10vw, 120px); line-height: 0.95; letter-spacing: 2px; margin-bottom: 28px; font-weight: 700; }
.home-index h1 .accent { color: var(--red); display: block; }
.home-index .hero p { font-size: 14px; color: var(--muted); max-width: 560px; margin: 0 auto 48px; line-height: 1.7; }
.home-index .hero-search { max-width: 720px; margin: 0 auto 28px; text-align: left; }
.home-index .hero-search label { display: block; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--red); margin-bottom: 10px; }
.home-index .search-bar { display: flex; gap: 12px; }
.home-index .search-btn { background: var(--red); color: #fff; padding: 18px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; min-height: 52px; }
.home-index .hero-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin: 0 auto 32px; max-width: 920px; text-align: left; }
.home-index .hero-step { background: rgba(24,24,24,0.82); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; color: #d8d8d8; font-size: 11px; line-height: 1.7; }
.home-index .hero-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
.home-index .btn-primary,
.home-index .btn-secondary,
.home-index .plan-btn,
.home-index .credit-btn,
.home-index .boost-add-promo-btn,
.home-index .feedback-btn,
.home-index .submit-btn,
.home-index .earn-btn,
.home-index .modal-link-btn,
.home-index .modal-verify-btn {
  display: inline-flex; align-items: center; justify-content: center;
}
.home-index .btn-primary { background: var(--red); color: #fff; padding: 20px 44px; border-radius: 6px; font-size: 16px; font-weight: 700; text-decoration: none; }
.home-index .btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); padding: 20px 44px; border-radius: 6px; font-size: 16px; font-weight: 600; text-decoration: none; }
.home-index .stats-bar { background: var(--red); padding: 14px 0; overflow: hidden; }
.home-index .ticker-track { display: flex; gap: 80px; white-space: nowrap; }
.home-index .ticker-item { display: flex; align-items: center; gap: 12px; font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
.home-index .section-label { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 3px; color: var(--red); text-transform: uppercase; margin-bottom: 16px; }
.home-index .section-title { font-size: clamp(40px, 6vw, 72px); line-height: 1; margin-bottom: 16px; font-weight: 700; }
.home-index .section-sub { color: var(--muted); font-size: 13px; max-width: 500px; line-height: 1.6; margin-bottom: 60px; }
.home-index .services-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.home-index .service-card { padding: 40px 36px; position: relative; }
.home-index .service-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.home-index .service-card p { color: var(--muted); font-size: 11px; line-height: 1.65; }
.home-index .credits-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); max-width: 1000px; }
.home-index .credit-card { background: var(--card); border: 1px solid var(--border); padding: 32px 24px; text-align: center; position: relative; }
.home-index .credit-card.featured { border-color: var(--red); background: linear-gradient(135deg, #1a0000 0%, var(--card) 100%); }
.home-index .featured-badge-credit { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--red); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; padding: 5px 16px; border-radius: 100px; }
.home-index .credit-amount { font-family: 'Bebas Neue', sans-serif; font-size: 48px; line-height: 1; margin-bottom: 8px; }
.home-index .credit-label { color: var(--muted); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
.home-index .credit-price { font-family: 'Bebas Neue', sans-serif; font-size: 32px; line-height: 1; margin-bottom: 6px; }
.home-index .credit-per { color: var(--muted); font-size: 12px; margin-bottom: 20px; }
.home-index .credit-btn { width: 100%; padding: 12px; background: var(--red); color: #fff; border-radius: 8px; font-size: 14px; font-weight: 600; }
.home-index .testimonials-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.home-index .testi-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 32px; }
.home-index .stars { color: var(--gold); font-size: 14px; margin-bottom: 16px; }
.home-index .testi-card p { color: #ccc; font-size: 11px; line-height: 1.7; margin-bottom: 24px; }
.home-index .testi-author { display: flex; align-items: center; gap: 12px; }
.home-index .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; background: rgba(255,0,0,0.15); border: 1px solid rgba(255,0,0,0.2); }
.home-index .testi-name { font-weight: 600; font-size: 14px; }
.home-index .testi-handle { color: var(--muted); font-size: 10px; }
.home-index .boost-layout { grid-template-columns: 1.2fr 1fr; gap: 24px; align-items: start; }
.home-index .boost-panel,
.home-index .boost-info-card,
.home-index .view-promo-table-wrapper {
  background: #efefef;
  border: 1px solid #cfcfcf;
}
.home-index .boost-panel-head { font-size: 34px; }
.home-index .boost-form-group { display: grid; gap: 6px; }
.home-index .boost-form-group label { font-size: 11px; font-weight: 700; color: #2a2a2a; }
.home-index .boost-your-channel { background: #bcd0ee; border: 1px solid #8ca6cc; color: #274f87; text-align: center; font-size: 12px; padding: 10px; border-radius: 4px; margin: 0; font-weight: 700; }
.home-index .boost-credits-needed { background: #f3f3f3; border: 2px solid #2a2a2a; border-radius: 999px; color: #2a2a2a; text-align: center; font-size: 14px; font-weight: 700; letter-spacing: 0.6px; padding: 8px 10px; }
.home-index .boost-add-promo-btn { background: #39b54a; border-radius: 4px; color: #fff; font-size: 16px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; padding: 12px; font-weight: 700; min-height: 50px; }
.home-index .boost-right { display: grid; gap: 16px; }
.home-index .boost-info-head { background: #bcd0ee; border-bottom: 1px solid #9db2d6; color: #274f87; font-size: 31px; padding: 10px; font-weight: 800; }
.home-index .boost-info-body { color: #274f87; font-size: 24px; line-height: 1.4; }
.home-index .boost-info-body ol,
.home-index .boost-info-body ul,
.home-index .view-promo-info-body,
.home-index .view-promo-table { font-size: 14px; }
.home-index .view-promo-credit-chip,
.home-index .boost-credit-chip { max-width: 1200px; margin: 0 auto 12px; width: fit-content; background: #39b54a; border: 1px solid #2a8e39; border-radius: 4px; color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 0.6px; padding: 4px 12px; }
.home-index .view-promo-search-bar { text-align: right; }
.home-index .view-promo-search-bar input { width: 280px; }
.home-index .view-promo-table-wrapper { overflow-x: auto; }
.home-index .view-promo-table { width: 100%; border-collapse: collapse; background: #fff; }
.home-index .view-promo-table thead { background: #004fb3; color: #fff; }
.home-index .view-promo-table th,
.home-index .view-promo-table td { padding: 12px; text-align: left; border-right: 1px solid #e0e0e0; }
.home-index .view-promo-info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.home-index .view-promo-info-card { background: #e8f4ff; border: 2px solid #bde0ff; border-radius: 8px; overflow: hidden; }
.home-index .view-promo-info-head { background: #bde0ff; color: #004fb3; padding: 12px 16px; font-size: 18px; font-weight: 700; }
.home-index .view-promo-info-body { color: #004fb3; font-size: 13px; line-height: 1.6; display: grid; gap: 10px; }
.home-index footer {
  border-top: 1px solid var(--border);
  padding: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}
.home-index .footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 2px; }
.home-index .footer-logo span { color: var(--red); }
.home-index .footer-links { display: flex; gap: 28px; flex-wrap: wrap; }
.home-index .footer-links a { color: var(--muted); text-decoration: none; font-size: 13px; }
.home-index .footer-links a:hover { color: var(--text); }

@media (max-width: 768px) {
  .home-index nav { padding: 16px 24px; flex-wrap: wrap; }
  .home-index nav ul { display: none; }
  .home-index section { padding: 60px 24px; }
  .home-index .free-boost-section { padding: 30px 0 60px; }
  .home-index .free-boost-banner { font-size: 20px; padding: 12px 24px; margin-bottom: 30px; }
  .home-index .free-boost-title { font-size: 32px; }
  .home-index .free-boost-subtitle { font-size: 15px; margin-bottom: 30px; }
  .home-index .free-boost-form-box { padding: 24px; margin-bottom: 24px; }
  .home-index .free-boost-form,
  .home-index .search-bar { flex-direction: column; }
  .home-index .free-boost-search-btn { width: 100%; }
  .home-index .how-it-works-section { padding-top: 40px; }
  .home-index .how-it-works-title { font-size: 28px; margin-bottom: 30px; }
  .home-index .how-it-works-steps { grid-template-columns: 1fr; gap: 20px; }
  .home-index .dashboard-layout,
  .home-index .boost-layout,
  .home-index .view-promo-info-section { grid-template-columns: 1fr; }
  .home-index .footer-links { gap: 16px; }
}
`;

export const HomePage = () => {
  const [channelInput, setChannelInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleChannelSearch = async () => {
    if (!channelInput.trim()) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 1000);
  };

  const handlePay = (amount) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout', search: `?amount=${amount}` } } });
      return;
    }

    navigate(`/checkout?amount=${amount}`);
  };

  return (
    <div className="home-index" id="top">
      <style>{layoutStyles}</style>

      <nav>
        <div className="logo">Tube<span>Boost</span></div>
        <ul>
          <li><a href="#services">Services</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#testimonials">Reviews</a></li>
          <li><a href="#buy-credits" className="nav-cta">Buy Credits</a></li>
        </ul>
        <div className="credit-display">
          <span className="credit-icon">💰</span>
          <span className="credit-balance"><strong>1000</strong> Credits</span>
        </div>
      </nav>

      <section className="free-boost-section">
        <div className="free-boost-banner">Free YouTube Subscribers &amp; Free YouTube Likes</div>
        <div className="free-boost-content">
          <h1 className="free-boost-title">Grow your YouTube Channel Faster Than Ever Before!</h1>
          <p className="free-boost-subtitle">My Tools Town is the best platform to boost your YouTube channel with thousands of real youtube subscribers.</p>
          <div className="free-boost-form-box">
            <p className="form-label">Enter Youtube Channel Link / Channel ID:</p>
            <div className="free-boost-form">
              <input
                type="text"
                className="free-boost-input"
                placeholder="UCXsx4kQEJsIMrdAtm-mayuw"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()}
              />
              <button type="button" className="free-boost-search-btn" onClick={handleChannelSearch}>
                {isSearching ? 'SEARCHING...' : 'SEARCH CHANNEL'}
              </button>
            </div>
            <p className="form-help">
              <button type="button" className="form-link" onClick={() => navigate('/campaigns')}>
                Where I can find my YouTube Channel ID
              </button>
            </p>
          </div>
          <div className="free-boost-cta">
            <button type="button" className="analyze-videos-btn" onClick={() => navigate('/campaigns')}>
              📊 ANALYZE YOUR YOUTUBE VIDEOS FOR FREE
            </button>
          </div>
          <div className="how-it-works-section">
            <h2 className="how-it-works-title">HOW IT WORKS</h2>
            <div className="how-it-works-steps">
              <div className="how-it-works-step">
                <div className="step-number">STEP 1</div>
                <p>Paste your Youtube Channel Link / Channel ID above.</p>
              </div>
              <div className="how-it-works-step">
                <div className="step-number">STEP 2</div>
                <p>Earn credits by Subscribing &amp; Liking other Channels &amp; Videos.</p>
              </div>
              <div className="how-it-works-step">
                <div className="step-number">STEP 3</div>
                <p>Boost your YouTube Channel using this credits.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard-preview" className="dashboard-preview-section">
        <div className="dashboard-shell">
          <div className="dashboard-topbar">DASHBOARD</div>
          <div className="dashboard-tabs">
            <a className="dash-tab active" href="#dashboard-preview">DASHBOARD</a>
            <a className="dash-tab" href="#earn-credits">EARN CREDITS</a>
            <a className="dash-tab" href="#get-started">BOOST PROFILE</a>
            <a className="dash-tab" href="#services">VIEW PROMOTIONS</a>
            <a className="dash-tab" href="#top">LOGOUT</a>
          </div>
        </div>
        <div className="dashboard-area">
          <div className="dashboard-layout">
            <article className="dash-card profile-card">
              <header className="dash-card-head">PROFILE INFORMATION</header>
              <div className="dash-card-body profile-body">
                <div className="profile-avatar" aria-hidden="true" />
                <p className="profile-name">AD official</p>
                <p className="profile-channel"><strong>YT Channel ID :</strong> UCXsX4kQEJsIMrdAtm-mayuw</p>
                <p className="profile-credits">Your Credits : 0</p>
                <p className="profile-subscribers">Subscribers : 0</p>
                <p className="profile-watchtime">Watch Time : 0h</p>
              </div>
            </article>

            <article className="dash-card bonus-card">
              <header className="dash-card-head bonus-head">DAILY BONUS <span>25 CREDITS</span></header>
              <div className="dash-card-body bonus-body">
                <p className="bonus-note">You have already claimed daily bonus for today. You can again claim it tomorrow.</p>
              </div>
            </article>

            <article className="dash-card refer-card">
              <header className="dash-card-head">REFER &amp; EARN</header>
              <div className="dash-card-body refer-body">
                <p>Refer your friends to My Tools Town and earn credits.</p>
                <button type="button" className="refer-btn">REFER &amp; EARN</button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="badge">Trusted by 10,000+ YouTubers Worldwide</div>
          <h1>GROW YOUR <span className="accent">YOUTUBE</span> CHANNEL FAST</h1>
          <p>Get real subscribers, genuine likes, and authentic views from active YouTube users. No bots. No fake accounts. 100% organic growth.</p>
          <div className="hero-search">
            <label htmlFor="channelSearch">Enter your ID</label>
            <div className="search-bar">
              <input
                id="channelSearch"
                type="text"
                placeholder="Paste your YouTube Channel Link or Channel ID"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()}
              />
              <button type="button" className="search-btn" onClick={handleChannelSearch}>Search</button>
            </div>
            <p className="search-help">Paste your YouTube Channel Link or Channel ID into the search box on the homepage.</p>
          </div>
          <div className="hero-steps">
            <div className="hero-step">Earn Credits: You must perform actions (like or subscribe) on other users&apos; channels. This is the &quot;currency&quot; used to buy your own boosts.</div>
            <div className="hero-step">Boost Channel: Once you have accumulated credits, click on &quot;Boost Channel&quot; to exchange those credits for your own subscribers, likes, or views.</div>
          </div>
          <div className="hero-btns">
              <button type="button" className="btn-primary" onClick={() => navigate('/campaigns')}>Boost Channel</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: { pathname: '/buy', search: '' } } });
                    return;
                  }
                  navigate('/buy');
                }}
              >
                Get Credits <span>→</span>
              </button>
            </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="ticker-track">
          <div className="ticker-item">2.4M+ Subscribers Delivered</div>
          <div className="ticker-item">18M+ Likes Generated</div>
          <div className="ticker-item">95M+ Views Driven</div>
          <div className="ticker-item">4.9/5 Average Rating</div>
          <div className="ticker-item">100% Safe &amp; Secure</div>
          <div className="ticker-item">Delivery in 24-72 Hours</div>
        </div>
      </div>

      <section id="services">
        <div className="view-promo-credit-chip">Your Credits : 0</div>
        <div className="view-promo-shell">
          <div className="view-promo-shell-topbar">VIEW PROMOTIONS</div>
          <div className="view-promo-shell-tabs">
            <a className="view-promo-shell-tab" href="#dashboard-preview">DASHBOARD</a>
            <a className="view-promo-shell-tab" href="#earn-credits">EARN CREDITS</a>
            <a className="view-promo-shell-tab" href="#get-started">BOOST PROFILE</a>
            <a className="view-promo-shell-tab active" href="#services">VIEW PROMOTIONS</a>
            <a className="view-promo-shell-tab" href="#top">LOGOUT</a>
          </div>
        </div>
        <div className="view-promo-layout">
          <div className="view-promo-search-bar">
            <input type="text" placeholder="Search..." />
          </div>
          <div className="view-promo-table-wrapper">
            <table className="view-promo-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Link</th>
                  <th>Required</th>
                  <th>Delivered</th>
                  <th>Spent Credits</th>
                  <th>Status</th>
                  <th>Promoted</th>
                  <th>Boost</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {services.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.type}</td>
                    <td>https://www.youtube.co <span className="open-link-btn">OPEN LINK</span></td>
                    <td>{row.required}</td>
                    <td>{row.delivered}</td>
                    <td>{row.spent}</td>
                    <td><span className={row.status === 'Completed' ? 'status-completed' : 'status-inprogress'}>{row.status}</span></td>
                    <td>{row.promoted}</td>
                    <td>{row.status === 'Completed' ? 'NA' : <span className="boost-speed-btn">BOOST SPEED</span>}</td>
                    <td><button type="button" className="manage-btn">🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="view-promo-pagination">
            <span>Showing 1 to 4 of 4 entries</span>
            <div className="pagination-buttons">
              <button className="pagination-btn">Previous</button>
              <button className="pagination-btn active">1</button>
              <button className="pagination-btn">Next</button>
            </div>
          </div>
          <div className="view-promo-info-section">
            <article className="view-promo-info-card">
              <header className="view-promo-info-head">Status Meanings</header>
              <div className="view-promo-info-body">
                <p><strong>Running / In Progress:</strong> When the promotion is in process of gaining likes and followers.</p>
                <p><strong>Completed:</strong> Promotion is completed.</p>
                <p><strong>Canceled:</strong> Promotion is canceled due to some reason. In this case your coins will be refunded at the same time promotion is canceled.</p>
                <p><strong>Stopped:</strong> Promotion is automatically stopped when you change your profile privacy to private or we are not able to view your profile / post for any reason.</p>
              </div>
            </article>
            <article className="view-promo-info-card">
              <header className="view-promo-info-head">Manage Promotions</header>
              <div className="view-promo-info-body">
                <p><strong>Edit Promotion:</strong> You can increase the current required quantity of your promotion using this option.</p>
                <p><strong>Delete Promotion:</strong> Deleting a promotion will stop sending likes and followers to that promotion &amp; unused credits will be refunded immediately.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="section-label">{'// The Process'}</div>
        <div className="section-title">HOW IT WORKS</div>
        <p className="section-sub">Three simple steps to explosive YouTube growth.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <span className="step-icon">✉</span>
            <h3>Submit Your Order</h3>
            <p>Fill out our simple form with your YouTube channel URL, choose your desired service, and select a package that fits your goals.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <span className="step-icon">⚙</span>
            <h3>We Process It</h3>
            <p>Our team activates your campaign using our network of real users. We start delivery within 1-6 hours of confirmed payment.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <span className="step-icon">📈</span>
            <h3>Watch Your Channel Grow</h3>
            <p>Sit back and watch the numbers climb. Track your progress in real time and see your channel&apos;s reach expand dramatically.</p>
          </div>
          <div className="step">
            <div className="step-num">04</div>
            <span className="step-icon">🚀</span>
            <h3>Scale &amp; Repeat</h3>
            <p>Once you see results, scale up. Many of our clients return monthly to keep the algorithm momentum going strong.</p>
          </div>
        </div>
      </section>

      <section id="buy-credits">
        <div className="section-label">{'// Credit System'}</div>
        <div className="section-title">BUY CREDITS</div>
        <p className="section-sub">Premium packs in both currencies: Rs 10 ($1), Rs 50 ($15), Rs 100 ($50).</p>
        <div className="credits-grid">
          {packages.map((pkg) => (
            <div key={pkg.amount} className={`credit-card ${pkg.featured ? 'featured' : ''}`}>
              {pkg.featured ? <div className="featured-badge-credit">BEST VALUE</div> : null}
              <div className="credit-amount">{pkg.credits}</div>
              <div className="credit-label">Credits</div>
              <div className="credit-price">Rs {pkg.amount} / ${pkg.amount === 10 ? '1' : pkg.amount === 50 ? '15' : '50'}</div>
              <div className="credit-per">Premium Pack</div>
              <button type="button" className="credit-btn" onClick={() => handlePay(pkg.amount)}>Buy Now</button>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials">
        <div className="section-label">{'// Social Proof'}</div>
        <div className="section-title">WHAT OUR CLIENTS SAY</div>
        <p className="section-sub">Real results from real creators who trusted TubeBoost.</p>
        <div className="testimonials-grid">
          {testimonials.map((item) => (
            <div key={item.name} className="testi-card">
              <div className="stars">★★★★★</div>
              <p>"{item.text}"</p>
              <div className="testi-author">
                <div className="avatar">👤</div>
                <div>
                  <div className="testi-name">{item.name}</div>
                  <div className="testi-handle">{item.handle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="get-started">
        <div className="boost-credit-chip">Your Credits : 0</div>
        <div className="boost-shell">
          <div className="boost-shell-topbar">BOOST PROFILE</div>
          <div className="boost-shell-tabs">
            <a className="boost-shell-tab" href="#dashboard-preview">DASHBOARD</a>
            <a className="boost-shell-tab" href="#earn-credits">EARN CREDITS</a>
            <a className="boost-shell-tab active" href="#get-started">BOOST PROFILE</a>
            <a className="boost-shell-tab" href="#services">VIEW PROMOTIONS</a>
            <a className="boost-shell-tab" href="#top">LOGOUT</a>
          </div>
        </div>
        <div className="boost-layout">
          <div className="boost-left">
            <article className="boost-panel">
              <header className="boost-panel-head">ADD PROMOTION</header>
              <div className="boost-panel-body add-promo-body">
                <p className="boost-your-channel">Your Channel : AD official</p>
                <div className="boost-form-group">
                  <label>Select Promotion Type</label>
                  <select><option>Select promotion type</option><option>Youtube Video Likes</option><option>Youtube Subscribers</option><option>Youtube Video Views</option><option>Youtube Comments</option></select>
                </div>
                <div className="boost-form-group">
                  <label>Youtube Video Link</label>
                  <input type="text" value="https://youtu.be/AAVBn_fHA" readOnly />
                </div>
                <div className="boost-form-group">
                  <label>Number Of Likes</label>
                  <input type="number" value="10" readOnly />
                </div>
                <div className="boost-credits-needed">CREDITS NEEDED : 10</div>
                <button type="button" className="boost-add-promo-btn">ADD PROMOTION</button>
              </div>
            </article>
          </div>
          <div className="boost-right">
            <article className="boost-info-card">
              <header className="boost-info-head">How to add promotion?</header>
              <div className="boost-info-body">
                <ol>
                  <li><strong>STEP 1:</strong> Select promotion type from above.</li>
                  <li><strong>STEP 2:</strong> Then provide your YouTube video link or Channel ID.</li>
                  <li><strong>STEP 3:</strong> Enter the number of likes or subscribers and add the promotion.</li>
                </ol>
              </div>
            </article>
            <article className="boost-info-card">
              <header className="boost-info-head">Important:</header>
              <div className="boost-info-body">
                <ul>
                  <li>You cannot boost same link more than one time.</li>
                  <li>You cannot boost any other profile or posts by using your credits.</li>
                  <li>No one other than you can use your credits.</li>
                  <li>You cannot transfer credits to any other username.</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <div className="footer-logo">Tube<span>Boost</span></div>
          <p style={{ marginTop: 8 }}>&copy; 2025 TubeBoost. All rights reserved.</p>
        </div>
        <div className="footer-links">
          <a href="#top">Privacy Policy</a>
          <a href="#top">Terms of Service</a>
          <a href="#top">Refund Policy</a>
          <a href="#get-started">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
