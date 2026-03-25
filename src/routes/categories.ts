import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CategoryService } from '../modules/categories/category-service';

export function categoriesRoutes(app: FastifyInstance, categoryService: CategoryService) {
  app.get('/categories/search', async (request) => {
    const querySchema = z.object({ q: z.string().min(2) });
    const { q } = querySchema.parse(request.query);

    const suggestions = await categoryService.suggest(q);
    return {
      status: 'success',
      site_id: 'MLA',
      suggestions
    };
  });

  app.get('/categories/:categoryId/required-attributes', async (request) => {
    const paramsSchema = z.object({ categoryId: z.string().min(1) });
    const { categoryId } = paramsSchema.parse(request.params);

    const requiredAttributeIds = await categoryService.getRequiredAttributes(categoryId);
    return {
      status: 'success',
      category_id: categoryId,
      required_attribute_ids: requiredAttributeIds
    };
  });
}
