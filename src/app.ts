import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';
import { AppError, isAppError } from './lib/errors';
import { TokenManager } from './modules/auth/token-manager';
import { CategoryService } from './modules/categories/category-service';
import { ImageUploader } from './modules/images/image-uploader';
import { MercadoLibreClient } from './modules/mercadolibre/client';
import { ProductPublisher } from './modules/publishing/product-publisher';
import { categoriesRoutes } from './routes/categories';
import { productsRoutes } from './routes/products';

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(multipart, {
    limits: {
      files: 20,
      fileSize: 10 * 1024 * 1024
    }
  });

  const tokenManager = new TokenManager();
  const mlClient = new MercadoLibreClient(tokenManager);
  const categoryService = new CategoryService(mlClient);
  const imageUploader = new ImageUploader(mlClient);
  const productPublisher = new ProductPublisher(mlClient, categoryService, imageUploader, tokenManager);

  app.get('/health', async () => ({ status: 'ok' }));

  categoriesRoutes(app, categoryService);
  productsRoutes(app, productPublisher);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    if (isAppError(error)) {
      return reply.code(error.statusCode).send({
        status: 'error',
        code: error.code,
        message: error.message,
        details: error.details ?? null
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      status: 'error',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error'
    });
  });

  return app;
}
