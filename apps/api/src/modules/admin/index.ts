import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { uploadImage } from '../../integrations/cloudinary/index.js';
import {
  AdminProductSchema,
  AdminCategorySchema,
  UpdateOrderStatusSchema,
  AdjustInventorySchema,
  StoreSettingsSchema,
  STORE_DEFAULTS,
  ORDER_STATUS,
} from '@nool-and-nila/shared';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new AppError('Only safe raster image files (JPEG, PNG, WebP) are allowed. SVG and active content are rejected.', 400));
    }
  },
});

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

// GET /admin/dashboard - Real database-derived business metrics
router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalOrders,
      pendingConfirmations,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      lowStockCount,
      totalProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: ORDER_STATUS.PENDING_CONFIRMATION } }),
      prisma.order.count({ where: { status: ORDER_STATUS.CONFIRMED } }),
      prisma.order.count({ where: { status: ORDER_STATUS.PROCESSING } }),
      prisma.order.count({ where: { status: ORDER_STATUS.SHIPPED } }),
      prisma.order.count({ where: { status: ORDER_STATUS.DELIVERED } }),
      prisma.product.count({ where: { isActive: true, stockQuantity: { lte: STORE_DEFAULTS.LOW_STOCK_THRESHOLD } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalOrders,
        pendingConfirmations,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        lowStockCount,
        totalProducts,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/upload - Upload product photo
router.post('/upload', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded.', 400);
    }
    const url = await uploadImage(req.file);
    return res.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/products - List all products
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const rawLimit = parseInt(req.query.limit as string || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100);
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { fabric: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { displayOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/products - Create saree
router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AdminProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        shortDescription: input.shortDescription || null,
        description: input.description,
        fabric: input.fabric,
        weave: input.weave,
        zariType: input.zariType,
        lengthMeters: input.lengthMeters,
        blouseIncluded: input.blouseIncluded,
        blouseDetails: input.blouseDetails || null,
        washCare: input.washCare,
        color: input.color,
        colorHex: input.colorHex || null,
        occasion: input.occasion,
        pricePaise: input.pricePaise,
        mrpPaise: input.mrpPaise || null,
        stockQuantity: input.stockQuantity,
        isFeatured: input.isFeatured,
        isNewArrival: input.isNewArrival,
        isActive: input.isActive,
        categoryId: input.categoryId,
        images: {
          create: input.images.map((img, idx) => ({
            url: img.url,
            altText: img.altText || input.name,
            displayOrder: img.displayOrder ?? idx,
          })),
        },
      },
      include: {
        images: true,
        category: true,
      },
    });

    // Record initial inventory movement
    if (input.stockQuantity > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          quantityChange: input.stockQuantity,
          previousStock: 0,
          newStock: input.stockQuantity,
          reason: 'INITIAL_CREATION',
          createdByName: req.user!.name,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/products/:id - Update product
router.patch('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const body = req.body;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existing) {
      throw new AppError('Product not found.', 404);
    }

    const { images, ...rawFields } = body;
    const validatedFields = AdminProductSchema.partial().parse(rawFields);
    delete (validatedFields as any).id;
    delete (validatedFields as any).images;

    const updated = await prisma.$transaction(async (tx) => {
      // If images are provided, update them transactionally
      if (images && Array.isArray(images)) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((img: any, idx: number) => ({
            productId: id,
            url: img.url,
            altText: img.altText || existing.name,
            displayOrder: img.displayOrder ?? idx,
          })),
        });
      }

      return await tx.product.update({
        where: { id },
        data: validatedFields as any,
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          category: true,
        },
      });
    });

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/products/:id - Deactivate product
router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      message: 'Product archived successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/orders - Order request list with status and search
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/orders/:id - Detailed order view
router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
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

const ALLOWED_ORDER_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.PENDING_CONFIRMATION]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REJECTED]: [],
};

