import './styles/theme.css';
import './styles/admin.css';
import './styles/analytics.css';
import './styles/tokens.css';
import './styles/tokens-v2.css';
import './styles/base.css';
import './styles/components.css';
import './styles/eras.css';
import './styles/crowdpulse.css';
import './styles/features.css';
import './styles/login.css';
import './styles/profile.css';
import './styles/engagement.css';
import './styles/fifa.css';
import './styles/home-v2.css';
import './styles/cockpit.css';
import './styles/arena.css';
import './styles/moments.css';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { gsap } from 'gsap';

function Root() {
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    window.mountLoginScreen = () => setLoginOpen(true);
    window.esportsLogout = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    };
    const onLoginOpen = () => setLoginOpen(true);
    document.addEventListener('esd:open-login', onLoginOpen);
    return () => document.removeEventListener('esd:open-login', onLoginOpen);
  }, []);

  return (
    <BrowserRouter>
      <App loginOpen={loginOpen} setLoginOpen={setLoginOpen} />
    </BrowserRouter>
  );
}

const appEl = document.getElementById('app');
if (appEl) {
  const root = ReactDOM.createRoot(appEl);
  root.render(<Root />);
  gsap.fromTo(appEl, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
}
