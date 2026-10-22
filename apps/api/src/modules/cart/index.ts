import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { optionalAuth, authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
  STORE_DEFAULTS,
} from '@nool-and-nila/shared';
import { WhatsAppService } from '../../integrations/whatsapp/index.js';

const router = Router();

// Helper to find or create cart for user or guest session
async function getOrCreateCart(req: Request) {
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  if (!userId && !sessionId) {
    throw new AppError('Session identifier or authentication required for cart.', 400);
  }

  let cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { orderBy: { displayOrder: 'asc' } },
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId: userId || null,
        sessionId: userId ? null : sessionId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: 'asc' } },
                category: { select: { id: true, name: true, slug: true } },
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  return cart;
}

// Helper to fetch active store shipping settings
async function getStoreShippingConfig() {
  try {
    const settingRecord = await prisma.storeSetting.findUnique({
      where: { key: 'boutique_settings' },
    });
    if (settingRecord?.value) {
      const parsed = JSON.parse(settingRecord.value);
      return {
        freeThreshold:
          typeof parsed.freeShippingThresholdPaise === 'number'
            ? parsed.freeShippingThresholdPaise
            : STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE,
        standardFee:
          typeof parsed.standardShippingFeePaise === 'number'
            ? parsed.standardShippingFeePaise
            : STORE_DEFAULTS.STANDARD_SHIPPING_PAISE,
      };
    }
  } catch {
    // Fallback to defaults
  }
  return {
    freeThreshold: STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE,
    standardFee: STORE_DEFAULTS.STANDARD_SHIPPING_PAISE,
  };
}

// Helper to calculate totals and free shipping progress
function calculateCartTotals(cart: any, shippingConfig?: { freeThreshold: number; standardFee: number }) {
  let subtotalPaise = 0;
  let itemCount = 0;

  for (const item of cart.items) {
    if (!item.product) continue;
    const unitPrice = item.variant?.pricePaise ?? item.product.pricePaise;
    subtotalPaise += unitPrice * item.quantity;
    itemCount += item.quantity;
  }

  const freeThreshold = shippingConfig?.freeThreshold ?? STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE;
  const standardFee = shippingConfig?.standardFee ?? STORE_DEFAULTS.STANDARD_SHIPPING_PAISE;
  const freeShippingQualified = subtotalPaise >= freeThreshold;
  const shippingEstimatePaise = freeShippingQualified || subtotalPaise === 0 ? 0 : standardFee;
  const freeShippingRemainingPaise = freeShippingQualified ? 0 : Math.max(0, freeThreshold - subtotalPaise);

  return {
    ...cart,
    subtotalPaise,
    itemCount,
    shippingEstimatePaise,
    freeShippingQualified,
    freeShippingRemainingPaise,
  };
}

// GET /cart
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [cart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      data: calculateCartTotals(cart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /cart - Clear all items in cart
router.delete('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await getOrCreateCart(req);
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    const [updatedCart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      message: 'Cart cleared successfully.',
      data: calculateCartTotals(updatedCart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// POST /cart/items - Add item to cart
router.post('/items', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AddCartItemSchema.parse(req.body);
    const cart = await getOrCreateCart(req);

    // Verify product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || !product.isActive) {
      throw new AppError('Product not found or unavailable.', 404);
    }

    if (product.stockQuantity < input.quantity) {
      throw new AppError(
        `Only ${product.stockQuantity} item(s) available in stock for ${product.name}.`,
        400
      );
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: input.productId,
        variantId: input.variantId || null,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + input.quantity;
      if (newQty > 10) {
        throw new AppError('Cannot add more than 10 sarees per item to your cart.', 400);
      }
      if (newQty > product.stockQuantity) {
        throw new AppError(
          `Cannot add more than available stock (${product.stockQuantity} total).`,
          400
        );
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId || null,
          quantity: input.quantity,
        },
      });
    }

    const [updatedCart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      message: 'Item added to your shopping bag.',
      data: calculateCartTotals(updatedCart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /cart/items/:id - Update item quantity
router.patch('/items/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const input = UpdateCartItemSchema.parse(req.body);
    const cart = await getOrCreateCart(req);

    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new AppError('Cart item not found.', 404);
    }

    if (item.product.stockQuantity < input.quantity) {
      throw new AppError(
        `Only ${item.product.stockQuantity} piece(s) available for ${item.product.name}.`,
        400
      );
    }

    await prisma.cartItem.update({
      where: { id },
      data: { quantity: input.quantity },
    });

    const [updatedCart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      data: calculateCartTotals(updatedCart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /cart/items/:id - Remove item
router.delete('/items/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const cart = await getOrCreateCart(req);

    const item = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!item || item.cartId !== cart.id) {
      throw new AppError('Cart item not found.', 404);
    }

    await prisma.cartItem.delete({
      where: { id },
    });

    const [updatedCart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      message: 'Item removed from bag.',
      data: calculateCartTotals(updatedCart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// POST /cart/merge - Merge anonymous guest cart with user cart on login
router.post('/merge', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guestSessionId = req.body.sessionId;
    if (!guestSessionId) {
      return res.json({ success: true, message: 'No guest cart to merge.' });
    }

    const guestCart = await prisma.cart.findUnique({
      where: { sessionId: guestSessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ success: true, message: 'Guest cart was empty.' });
    }

    const userCart = await getOrCreateCart(req);

    for (const gItem of guestCart.items) {
      const existing = await prisma.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: gItem.productId,
          variantId: gItem.variantId,
        },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(10, existing.quantity + gItem.quantity) },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: gItem.productId,
            variantId: gItem.variantId,
            quantity: Math.min(10, gItem.quantity),
          },
        });
      }
    }

    // Clean up guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } });

    const [mergedCart, shippingConfig] = await Promise.all([
      getOrCreateCart(req),
      getStoreShippingConfig(),
    ]);
    return res.json({
      success: true,
      message: 'Cart merged successfully.',
      data: calculateCartTotals(mergedCart, shippingConfig),
    });
  } catch (error) {
    next(error);
  }
});

// GET /cart/whatsapp-enquiry - Build WhatsApp enquiry link for current cart
router.get('/whatsapp-enquiry', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await getOrCreateCart(req);
    const totals = calculateCartTotals(cart);

    if (cart.items.length === 0) {
      throw new AppError('Your cart is empty. Add items before generating an enquiry.', 400);
    }

    const itemsSummary = cart.items.map((i: any) => ({
      name: i.product.name,
      sku: i.product.sku,
      quantity: i.quantity,
    }));

    const result = WhatsAppService.getCartEnquiryLink(itemsSummary, totals.subtotalPaise);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
