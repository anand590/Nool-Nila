import { OrderStatus, PaymentStatus, UserRole } from '../constants/index.js';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  createdAt: string;
}

export interface AddressDto {
  id: string;
  userId?: string | null;
  fullName: string;
  phone: string;
  streetAddress: string;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText?: string | null;
  displayOrder: number;
}

export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  title: string;
  colorName?: string | null;
  colorHex?: string | null;
  pricePaise: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description: string;
  fabric: string;
  weave: string;
  zariType: string;
  lengthMeters: number;
  blouseIncluded: boolean;
  blouseDetails?: string | null;
  washCare: string;
  color: string;
  colorHex?: string | null;
  occasion: string;
  pricePaise: number; // Stored in paise (e.g. 1550000 = ₹15,500)
  mrpPaise?: number | null;
  stockQuantity: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  categoryId: string;
  category?: CategoryDto;
  images: ProductImageDto[];
  variants?: ProductVariantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemDto {
  id: string;
  productId: string;
  variantId?: string | null;
  variant?: ProductVariantDto | null;
  quantity: number;
  product: ProductDto;
}

export interface CartDto {
  id: string;
  sessionId?: string | null;
  userId?: string | null;
  items: CartItemDto[];
  subtotalPaise: number;
  itemCount: number;
  shippingEstimatePaise: number;
  freeShippingQualified: boolean;
  freeShippingRemainingPaise: number;
}

export interface WishlistItemDto {
  id: string;
  productId: string;
  product: ProductDto;
  createdAt: string;
}

export interface OrderItemSnapshotDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  fabric: string;
  color: string;
  imageUrl: string;
  pricePaise: number;
  quantity: number;
  totalPaise: number;
}

export interface OrderStatusHistoryDto {
  id: string;
  status: OrderStatus;
  notes?: string | null;
  createdAt: string;
  createdByName?: string | null;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  shippingStreet: string;
  shippingLandmark?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemSnapshotDto[];
  subtotalPaise: number;
  shippingFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  customerNotes?: string | null;
  adminNotes?: string | null;
  statusHistory: OrderStatusHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementDto {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdByName?: string | null;
  createdAt: string;
}

export interface AdminDashboardMetricsDto {
  totalOrders: number;
  pendingConfirmations: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  lowStockCount: number;
  totalProducts: number;
  recentOrders: OrderDto[];
}

export interface StoreSettingsDto {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  freeShippingThresholdPaise: number;
  standardShippingFeePaise: number;
  lowStockThreshold: number;
}
