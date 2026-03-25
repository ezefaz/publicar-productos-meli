import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { ProductPublisher } from '../modules/publishing/product-publisher';
import { parseMultipartPublishRequest } from '../modules/validation/multipart-parser';
import { collectProductDataSchema, publishProductSchema } from '../modules/validation/product-schemas';

function parseAttributesRaw(raw?: string) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, 'INVALID_ATTRIBUTES_JSON', 'attributes must be valid JSON array');
  }
}

function parseShippingRaw(raw?: string) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, 'INVALID_SHIPPING_JSON', 'shipping must be valid JSON object');
  }
}

export function productsRoutes(app: FastifyInstance, productPublisher: ProductPublisher) {
  app.post('/products/publish', async (request, reply) => {
    const { fields, images } = await parseMultipartPublishRequest(request);

    const input = publishProductSchema.parse({
      ...fields,
      attributes: parseAttributesRaw(fields.attributes),
      shipping: parseShippingRaw(fields.shipping)
    });

    const result = await productPublisher.publish(input, images);
    reply.code(201);
    return result;
  });

  app.post('/products/collect', async (request) => {
    const bodySchema = z.record(z.string(), z.unknown());
    const body = bodySchema.parse(request.body);

    const parsed = collectProductDataSchema.safeParse(body);
    const requiredBaseFields = ['title', 'description', 'price', 'available_quantity', 'category_id'];

    const missingBaseFields = requiredBaseFields.filter((field) => body[field] === undefined || body[field] === null);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return {
        status: 'incomplete',
        missing_fields: missingBaseFields,
        validation_errors: fieldErrors
      };
    }

    const attributes = Array.isArray(body.attributes) ? body.attributes : [];
    let missingRequiredAttributeIds: string[] = [];
    if (typeof body.category_id === 'string' && body.category_id.length > 0) {
      try {
        await productPublisher.validateCategoryAttributes({
          category_id: body.category_id,
          attributes: attributes as Array<{ id: string; value_id?: string; value_name?: string }>
        });
      } catch (error: unknown) {
        if (error instanceof AppError && error.code === 'MISSING_REQUIRED_ATTRIBUTES') {
          const details = error.details as { missing_attribute_ids?: string[] } | undefined;
          missingRequiredAttributeIds = details?.missing_attribute_ids ?? [];
        } else {
          throw error;
        }
      }
    }

    const allMissing = [...missingBaseFields, ...missingRequiredAttributeIds.map((x) => `attributes.${x}`)];
    return {
      status: allMissing.length === 0 ? 'ready' : 'incomplete',
      missing_fields: allMissing,
      validation_errors: []
    };
  });
}
