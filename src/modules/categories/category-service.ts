import { MercadoLibreClient } from '../mercadolibre/client';

export class CategoryService {
  constructor(private readonly mlClient: MercadoLibreClient) {}

  async suggest(query: string) {
    return this.mlClient.suggestCategories(query);
  }

  async getRequiredAttributes(categoryId: string): Promise<string[]> {
    const attributes = await this.mlClient.getCategoryAttributes(categoryId);
    return attributes
      .filter((attr) => Boolean(attr.tags?.required || attr.tags?.catalog_required))
      .map((attr) => attr.id);
  }
}
