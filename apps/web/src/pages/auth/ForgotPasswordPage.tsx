import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { buildWhatsAppLink } from '@nool-and-nila/shared';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { whatsappNumber } = useStoreSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setIsSubmitted(true);
    } catch {
      setIsSubmitted(true); // Generic confirmation for security
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 space-y-6">
      <div className="text-center space-y-2">
        <Link to="/" className="inline-block">
          <span className="font-serif text-3xl font-bold text-brand-maroon">
            Nool & Nila
          </span>
        </Link>
        <h1 className="font-serif text-2xl font-bold text-brand-charcoal">
          Reset Your Password
        </h1>
        <p className="text-xs text-gray-500">
          Enter your registered email and we will send instructions to regain access.
        </p>
      </div>

      {isSubmitted ? (
        <div className="bg-white p-8 rounded-xl border border-brand-beige text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-serif font-bold text-base">Check Your Inbox</h3>
          <p className="text-xs text-gray-600">
            If an account exists with <strong>{email}</strong>, password reset instructions have been dispatched.
          </p>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <p className="text-[11px] text-gray-500">
              Need immediate assistance? You may also reach out directly to our boutique concierge:
            </p>
            <a
              href={buildWhatsAppLink(whatsappNumber, `Hello Nool & Nila concierge, I need assistance recovering access to my account for ${email}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Contact Concierge on WhatsApp</span>
            </a>
          </div>

          <div className="pt-2">
            <Link to="/login" className="text-xs font-bold text-brand-maroon hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-brand-beige space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Registered Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold shadow flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <span>{isLoading ? 'Sending...' : 'Send Reset Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-xs text-gray-500 pt-2">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-brand-maroon hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </div>
  );
};
