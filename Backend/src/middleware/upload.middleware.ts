import multer from 'multer';
import { config } from '@config/index';

/**
 * Most LearnWave uploads go directly from the browser to Cloudinary via a
 * signed URL (see content.service.ts#initiateUpload), so the API itself
 * rarely needs to receive file bytes. This multer instance exists for the
 * narrow set of cases where the API does need to handle a multipart upload
 * directly — e.g., admin tooling, avatar uploads, or local/dev environments
 * without a configured Cloudinary signed-upload flow.
 *
 * Stores in memory (not disk) since these paths are expected to handle
 * small files only (e.g., avatars); large media must use the direct-to-
 * Cloudinary flow.
 */
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB ceiling for any direct-to-API upload
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type for direct upload: ${file.mimetype}`));
    }
  },
});

export const uploadLimits = config.upload;
