import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, RegisterInput } from '@nool-and-nila/shared';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, User, Phone, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await registerAuth(data);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          Create an Account
        </h1>
        <p className="text-xs text-gray-500">
          Save your wishlist, track manual order requests, and receive boutique updates.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-8 rounded-xl border border-brand-beige shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Priya Sharma"
              className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
            />
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.name && (
            <p className="text-[11px] text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Email Address *
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
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Mobile Number (Optional)
          </label>
          <div className="relative">
            <input
              type="tel"
              {...register('phone')}
              placeholder="9876543210"
              className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-brand-maroon focus:outline-none"
            />
            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          {errors.phone && (
            <p className="text-[11px] text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Password (Min. 8 characters) *
          </label>
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
            <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-maroon hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
};
