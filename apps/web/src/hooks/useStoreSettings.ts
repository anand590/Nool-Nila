import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { StoreSettingsDto, STORE_DEFAULTS } from '@nool-and-nila/shared';

export function useStoreSettings() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      try {
        const res = await fetchApi<StoreSettingsDto>('/settings');
        return res.data;
      } catch (err) {
        return null;
      }
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    settings: data || null,
    whatsappNumber: data?.whatsappNumber || STORE_DEFAULTS.DEFAULT_WHATSAPP_NUMBER,
    storeName: data?.storeName || STORE_DEFAULTS.BRAND_NAME,
    tagline: data?.tagline || STORE_DEFAULTS.TAGLINE,
    supportEmail: data?.supportEmail || 'concierge@noolandnila.com',
    supportPhone: data?.supportPhone || '+91 98765 43210',
    freeShippingThresholdPaise: data?.freeShippingThresholdPaise ?? STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE,
  };
}
