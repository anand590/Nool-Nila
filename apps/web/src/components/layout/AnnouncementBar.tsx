import React from 'react';
import { Sparkles } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-brand-maroon text-brand-ivory text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center space-x-2">
      <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
      <span>Complimentary insured shipping across India on orders above ₹5,000</span>
      <span className="hidden md:inline text-brand-gold">✦</span>
      <span className="hidden md:inline">Authentic Handloom Certified</span>
      <span className="hidden md:inline text-brand-gold">✦</span>
      <span className="hidden md:inline">WhatsApp Concierge Available</span>
    </div>
  );
};
