import sharp from 'sharp';
import { AppError } from '../../lib/errors';
import { MercadoLibreClient } from '../mercadolibre/client';

export type RawImageInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export class ImageUploader {
  constructor(private readonly mlClient: MercadoLibreClient) {}

  private detectContentType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | 'heic' | 'unknown' {
    if (buffer.length < 12) return 'unknown';

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return 'webp';
    }

    const ftyp = buffer.subarray(4, 8).toString('ascii');
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (ftyp === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }

    return 'unknown';
  }

  private async normalizeImage(image: RawImageInput): Promise<RawImageInput> {
    if (!ALLOWED_MIME_TYPES.has(image.mimeType)) {
      throw new AppError(400, 'UNSUPPORTED_IMAGE_FORMAT', `Unsupported image format: ${image.mimeType}`);
    }

    const detected = this.detectContentType(image.buffer);
    if (detected === 'heic') {
      throw new AppError(
        400,
        'UNSUPPORTED_IMAGE_CONTENT',
        'Image appears to be HEIC/HEIF. Convert it to JPG or PNG before uploading.'
      );
    }

    if (detected === 'unknown') {
      throw new AppError(400, 'UNSUPPORTED_IMAGE_CONTENT', 'Could not detect a supported image binary format');
    }

    // Keep JPEG/PNG as-is to avoid quality/color regressions caused by unnecessary re-encoding.
    if (detected === 'jpeg' || detected === 'png') {
      return image;
    }

    const optimizedJpegBuffer = await sharp(image.buffer)
      .rotate()
      .toColourspace('srgb')
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const baseName = image.fileName.replace(/\.[^/.]+$/, '');
    return {
      fileName: `${baseName}.jpg`,
      mimeType: 'image/jpeg',
      buffer: optimizedJpegBuffer
    };
  }

  async uploadMany(images: RawImageInput[]): Promise<string[]> {
    const uploadedPictureIds: string[] = [];

    for (const image of images) {
      const normalized = await this.normalizeImage(image);
      const uploaded = await this.mlClient.uploadPicture(normalized.buffer, normalized.fileName, normalized.mimeType);
      uploadedPictureIds.push(uploaded.id);
    }

    return uploadedPictureIds;
  }
}
