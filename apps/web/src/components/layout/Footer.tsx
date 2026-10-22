import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mail, Phone, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { STORE_DEFAULTS } from '@nool-and-nila/shared';
import { useStoreSettings } from '../../hooks/useStoreSettings';

export const Footer: React.FC = () => {
  const { whatsappNumber, supportEmail, storeName, tagline, freeShippingThresholdPaise } = useStoreSettings();
  return (
    <footer className="bg-brand-charcoal text-brand-ivory pt-16 pb-8 border-t-2 border-brand-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <span className="font-serif text-3xl font-bold tracking-wider text-brand-gold-light">
                {storeName}
              </span>
              <span className="block text-xs uppercase tracking-[0.2em] text-brand-ivory/70 font-sans mt-0.5">
                {tagline}
              </span>
            </Link>
            <p className="text-sm text-brand-ivory/80 leading-relaxed max-w-sm">
              We curate and celebrate authentic Indian handloom sarees directly from master artisan clusters
              in Kanchipuram, Varanasi, Chanderi, and Bengal. Every saree is an heirloom woven with pure silk,
              tested zari, and generations of craft.
            </p>
            <div className="pt-2 flex items-center space-x-3 text-xs text-brand-gold font-medium">
              <ShieldCheck className="w-4 h-4 text-brand-gold" />
              <span>Silk Mark Certified • 100% Genuine Handlooms</span>
            </div>
          </div>

          {/* Collections */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-brand-gold font-serif">
              Collections
            </h4>
            <ul className="space-y-2 text-sm text-brand-ivory/80">
              <li>
                <Link to="/collections/silk-sarees" className="hover:text-brand-gold transition-colors">
                  Pure Silk Sarees
                </Link>
              </li>
              <li>
                <Link to="/collections/wedding-sarees" className="hover:text-brand-gold transition-colors">
                  Bridal & Wedding Sarees
                </Link>
              </li>
              <li>
                <Link to="/collections/cotton-sarees" className="hover:text-brand-gold transition-colors">
                  Handloom Cotton Sarees
                </Link>
              </li>
              <li>
                <Link to="/collections/festive-sarees" className="hover:text-brand-gold transition-colors">
                  Festive Edit
                </Link>
              </li>
              <li>
                <Link to="/collections/everyday-sarees" className="hover:text-brand-gold transition-colors">
                  Everyday Classics
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-brand-gold transition-colors font-medium text-brand-gold-light">
                  View All Sarees →
                </Link>
              </li>
            </ul>
          </div>

          {/* Boutique Policies */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-brand-gold font-serif">
              Customer Care
            </h4>
            <ul className="space-y-2 text-sm text-brand-ivory/80">
              <li>
                <Link to="/about" className="hover:text-brand-gold transition-colors">
                  About Nool & Nila
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-brand-gold transition-colors">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="hover:text-brand-gold transition-colors">
                  Returns & Exchange Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-brand-gold transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-gold transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-gold transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* WhatsApp & Concierge */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider uppercase text-brand-gold font-serif">
              Personal Concierge
            </h4>
            <p className="text-xs text-brand-ivory/70 leading-relaxed">
              Need video consultation or assistance with matching blouse fabrics? Connect with our boutique stylist directly.
            </p>
            <div className="space-y-2 text-xs text-brand-ivory/90 pt-1">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${storeName}! I would like to consult with a saree stylist.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                <span className="font-medium">WhatsApp: +{whatsappNumber}</span>
              </a>
              <div className="flex items-center space-x-2 text-brand-ivory/70 pt-1">
                <Mail className="w-3.5 h-3.5 text-brand-gold" />
                <span>{supportEmail}</span>
              </div>
              <div className="flex items-center space-x-2 text-brand-ivory/70">
                <MapPin className="w-3.5 h-3.5 text-brand-gold" />
                <span>Boutique Studio • Chennai & Pan-India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-brand-ivory/60 space-y-4 md:space-y-0">
          <p>© {new Date().getFullYear()} Nool & Nila. All rights reserved. Handwoven with pride in India.</p>
          <div className="flex items-center space-x-6 text-brand-gold/80">
            <span>Free Shipping Above ₹5,000</span>
            <span>•</span>
            <span>Handloom Verification Guaranteed</span>
            <span>•</span>
            <span>Direct Artisan Looms</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
