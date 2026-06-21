import { v2 as cloudinary } from 'cloudinary';
import { env, config } from './index';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Generates a signed Cloudinary upload payload the client can use to upload
 * directly to Cloudinary without proxying the file bytes through our API.
 */
export function generateSignedUploadParams(opts: {
  resourceType: 'video' | 'image' | 'raw' | 'auto';
  folder?: string;
  publicId?: string;
}): {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
} {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = opts.folder ?? env.CLOUDINARY_UPLOAD_FOLDER;

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    ...(opts.publicId ? { public_id: opts.publicId } : {}),
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${opts.resourceType}/upload`,
  };
}

export { cloudinary };
export const uploadConfig = config.upload;
