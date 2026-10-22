import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { optionalAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

async function getOrCreateWishlist(req: Request) {
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  if (!userId && !sessionId) {
    throw new AppError('Session identifier or authentication required for wishlist.', 400);
  }

  let wishlist = await prisma.wishlist.findFirst({
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
        },
      },
    },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
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
          },
        },
      },
    });
  }

  return wishlist;
}

// GET /wishlist
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wishlist = await getOrCreateWishlist(req);
    return res.json({
      success: true,
      data: wishlist.items.map(item => ({
        id: item.id,
        productId: item.productId,
        product: item.product,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /wishlist/items - Add to wishlist
router.post('/items', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      throw new AppError('Product ID is required.', 400);
    }

    const wishlist = await getOrCreateWishlist(req);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new AppError('Product not found.', 404);
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!existing) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });
    }

    const updated = await getOrCreateWishlist(req);
    return res.json({
      success: true,
      message: 'Added to your wishlist.',
      data: updated.items.map(item => ({
        id: item.id,
        productId: item.productId,
        product: item.product,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /wishlist/items/:productId - Remove from wishlist
router.delete('/items/:productId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    const wishlist = await getOrCreateWishlist(req);

    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    const updated = await getOrCreateWishlist(req);
    return res.json({
      success: true,
      message: 'Removed from wishlist.',
      data: updated.items.map(item => ({
        id: item.id,
        productId: item.productId,
        product: item.product,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
