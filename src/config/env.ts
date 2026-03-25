import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  ML_SITE_ID: z.string().default('MLA'),
  ML_API_BASE_URL: z.string().url().default('https://api.mercadolibre.com'),
  ML_OAUTH_TOKEN_URL: z.string().url().default('https://api.mercadolibre.com/oauth/token'),
  ML_CLIENT_ID: z.string().min(1),
  ML_CLIENT_SECRET: z.string().min(1),
  ML_REDIRECT_URI: z.string().min(1),
  ML_ACCESS_TOKEN: z.string().min(1),
  ML_REFRESH_TOKEN: z.string().min(1),
  ML_DEFAULT_CURRENCY: z.string().default('ARS'),
  ML_DEFAULT_CONDITION: z.string().default('new'),
  ML_DEFAULT_LISTING_TYPE_ID: z.string().default('gold_special'),
  ML_DEFAULT_BUYING_MODE: z.string().default('buy_it_now'),
  ML_MAX_IMAGES: z.coerce.number().int().positive().default(10)
});

export const env = envSchema.parse(process.env);
