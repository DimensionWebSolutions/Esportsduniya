import React from 'react';
import { NAV_ITEMS } from '../data/mockData.js';
import { useNavigate, useLocation } from 'react-router-dom';

export default function NavRail() {
    const navigate = useNavigate();
    const location = useLocation();
    const activePage = location.pathname.slice(1) || 'dashboard';

    return (
        <nav className="nav-rail" id="nav-rail" aria-label="Main navigation">
            {NAV_ITEMS.map(item => {
                if (item.type === 'divider') {
                    return <div key={item.id} className="nav-divider"></div>;
                }
                const isActive = item.id === activePage;
                return (
                    <button
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => navigate(`/${item.id}`)}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : 'false'}
                    >
                        <span>{item.icon}</span>
                        <span className="nav-tooltip">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
