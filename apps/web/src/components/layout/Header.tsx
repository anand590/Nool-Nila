import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  Package,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export const Header: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { cart, openCart } = useCart();
  const { items: wishlistItems } = useWishlist();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const cartItemCount = cart?.itemCount || 0;
  const wishlistItemCount = wishlistItems.length;

  return (
    <header className="sticky top-0 z-40 bg-brand-ivory/95 backdrop-blur-md border-b border-brand-beige-dark transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu trigger */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-brand-charcoal hover:text-brand-maroon focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Brand Logo / Wordmark */}
          <div className="flex-1 lg:flex-none text-center lg:text-left">
            <Link to="/" className="inline-block group">
              <span className="font-serif text-2xl sm:text-3xl tracking-wider font-bold text-brand-maroon group-hover:text-brand-maroon-dark transition-colors">
                Nool & Nila
              </span>
              <span className="block text-[10px] sm:text-xs uppercase tracking-[0.25em] text-brand-gold font-sans -mt-1 font-medium">
                Threads of Tradition
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/shop"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              All Sarees
            </Link>
            <Link
              to="/collections/silk-sarees"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              Silk Sarees
            </Link>
            <Link
              to="/collections/wedding-sarees"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              Bridal & Wedding
            </Link>
            <Link
              to="/collections/cotton-sarees"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              Handloom Cotton
            </Link>
            <Link
              to="/collections/festive-sarees"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              Festive Edit
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-brand-charcoal hover:text-brand-maroon transition-colors"
            >
              Our Story
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-4 sm:space-x-5">
            {/* Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-brand-charcoal hover:text-brand-maroon transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="p-2 text-brand-charcoal hover:text-brand-maroon transition-colors relative"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistItemCount}
                </span>
              )}
            </Link>

            {/* User Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-2 text-brand-charcoal hover:text-brand-maroon transition-colors flex items-center space-x-1"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-luxury border border-brand-beige py-2 z-50 animate-fadeIn"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-semibold text-brand-charcoal truncate">{user.name}</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium bg-brand-beige rounded text-brand-maroon">
                          {user.role}
                        </span>
                      </div>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-brand-maroon font-semibold hover:bg-brand-ivory"
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      )}

                      <Link
                        to="/account/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-brand-ivory"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        My Orders
                      </Link>

                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-brand-ivory"
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Account Settings
                      </Link>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logout();
                          navigate('/');
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-ivory font-medium"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-brand-maroon font-semibold hover:bg-brand-ivory"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Cart Drawer Trigger */}
            <button
              onClick={openCart}
              className="p-2 text-brand-charcoal hover:text-brand-maroon transition-colors relative"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand-maroon text-brand-ivory text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-scaleIn">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Live Search Drawer */}
        {isSearchOpen && (
          <div className="py-4 border-t border-brand-beige-dark animate-slideDown">
            <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by saree name, silk weave, zari, or color..."
                autoFocus
                className="w-full pl-11 pr-24 py-3 bg-white border border-brand-beige-dark rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-maroon focus:border-transparent text-brand-charcoal shadow-sm"
              />
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-2 px-5 py-1.5 bg-brand-maroon text-white text-xs font-semibold rounded-full hover:bg-brand-maroon-dark transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-brand-ivory border-t border-brand-beige px-6 pt-4 pb-8 space-y-4 shadow-lg animate-slideDown">
          <Link
            to="/shop"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            All Sarees
          </Link>
          <Link
            to="/collections/silk-sarees"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            Pure Silk Sarees
          </Link>
          <Link
            to="/collections/wedding-sarees"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            Bridal & Wedding Collection
          </Link>
          <Link
            to="/collections/cotton-sarees"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            Handloom Cotton Sarees
          </Link>
          <Link
            to="/collections/festive-sarees"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            Festive Edit
          </Link>
          <Link
            to="/about"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-base font-medium text-brand-charcoal hover:text-brand-maroon py-2"
          >
            Brand Story & Artisans
          </Link>

          <div className="pt-4 border-t border-brand-beige space-y-2">
            {user ? (
              <>
                <Link
                  to="/account/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-sm text-brand-charcoal font-medium py-1"
                >
                  My Orders
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-sm text-brand-maroon font-semibold py-1"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await logout();
                  }}
                  className="block text-sm text-red-600 font-medium py-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex space-x-4 pt-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-sm font-semibold border border-brand-maroon text-brand-maroon rounded"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-sm font-semibold bg-brand-maroon text-white rounded"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
