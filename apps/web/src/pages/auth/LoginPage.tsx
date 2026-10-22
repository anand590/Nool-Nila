import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginInput } from '@nool-and-nila/shared';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawFrom = (location.state as any)?.from?.pathname || '/';
  const from =
    typeof rawFrom === 'string' &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//') &&
    !rawFrom.includes('\\')
      ? rawFrom
      : '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setValue('email', 'admin@noolandnila.com');
    setValue('password', 'AdminPassword123!');
  };

  const handleFillDemoCustomer = () => {
    setValue('email', 'priya.sharma@example.com');
    setValue('password', 'Customer123!');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <Link to="/" className="inline-block">
          <span className="font-serif text-3xl font-bold text-brand-maroon">
            Nool & Nila
          </span>
        </Link>
        <h1 className="font-serif text-2xl font-bold text-brand-charcoal">
          Sign In to Your Account
        </h1>
        <p className="text-xs text-gray-500">
          Access your saved wishlist, order requests, and concierge history.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Demo Credentials Helper Pill */}
      <div className="bg-brand-ivory p-3.5 rounded-lg border border-brand-beige text-xs space-y-2">
        <p className="font-bold text-brand-charcoal text-[11px] uppercase tracking-wider flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
          <span>Quick Demo Logins</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="flex-1 py-1 px-2.5 bg-brand-maroon/10 hover:bg-brand-maroon/20 text-brand-maroon font-semibold rounded text-[11px] transition-colors"
          >
            Fill Admin Demo
          </button>
          <button
            type="button"
            onClick={handleFillDemoCustomer}
            className="flex-1 py-1 px-2.5 bg-brand-charcoal/10 hover:bg-brand-charcoal/20 text-brand-charcoal font-semibold rounded text-[11px] transition-colors"
          >
            Fill Customer Demo
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-8 rounded-xl border border-brand-beige shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              {...register('email')}
              placeholder="name@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
            />
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-gray-700">Password</label>
            <Link to="/forgot-password" className="text-[11px] text-brand-maroon hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded text-xs font-semibold tracking-wide shadow flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-gray-500">
        New to Nool & Nila?{' '}
        <Link to="/register" className="font-semibold text-brand-maroon hover:underline">
          Create an Account
        </Link>
      </p>
    </div>
  );
};
