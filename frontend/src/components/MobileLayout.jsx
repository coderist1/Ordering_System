import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import './MobileLayout.css';

export default function MobileLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine bottom navigation links based on user role
  const getNavLinks = () => {
    const links = [
      { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
      { name: 'Orders', path: '/orders', icon: '📦' },
    ];

    const role = user?.role === 'user' ? 'customer' : user?.role

    if (role === 'admin') {
      links.push({ name: 'Users', path: '/users', icon: '👥' });
    } else if (role === 'owner') {
      links.push({ name: 'Products', path: '/products', icon: '🏷️' });
    }

    links.push({ name: 'Profile', path: '/profile', icon: '👤' });

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <div className="mobile-layout-container">
      {/* Top App Bar */}
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <span className="brand-icon">🥣</span>
          <h2>AMU Bowls</h2>
        </div>
        <div className="mobile-topbar-actions">
          <button className="mobile-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="mobile-main-content">
        <Outlet />
      </main>

      {/* Fixed Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `mobile-nav-item ${isActive ? 'active' : ''}`
            }
          >
            {/* Note: You can replace these emojis with your <IconLibrary /> SVGs */}
            <div className="mobile-nav-icon">{link.icon}</div>
            <span className="mobile-nav-text">{link.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}