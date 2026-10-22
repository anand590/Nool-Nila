import { z } from 'zod';
import { ORDER_STATUS, INDIAN_STATES } from '../constants/index.js';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number').optional().or(z.literal('')),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required').max(128, 'Password cannot exceed 128 characters'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password cannot exceed 128 characters'),
});

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  search: z.string().optional(),
  category: z.string().optional(),
  fabric: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popularity', 'featured']).default('newest'),
});

export const AddCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 sarees per order item'),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 sarees per order item'),
});

export const OrderRequestSchema = z.object({
  customerName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  customerEmail: z.string().email('Valid email address is required').toLowerCase().trim().optional().or(z.literal('')),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'),
  streetAddress: z.string().min(5, 'Delivery address must be at least 5 characters').max(300),
  landmark: z.string().max(100).optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().refine(val => (INDIAN_STATES as readonly string[]).includes(val), {
    message: 'Please select a valid Indian state or union territory',
  }),
  postalCode: z.string().regex(/^\d{6}$/, 'Please enter a valid 6-digit Indian PIN code'),
  customerNotes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal('')),
});

export const AdminProductSchema = z.object({
  name: z.string().min(3, 'Product name is required').max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)'),
  sku: z.string().min(3).max(50),
  shortDescription: z.string().max(300).optional().or(z.literal('')),
  description: z.string().min(10, 'Detailed description is required'),
  fabric: z.string().min(2, 'Fabric type is required'),
  weave: z.string().min(2, 'Weave technique is required'),
  zariType: z.string().min(2, 'Zari type is required'),
  lengthMeters: z.number().positive().default(5.5),
  blouseIncluded: z.boolean().default(true),
  blouseDetails: z.string().max(200).optional().or(z.literal('')),
  washCare: z.string().min(3, 'Care instructions are required'),
  color: z.string().min(2, 'Color is required'),
  colorHex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional().or(z.literal('')),
  occasion: z.string().min(2, 'Occasion is required'),
  pricePaise: z.number().int().positive('Price must be greater than zero'),
  mrpPaise: z.number().int().positive().optional().nullable(),
  stockQuantity: z.number().int().nonnegative('Stock cannot be negative').default(1),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(true),
  isActive: z.boolean().default(true),
  categoryId: z.string().min(1, 'Category is required'),
  images: z.array(z.object({
    url: z.string().min(1, 'Image URL or path is required'),
    altText: z.string().optional().or(z.literal('')),
    displayOrder: z.number().int().default(0),
  })).min(1, 'At least one product image is required'),
});

export const AdminCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
  description: z.string().max(500).optional().or(z.literal('')),
  imageUrl: z.string().optional().or(z.literal('')),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(ORDER_STATUS),
  notes: z.string().max(500).optional(),
  trackingCarrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export const AdjustInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityChange: z.number().int().refine(val => val !== 0, 'Quantity change must not be zero'),
  reason: z.string().min(3, 'A clear reason for stock adjustment is required').max(300),
});

export const StoreSettingsSchema = z.object({
  storeName: z.string().min(2).max(100),
  tagline: z.string().max(200),
  whatsappNumber: z.string().regex(/^\d{10,14}$/, 'WhatsApp number must be digits only (e.g. 919876543210)'),
  supportEmail: z.string().email(),
  supportPhone: z.string().min(10),
  freeShippingThresholdPaise: z.number().int().nonnegative(),
  standardShippingFeePaise: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().positive(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
export type OrderRequestInput = z.infer<typeof OrderRequestSchema>;
export type AdminProductInput = z.infer<typeof AdminProductSchema>;
export type AdminCategoryInput = z.infer<typeof AdminCategorySchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;
export type AdjustInventoryInput = z.infer<typeof AdjustInventorySchema>;
export type StoreSettingsInput = z.infer<typeof StoreSettingsSchema>;
