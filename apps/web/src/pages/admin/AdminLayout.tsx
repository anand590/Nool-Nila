import React from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  Layers,
  Users,
  Settings,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-brand-maroon mx-auto animate-pulse" />
          <p className="text-xs text-gray-500 font-medium">Verifying Administrator Privileges...</p>
        </div>
      </div>
    );
  }

  // Enforce server-validated role authorization
  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Order Requests', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Saree Inventory', path: '/admin/products', icon: Package },
    { label: 'Stock Adjustments', path: '/admin/inventory', icon: Boxes },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Store Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-brand-charcoal text-white flex flex-col flex-shrink-0">
        {/* Brand header */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="block">
            <span className="font-serif text-xl font-bold tracking-wider text-brand-gold-light">
              Nool & Nila
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-brand-ivory/60 font-sans">
              Boutique Administration
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-brand-maroon text-white font-semibold'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 text-brand-gold-light" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2 text-xs">
          <Link
            to="/"
            target="_blank"
            className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-brand-gold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Public Storefront</span>
          </Link>

          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:text-red-300 w-full transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="font-semibold text-brand-charcoal capitalize">
              {location.pathname.replace('/admin', '').replace('/', '') || 'Overview'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-600">
              Welcome, <strong>{user.name}</strong>
            </span>
            <span className="px-2 py-0.5 bg-brand-maroon text-white text-[10px] font-bold rounded">
              ADMIN
            </span>
          </div>
        </header>

        <main className="p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
