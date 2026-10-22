import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-brand-ivory flex items-center justify-center text-brand-maroon">
        <Compass className="w-8 h-8 opacity-70" />
      </div>
      <span className="text-xs uppercase font-bold text-brand-gold tracking-widest">404 Error</span>
      <h1 className="font-serif text-3xl font-bold text-brand-charcoal">Page Not Found</h1>
      <p className="text-xs text-gray-500 max-w-sm mx-auto">
        The page you are looking for has been moved or does not exist in our boutique collection.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold shadow transition-colors"
        >
          <span>Return to Boutique Home</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
