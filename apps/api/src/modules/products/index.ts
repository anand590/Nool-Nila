import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { ProductQuerySchema } from '@nool-and-nila/shared';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// GET /products - Filtered and paginated catalogue
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = ProductQuerySchema.parse(req.query);

    const where: any = {
      isActive: true,
    };

    // Category filter by slug or ID
    if (query.category) {
      where.category = {
        OR: [
          { slug: query.category },
          { id: query.category },
        ],
      };
    }

    // Fabric filter
    if (query.fabric) {
      where.fabric = {
        contains: query.fabric,
      };
    }

    // Color filter
    if (query.color) {
      where.color = {
        contains: query.color,
      };
    }

    // In stock filter
    if (query.inStock === 'true') {
      where.stockQuantity = { gt: 0 };
    }

    // Price range filters (in INR, convert to paise)
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.pricePaise = {};
      if (query.minPrice !== undefined) {
        where.pricePaise.gte = Math.round(query.minPrice * 100);
      }
      if (query.maxPrice !== undefined) {
        where.pricePaise.lte = Math.round(query.maxPrice * 100);
      }
    }

    // Search query (matches name, SKU, shortDescription, fabric, or color)
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s } },
        { sku: { contains: s } },
        { shortDescription: { contains: s } },
        { fabric: { contains: s } },
        { color: { contains: s } },
        { weave: { contains: s } },
      ];
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'price_asc') {
      orderBy = { pricePaise: 'asc' };
    } else if (query.sort === 'price_desc') {
      orderBy = { pricePaise: 'desc' };
    } else if (query.sort === 'featured') {
      orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          images: {
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy,
        skip,
        take: query.limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/featured - Featured sarees
router.get('/products/featured', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      take: 8,
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/new-arrivals - New arrivals
router.get('/products/new-arrivals', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isNewArrival: true,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// GET /products/:slug - Product details with related items
router.get('/products/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          where: { isActive: true },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new AppError('Product not found or currently unavailable.', 404);
    }

    // Fetch related products in the same category or fabric
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [
          { categoryId: product.categoryId },
          { fabric: product.fabric },
        ],
      },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { displayOrder: 'asc' } },
      },
      take: 4,
    });

    return res.json({
      success: true,
      data: {
        product,
        relatedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /categories - List categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    const data = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      productCount: cat._count.products,
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// GET /categories/:slug - Category detail by slug
router.get('/categories/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new AppError('Collection not found.', 404);
    }

    return res.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        displayOrder: category.displayOrder,
        isActive: category.isActive,
        productCount: category._count.products,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
