import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Package, MapPin, Heart, ShieldCheck, LogOut } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-brand-beige">
        <div>
          <span className="text-xs uppercase font-bold text-brand-gold">Member Profile</span>
          <h1 className="font-serif text-3xl font-bold text-brand-charcoal">{user.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{user.email} • {user.phone || 'No phone added'}</p>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 bg-brand-maroon text-white text-xs font-semibold rounded shadow"
            >
              Admin Dashboard
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link
          to="/account/orders"
          className="p-6 bg-white rounded-xl border border-brand-beige shadow-sm hover:shadow transition-shadow space-y-2 block"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-ivory text-brand-maroon flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-base text-brand-charcoal">My Order Requests</h3>
          <p className="text-xs text-gray-500">Track weave inspection, order confirmations, and dispatch details.</p>
        </Link>

        <Link
          to="/wishlist"
          className="p-6 bg-white rounded-xl border border-brand-beige shadow-sm hover:shadow transition-shadow space-y-2 block"
        >
          <div className="w-10 h-10 rounded-lg bg-brand-ivory text-brand-maroon flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-base text-brand-charcoal">Saved Wishlist</h3>
          <p className="text-xs text-gray-500">View handlooms saved for weddings and celebrations.</p>
        </Link>

        <div className="p-6 bg-white rounded-xl border border-brand-beige shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-lg bg-brand-ivory text-brand-maroon flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-base text-brand-charcoal">Patron Benefits</h3>
          <p className="text-xs text-gray-500">Silk Mark authenticity, priority WhatsApp concierge, and insured transit.</p>
        </div>
      </div>
    </div>
  );
};
