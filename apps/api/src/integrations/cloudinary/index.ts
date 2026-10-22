import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';

if (config.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function uploadImage(file: Express.Multer.File): Promise<string> {
  // Validate file signature (magic bytes) to ensure authentic raster image payload
  if (!file.buffer || file.buffer.length < 12) {
    throw new AppError('Invalid image file payload.', 400);
  }

  const isJpeg = file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  const isPng = file.buffer[0] === 0x89 && file.buffer[1] === 0x50 && file.buffer[2] === 0x4e && file.buffer[3] === 0x47;
  const isWebp = file.buffer.toString('ascii', 0, 4) === 'RIFF' && file.buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new AppError('File signature does not match a valid image format (JPEG, PNG, WebP).', 400);
  }
  // If Cloudinary is configured, upload to Cloudinary CDN
  if (config.cloudinary.isConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nool-and-nila/products',
          transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload returned empty result'));
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  // Fallback: Local storage in public/uploads with strict image extension whitelisting
  const rawExt = path.extname(file.originalname).toLowerCase();
  const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filePath, file.buffer);
  return `/uploads/${filename}`;
}
