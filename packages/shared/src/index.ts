export * from './constants/index.js';
export * from './types/index.js';
export * from './schemas/index.js';

/**
 * Format paise into Indian Rupee format (e.g. 1550000 -> "₹15,500")
 */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Generate a WhatsApp click-to-chat URL with properly encoded message.
 */
export function buildWhatsAppLink(whatsappNumber: string, message: string): string {
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Generate standard product enquiry message for WhatsApp.
 */
export function buildProductEnquiryMessage(product: {
  name: string;
  sku: string;
  productUrl?: string;
}): string {
  const urlPart = product.productUrl ? ` Product link: ${product.productUrl}.` : '';
  return `Hello Nool & Nila! I am interested in ${product.name}. SKU: ${product.sku}.${urlPart} Could you share more details about availability and delivery?`;
}

/**
 * Generate standard cart enquiry message for WhatsApp.
 */
export function buildCartEnquiryMessage(
  items: Array<{ name: string; sku: string; quantity: number }>,
  estimatedSubtotalPaise: number
): string {
  const itemsText = items.map(i => `${i.name} (SKU: ${i.sku}, Qty: ${i.quantity})`).join(', ');
  const formattedSubtotal = formatInr(estimatedSubtotalPaise);
  return `Hello Nool & Nila! I would like to enquire about the following items: ${itemsText}. Estimated cart subtotal: ${formattedSubtotal}. Please confirm availability, delivery charges and the next steps.`;
}

/**
 * Generate standard order reference follow-up message for WhatsApp.
 */
export function buildOrderEnquiryMessage(orderNumber: string, customerName: string): string {
  return `Hello Nool & Nila! I have submitted an order request with reference ${orderNumber} under the name ${customerName}. Please confirm availability and sharing payment details.`;
}