// PATCH /admin/orders/:id/status - Controlled order status transition
router.patch('/orders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const input = UpdateOrderStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404);
    }

    // Validate server-side permitted status transition
    if (
      input.status !== order.status &&
      !ALLOWED_ORDER_TRANSITIONS[order.status]?.includes(input.status)
    ) {
      throw new AppError(
        `Cannot transition order from status "${order.status}" to "${input.status}".`,
        400
      );
    }

    // Execute atomic transaction for inventory replenishment and order status update
    const updated = await prisma.$transaction(async (tx) => {
      // If order was cancelled or rejected, replenish inventory if not already replenished
      if (
        (input.status === ORDER_STATUS.CANCELLED || input.status === ORDER_STATUS.REJECTED) &&
        order.status !== ORDER_STATUS.CANCELLED &&
        order.status !== ORDER_STATUS.REJECTED
      ) {
        for (const item of order.items) {
          if (item.productId) {
            const prod = await tx.product.findUnique({ where: { id: item.productId } });
            if (prod) {
              const restoredStock = prod.stockQuantity + item.quantity;
              await tx.product.update({
                where: { id: prod.id },
                data: { stockQuantity: restoredStock },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: prod.id,
                  quantityChange: item.quantity,
                  previousStock: prod.stockQuantity,
                  newStock: restoredStock,
                  reason: `ORDER_${input.status}_RESTOCK`,
                  createdByName: req.user!.name,
                },
              });
            }
          }
        }
      }

      return await tx.order.update({
        where: { id },
        data: {
          status: input.status,
          trackingCarrier: input.trackingCarrier || order.trackingCarrier,
          trackingNumber: input.trackingNumber || order.trackingNumber,
          statusHistory: {
            create: {
              status: input.status,
              notes: input.notes || `Status changed to ${input.status}`,
              createdByName: req.user!.name,
            },
          },
        },
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    return res.json({
      success: true,
      message: `Order status updated to ${input.status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/inventory - Inventory overview and movements
router.get('/inventory', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        fabric: true,
        color: true,
        stockQuantity: true,
        pricePaise: true,
        images: { take: 1, orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    const recentMovements = await prisma.inventoryMovement.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        products,
        recentMovements,
        lowStockThreshold: STORE_DEFAULTS.LOW_STOCK_THRESHOLD,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/inventory/adjustments - Manual stock adjustment with mandatory audit reason
router.post('/inventory/adjustments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AdjustInventorySchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const newStock = product.stockQuantity + input.quantityChange;
    if (newStock < 0) {
      throw new AppError('Stock quantity cannot be reduced below zero.', 400);
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: newStock },
      }),
      prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          quantityChange: input.quantityChange,
          previousStock: product.stockQuantity,
          newStock,
          reason: input.reason,
          createdByName: req.user!.name,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Stock adjusted successfully.',
      data: {
        product: updatedProduct,
        movement,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/categories & POST /admin/categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AdminCategorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: input,
    });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

// GET /admin/customers
router.get('/customers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
});

// GET /admin/settings & PATCH /admin/settings
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settingRecord = await prisma.storeSetting.findUnique({
      where: { key: 'boutique_settings' },
    });

    let config = {
      storeName: STORE_DEFAULTS.BRAND_NAME,
      tagline: STORE_DEFAULTS.TAGLINE,
      whatsappNumber: STORE_DEFAULTS.DEFAULT_WHATSAPP_NUMBER,
      supportEmail: 'concierge@noolandnila.com',
      supportPhone: '+91 98765 43210',
      freeShippingThresholdPaise: STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE,
      standardShippingFeePaise: STORE_DEFAULTS.STANDARD_SHIPPING_PAISE,
      lowStockThreshold: STORE_DEFAULTS.LOW_STOCK_THRESHOLD,
    };

    if (settingRecord && settingRecord.value) {
      try {
        const parsed = JSON.parse(settingRecord.value);
        config = { ...config, ...parsed };
      } catch (err) {
        console.error('Failed to parse boutique_settings JSON:', err);
      }
    }

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = StoreSettingsSchema.parse(req.body);

    await prisma.storeSetting.upsert({
      where: { key: 'boutique_settings' },
      update: { value: JSON.stringify(input) },
      create: {
        key: 'boutique_settings',
        value: JSON.stringify(input),
      },
    });

    return res.json({
      success: true,
      message: 'Store settings saved successfully.',
      data: input,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
