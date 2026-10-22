import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { buildWhatsAppLink } from '@nool-and-nila/shared';
import { useStoreSettings } from '../../hooks/useStoreSettings';

interface WhatsAppButtonProps {
  variant?: 'floating' | 'inline';
  message?: string;
  label?: string;
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  variant = 'floating',
  message = 'Hello Nool & Nila! I am interested in exploring your handloom saree collection. Could you guide me?',
  label = 'Consult on WhatsApp',
  className = '',
}) => {
  const { whatsappNumber } = useStoreSettings();
  const [showTooltip, setShowTooltip] = useState(false);
  const whatsappUrl = buildWhatsAppLink(whatsappNumber, message);

  if (variant === 'inline') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm transition-colors ${className}`}
      >
        <MessageCircle className="w-4 h-4 text-emerald-200" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center">
      {/* Tooltip Card */}
      {showTooltip && (
        <div className="mr-3 bg-white p-3.5 rounded-lg shadow-luxury border border-brand-beige text-xs max-w-xs animate-slideLeft relative">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-brand-charcoal">Boutique Stylist Online</span>
          </div>
          <p className="text-gray-600 leading-tight">
            Ask for fabric close-ups, blouse pairing suggestions, or custom weaving enquiries!
          </p>
        </div>
      )}

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-luxury-hover transition-all transform hover:scale-105 relative group"
        aria-label="Chat on WhatsApp with Saree Stylist"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </span>
      </a>
    </div>
  );
};
