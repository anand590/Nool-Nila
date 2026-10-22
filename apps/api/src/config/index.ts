import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  jwtSecret: process.env.JWT_SECRET || 'nool_and_nila_secure_jwt_secret_token_dev_key_2026_xyz',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'nool_and_nila_cookie_secret_key_dev_2026',
  whatsappBusinessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || '919876543210',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    isConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
  },
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  email: {
    apiKey: process.env.EMAIL_PROVIDER_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Nool & Nila <concierge@noolandnila.com>',
    isConfigured: Boolean(process.env.EMAIL_PROVIDER_API_KEY),
  },
};

// Fail-fast security check: Reject starting in production with insecure fallback credentials or dev database
if (config.isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('dev_key')) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be explicitly set to a cryptographically strong secret in production.');
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.includes('dev_2026')) {
    throw new Error('CRITICAL SECURITY ERROR: COOKIE_SECRET must be explicitly set to a strong secret in production.');
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db')) {
    throw new Error('CRITICAL CONFIG ERROR: DATABASE_URL must be explicitly configured for production and cannot point to dev.db.');
  }
}
