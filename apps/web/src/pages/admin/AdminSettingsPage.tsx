import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { StoreSettingsDto, STORE_DEFAULTS } from '@nool-and-nila/shared';
import { Settings, Save, Check, AlertCircle } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState(STORE_DEFAULTS.BRAND_NAME);
  const [tagline, setTagline] = useState(STORE_DEFAULTS.TAGLINE);
  const [whatsappNumber, setWhatsappNumber] = useState(STORE_DEFAULTS.DEFAULT_WHATSAPP_NUMBER);
  const [supportEmail, setSupportEmail] = useState('concierge@noolandnila.com');
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210');
  const [freeShippingThresholdInr, setFreeShippingThresholdInr] = useState('5000');
  const [standardShippingInr, setStandardShippingInr] = useState('250');
  const [lowStockThreshold, setLowStockThreshold] = useState('3');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await fetchApi<StoreSettingsDto>('/admin/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setStoreName(data.storeName);
      setTagline(data.tagline || '');
      setWhatsappNumber(data.whatsappNumber);
      setSupportEmail(data.supportEmail || '');
      setSupportPhone(data.supportPhone || '');
      setFreeShippingThresholdInr((data.freeShippingThresholdPaise / 100).toString());
      setStandardShippingInr((data.standardShippingFeePaise / 100).toString());
      setLowStockThreshold(data.lowStockThreshold.toString());
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      return await fetchApi('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          storeName,
          tagline,
          whatsappNumber,
          supportEmail,
          supportPhone,
          freeShippingThresholdPaise: parseInt(freeShippingThresholdInr, 10) * 100,
          standardShippingFeePaise: parseInt(standardShippingInr, 10) * 100,
          lowStockThreshold: parseInt(lowStockThreshold, 10),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to save settings. Please verify inputs.');
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-charcoal">Boutique Configuration</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage brand details, WhatsApp business number, and shipping thresholds.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-5 text-xs"
      >
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Store Brand Name *</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Brand Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">
            WhatsApp Business Number (International digits only, no + sign) *
          </label>
          <input
            type="text"
            required
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="919876543210"
            className="w-full px-3 py-2 border rounded font-mono"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Used across the site for product enquiries, cart consultation, and order confirmations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Support Phone</label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div>
            <label className="block font-semibold mb-1">Free Shipping Min (₹)</label>
            <input
              type="number"
              value={freeShippingThresholdInr}
              onChange={(e) => setFreeShippingThresholdInr(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Standard Shipping Fee (₹)</label>
            <input
              type="number"
              value={standardShippingInr}
              onChange={(e) => setStandardShippingInr(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Low Stock Alert Level</label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono"
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t">
          {savedSuccess && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Settings successfully saved!</span>
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 bg-brand-maroon hover:bg-brand-maroon-dark text-white rounded font-semibold text-xs transition-colors shadow"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Boutique Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
