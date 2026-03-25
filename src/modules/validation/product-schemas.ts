import { z } from 'zod';
import { env } from '../../config/env';

export const productAttributeSchema = z.object({
  id: z.string().min(1),
  value_id: z.string().optional(),
  value_name: z.string().optional()
});

export const shippingSchema = z
  .object({
    mode: z.string().optional(),
    free_shipping: z.boolean().optional(),
    logistic_type: z.string().optional()
  })
  .optional();

export const publishProductSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  price: z.coerce.number().positive(),
  currency: z.string().default(env.ML_DEFAULT_CURRENCY),
  available_quantity: z.coerce.number().int().positive(),
  category_id: z.string().min(1),
  condition: z.string().default(env.ML_DEFAULT_CONDITION),
  listing_type_id: z.string().default(env.ML_DEFAULT_LISTING_TYPE_ID),
  buying_mode: z.string().default(env.ML_DEFAULT_BUYING_MODE),
  attributes: z.array(productAttributeSchema).default([]),
  shipping: shippingSchema
});

export const collectProductDataSchema = publishProductSchema.partial();

export type PublishProductInput = z.infer<typeof publishProductSchema>;
export type CollectProductDataInput = z.infer<typeof collectProductDataSchema>;
