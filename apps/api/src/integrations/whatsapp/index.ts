import { config } from '../../config/index.js';
import {
  buildWhatsAppLink,
  buildProductEnquiryMessage,
  buildCartEnquiryMessage,
  buildOrderEnquiryMessage,
} from '@nool-and-nila/shared';

export class WhatsAppService {
  private static getNumber(overrideNumber?: string): string {
    return overrideNumber || config.whatsappBusinessNumber || '';
  }

  static isConfigured(overrideNumber?: string): boolean {
    const num = this.getNumber(overrideNumber);
    return Boolean(num && num.length >= 10);
  }

  static getProductEnquiryLink(product: { name: string; sku: string; productUrl?: string }, overrideNumber?: string): {
    url: string | null;
    message: string;
    isConfigured: boolean;
  } {
    const message = buildProductEnquiryMessage(product);
    if (!this.isConfigured(overrideNumber)) {
      return { url: null, message, isConfigured: false };
    }
    return {
      url: buildWhatsAppLink(this.getNumber(overrideNumber), message),
      message,
      isConfigured: true,
    };
  }

  static getCartEnquiryLink(
    items: Array<{ name: string; sku: string; quantity: number }>,
    estimatedSubtotalPaise: number,
    overrideNumber?: string
  ): {
    url: string | null;
    message: string;
    isConfigured: boolean;
  } {
    const message = buildCartEnquiryMessage(items, estimatedSubtotalPaise);
    if (!this.isConfigured(overrideNumber)) {
      return { url: null, message, isConfigured: false };
    }
    return {
      url: buildWhatsAppLink(this.getNumber(overrideNumber), message),
      message,
      isConfigured: true,
    };
  }

  static getOrderEnquiryLink(orderNumber: string, customerName: string, overrideNumber?: string): {
    url: string | null;
    message: string;
    isConfigured: boolean;
  } {
    const message = buildOrderEnquiryMessage(orderNumber, customerName);
    if (!this.isConfigured(overrideNumber)) {
      return { url: null, message, isConfigured: false };
    }
    return {
      url: buildWhatsAppLink(this.getNumber(overrideNumber), message),
      message,
      isConfigured: true,
    };
  }

  static getGeneralEnquiryLink(): {
    url: string | null;
    message: string;
    isConfigured: boolean;
  } {
    const message =
      'Hello Nool & Nila! I am interested in exploring your handloom saree collection. Could you help me with a recommendation?';
    if (!this.isConfigured()) {
      return { url: null, message, isConfigured: false };
    }
    return {
      url: buildWhatsAppLink(this.getNumber(), message),
      message,
      isConfigured: true,
    };
  }
}
