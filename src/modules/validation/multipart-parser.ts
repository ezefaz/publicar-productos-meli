import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { AppError } from '../../lib/errors';
import { env } from '../../config/env';
import { RawImageInput } from '../images/image-uploader';

type ParseResult = {
  fields: Record<string, string>;
  images: RawImageInput[];
};

export async function parseMultipartPublishRequest(request: FastifyRequest): Promise<ParseResult> {
  if (!request.isMultipart()) {
    throw new AppError(400, 'INVALID_CONTENT_TYPE', 'Content-Type must be multipart/form-data');
  }

  const fields: Record<string, string> = {};
  const images: RawImageInput[] = [];

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'file') {
      await collectImagePart(part, images);
      continue;
    }
    fields[part.fieldname] = String(part.value);
  }

  if (images.length === 0) {
    throw new AppError(400, 'MISSING_IMAGES', 'At least one image file is required');
  }

  if (images.length > env.ML_MAX_IMAGES) {
    throw new AppError(400, 'TOO_MANY_IMAGES', `Maximum ${env.ML_MAX_IMAGES} images allowed`);
  }

  return { fields, images };
}

async function collectImagePart(part: MultipartFile, images: RawImageInput[]): Promise<void> {
  if (part.fieldname !== 'images') {
    return;
  }

  const buffer = await part.toBuffer();
  if (!buffer.length) {
    throw new AppError(400, 'EMPTY_IMAGE', `Image ${part.filename} is empty`);
  }

  images.push({
    fileName: part.filename,
    mimeType: part.mimetype,
    buffer
  });
}
