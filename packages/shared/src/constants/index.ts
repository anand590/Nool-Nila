export const ORDER_STATUS = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_CONFIRMATION: 'Pending Confirmation',
  CONFIRMED: 'Confirmed by Seller',
  PROCESSING: 'Under Handloom Finishing',
  SHIPPED: 'Dispatched & In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Declined',
};

export const PAYMENT_STATUS = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PENDING_OFFLINE: 'PENDING_OFFLINE',
  PAID_OFFLINE: 'PAID_OFFLINE',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const SAREE_FABRICS = [
  'Pure Kanjivaram Silk',
  'Banarasi Katan Silk',
  'Chanderi Silk-Cotton',
  'Handloom Tussar Silk',
  'Pure Organza Silk',
  'Fine Mulmul Cotton',
  'Maheshwari Handloom',
  'Linen Silk',
] as const;

export const OCCASIONS = [
  'Bridal & Wedding',
  'Festive & Celebrations',
  'Temple & Rituals',
  'Cocktail & Reception',
  'Classic Workwear',
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Puducherry',
] as const;

export const STORE_DEFAULTS = {
  BRAND_NAME: 'Nool & Nila',
  TAGLINE: 'Threads of tradition. Woven for today.',
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
  FREE_SHIPPING_THRESHOLD_PAISE: 500000, // ₹5,000 in paise
  STANDARD_SHIPPING_PAISE: 25000, // ₹250 in paise
  LOW_STOCK_THRESHOLD: 3,
  DEFAULT_WHATSAPP_NUMBER: '919876543210',
};
