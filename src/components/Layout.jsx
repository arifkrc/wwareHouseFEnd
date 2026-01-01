import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Package, History, BarChart3, Plus, LogOut, User, Menu, X, Settings, Upload } from 'lucide-react';
import './Layout.scss';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Package size={32} />
          <h2>Depo Sistemi</h2>
        </div>

        <nav className="sidebar-nav">
          {isAdmin && (
            <Link to="/" className="nav-link" onClick={closeMobileMenu}>
              <BarChart3 size={20} />
              <span>Dashboard</span>
            </Link>
          )}
          <Link to="/items" className="nav-link" onClick={closeMobileMenu}>
            <Package size={20} />
            <span>Ürünler</span>
          </Link>
          <Link to="/layout" className="nav-link" onClick={closeMobileMenu}>
            <LayoutGrid size={20} />
            <span>Fabrika Yerleşimi</span>
          </Link>
          <Link to="/add" className="nav-link" onClick={closeMobileMenu}>
            <Plus size={20} />
            <span>Ekle</span>
          </Link>
          <Link to="/bulk-import" className="nav-link" onClick={closeMobileMenu}>
            <Upload size={20} />
            <span>Toplu Ekle</span>
          </Link>
          <Link to="/movements" className="nav-link" onClick={closeMobileMenu}>
            <History size={20} />
            <span>Hareket Geçmişi</span>
          </Link>
          {isAdmin && (
            <Link to="/settings" className="nav-link" onClick={closeMobileMenu}>
              <Settings size={20} />
              <span>Ayarlar</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <User size={20} />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-username">@{user?.username}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
