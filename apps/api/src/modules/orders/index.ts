import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { optionalAuth, authenticate } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { OrderRequestSchema, STORE_DEFAULTS, ORDER_STATUS } from '@nool-and-nila/shared';
import { WhatsAppService } from '../../integrations/whatsapp/index.js';

const router = Router();

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const timeEntropy = Date.now().toString(36).toUpperCase().slice(-4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `NN-${year}-${timeEntropy}${randomSuffix}`;
}

// POST /orders/request - Submit manual order request (Pathway B)
router.post('/request', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = OrderRequestSchema.parse(req.body);
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (!userId && !sessionId) {
      throw new AppError('Session or user authentication required to place an order.', 400);
    }

    // Fetch user or guest cart
    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: 'asc' } },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty. Please add sarees before requesting an order.', 400);
    }

    // Execute concurrency-safe transaction
    const order = await prisma.$transaction(async (tx) => {
      let subtotalPaise = 0;
      const orderItemsData: any[] = [];

      for (const item of cart.items) {
        // Re-read active product with lock/latest data
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          throw new AppError(`The saree "${item.product.name}" is no longer available.`, 400);
        }

        if (product.stockQuantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Only ${product.stockQuantity} piece(s) available.`,
            400
          );
        }

        const unitPrice = item.variant?.pricePaise ?? product.pricePaise;
        const lineTotal = unitPrice * item.quantity;
        subtotalPaise += lineTotal;

        const mainImage = item.product.images[0]?.url || '/images/sarees/default.jpg';

        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          fabric: product.fabric,
          color: product.color,
          imageUrl: mainImage,
          pricePaise: unitPrice,
          quantity: item.quantity,
          totalPaise: lineTotal,
        });

        // Atomic conditional decrement to guarantee race condition immunity and prevent negative stock
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new AppError(
            `Insufficient stock for "${product.name}". The available pieces were just reserved.`,
            400
          );
        }

        const newStock = product.stockQuantity - item.quantity;
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            quantityChange: -item.quantity,
            previousStock: product.stockQuantity,
            newStock,
            reason: `ORDER_REQUEST`,
            createdByName: input.customerName,
          },
        });
      }

      // Calculate shipping using store settings if available
      let freeThreshold = STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE;
      let standardFee = STORE_DEFAULTS.STANDARD_SHIPPING_PAISE;
      try {
        const storeSetting = await tx.storeSetting.findUnique({
          where: { key: 'boutique_settings' },
        });
        if (storeSetting?.value) {
          const parsed = JSON.parse(storeSetting.value);
          if (typeof parsed.freeShippingThresholdPaise === 'number') {
            freeThreshold = parsed.freeShippingThresholdPaise;
          }
          if (typeof parsed.standardShippingFeePaise === 'number') {
            standardFee = parsed.standardShippingFeePaise;
          }
        }
      } catch {
        // Fallback to defaults
      }

      const shippingFeePaise = subtotalPaise >= freeThreshold ? 0 : standardFee;
      const totalPaise = subtotalPaise + shippingFeePaise;
      const orderNumber = generateOrderNumber();

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          customerName: input.customerName,
          customerEmail: input.customerEmail || null,
          customerPhone: input.customerPhone,
          shippingStreet: input.streetAddress,
          shippingLandmark: input.landmark || null,
          shippingCity: input.city,
          shippingState: input.state,
          shippingPostalCode: input.postalCode,
          status: ORDER_STATUS.PENDING_CONFIRMATION,
          paymentStatus: 'NOT_APPLICABLE',
          subtotalPaise,
          shippingFeePaise,
          discountPaise: 0,
          totalPaise,
          customerNotes: input.customerNotes || null,
          items: {
            create: orderItemsData,
          },
          statusHistory: {
            create: {
              status: ORDER_STATUS.PENDING_CONFIRMATION,
              notes: 'Order request submitted by customer. Awaiting boutique confirmation.',
              createdByName: input.customerName,
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // Clear cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    // Retrieve dynamic WhatsApp number from store settings if configured
    let dynamicWhatsAppNumber: string | undefined;
    const storeSetting = await prisma.storeSetting.findUnique({
      where: { key: 'boutique_settings' },
    });
    if (storeSetting?.value) {
      try {
        const parsed = JSON.parse(storeSetting.value);
        if (parsed.whatsappNumber) dynamicWhatsAppNumber = parsed.whatsappNumber;
      } catch (e) {
        // Fallback
      }
    }

    const whatsappResult = WhatsAppService.getOrderEnquiryLink(
      order.orderNumber,
      input.customerName,
      dynamicWhatsAppNumber
    );

    return res.status(201).json({
      success: true,
      message: 'Order request received successfully. Our boutique team will review and confirm shortly.',
      data: {
        order,
        whatsapp: whatsappResult,
        nextSteps: [
          'Our master weaver & inventory team verifies loom availability.',
          'You will receive a call or WhatsApp message with confirmation.',
          'Offline payment instructions (NEFT/UPI/Bank Transfer) will be shared directly.',
          'Saree will be steamed, quality checked, and packed in luxury packaging.',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders - Authenticated customer's orders
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// GET /orders/:id - Customer order detail
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const where: any = { id };
    if (req.user!.role !== 'ADMIN') {
      where.userId = req.user!.id;
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
