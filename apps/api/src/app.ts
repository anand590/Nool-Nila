import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

import { prisma } from './config/prisma.js';
import { STORE_DEFAULTS } from '@nool-and-nila/shared';

import authRouter from './modules/auth/index.js';
import productsRouter from './modules/products/index.js';
import cartRouter from './modules/cart/index.js';
import wishlistRouter from './modules/wishlist/index.js';
import ordersRouter from './modules/orders/index.js';
import adminRouter from './modules/admin/index.js';
import { isMaintenanceModeActive } from './services/backupService.js';

export function createApp(): Express {
  const app = express();

  // Trust first proxy hop in production (Nginx/Cloudflare/ALB) for accurate client IP rate limiting
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  // Security headers: CSP, Clickjacking protection, Referrer policy
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
          connectSrc: ["'self'", config.appUrl, config.apiUrl],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // CORS
  const allowedOrigins = [
    config.appUrl,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Allow Vercel preview deployments (e.g. https://nool-and-nila-*.vercel.app)
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        if (!config.isProduction) {
          return callback(null, true); // Permissive in dev
        }
        callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
    })
  );

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Parsers with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(config.cookieSecret));

  // Static files for uploaded images (when Cloudinary not configured)
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    skip: () => config.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  });

  // Rate limiter for authentication routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    skip: () => config.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  });

  // Rate limiter for order placement to prevent checkout spam & inventory holding
  const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 orders per 15 minutes per IP
    skip: () => config.nodeEnv === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many order requests. Please wait before submitting another order.',
    },
  });

  app.use('/api', apiLimiter);

  // Health check (always available even during maintenance mode)
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'Nool & Nila API',
      status: isMaintenanceModeActive() ? 'maintenance' : 'operational',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // Maintenance mode guard: Rejects requests with 503 during restore or database maintenance
  app.use('/api', (req: Request, res: Response, next) => {
    if (isMaintenanceModeActive()) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({
        success: false,
        status: 'maintenance',
        message: 'Nool & Nila service is currently undergoing scheduled maintenance. Please retry in a few moments.',
      });
    }
    next();
  });

  // Public Store Settings (Dynamic WhatsApp number, boutique name, shipping rules)
  app.get('/api/v1/settings', async (_req: Request, res: Response) => {
    try {
      const settingRecord = await prisma.storeSetting.findUnique({
        where: { key: 'boutique_settings' },
      });

      let storeConfig = {
        storeName: STORE_DEFAULTS.BRAND_NAME,
        tagline: STORE_DEFAULTS.TAGLINE,
        whatsappNumber: config.whatsappBusinessNumber || STORE_DEFAULTS.DEFAULT_WHATSAPP_NUMBER,
        supportEmail: 'concierge@noolandnila.com',
        supportPhone: '+91 98765 43210',
        freeShippingThresholdPaise: STORE_DEFAULTS.FREE_SHIPPING_THRESHOLD_PAISE,
        standardShippingFeePaise: STORE_DEFAULTS.STANDARD_SHIPPING_PAISE,
        lowStockThreshold: STORE_DEFAULTS.LOW_STOCK_THRESHOLD,
      };

      if (settingRecord && settingRecord.value) {
        try {
          const parsed = JSON.parse(settingRecord.value);
          storeConfig = { ...storeConfig, ...parsed };
        } catch (e) {
          // Fallback to defaults
        }
      }

      return res.json({
        success: true,
        data: storeConfig,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve boutique settings',
      });
    }
  });

  // Mount API modules
  app.use('/api/v1/auth', authLimiter, authRouter);
  app.use('/api/v1', productsRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/wishlist', wishlistRouter);
  app.use('/api/v1/orders/request', orderLimiter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/admin', adminRouter);

  // 404 handler for unknown routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
