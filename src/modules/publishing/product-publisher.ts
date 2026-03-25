import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { TokenManager } from '../auth/token-manager';
import { CategoryService } from '../categories/category-service';
import { ImageUploader, RawImageInput } from '../images/image-uploader';
import { MercadoLibreClient } from '../mercadolibre/client';
import { PublishProductInput } from '../validation/product-schemas';

type PublishResult = {
  status: 'success';
  item_id: string;
  listing_url: string;
  warnings: string[];
};

export class ProductPublisher {
  constructor(
    private readonly mlClient: MercadoLibreClient,
    private readonly categoryService: CategoryService,
    private readonly imageUploader: ImageUploader,
    private readonly tokenManager: TokenManager
  ) {}

  async validateCategoryAttributes(input: Pick<PublishProductInput, 'category_id' | 'attributes'>): Promise<void> {
    const requiredAttributeIds = await this.categoryService.getRequiredAttributes(input.category_id);

    const sentAttributeIds = new Set(input.attributes.map((attr) => attr.id));
    const missing = requiredAttributeIds.filter((requiredId) => !sentAttributeIds.has(requiredId));

    if (missing.length > 0) {
      throw new AppError(
        422,
        'MISSING_REQUIRED_ATTRIBUTES',
        'Missing required attributes for category',
        {
          category_id: input.category_id,
          missing_attribute_ids: missing
        }
      );
    }
  }

  async publish(input: PublishProductInput, images: RawImageInput[]): Promise<PublishResult> {
    if (input.currency !== 'ARS') {
      throw new AppError(422, 'INVALID_CURRENCY', 'For MLA site, currency must be ARS');
    }

    await this.validateCategoryAttributes({
      category_id: input.category_id,
      attributes: input.attributes
    });

    const categoryAttributes = await this.mlClient.getCategoryAttributes(input.category_id);
    const variationAttributeIds = new Set(
      categoryAttributes.filter((attr) => Boolean(attr.tags && (attr.tags as { allow_variations?: boolean }).allow_variations)).map((attr) => attr.id)
    );

    const pictureIds = await this.imageUploader.uploadMany(images);
    const variationCombinations = input.attributes.filter((attr) => variationAttributeIds.has(attr.id));
    const itemLevelAttributes = input.attributes.filter((attr) => !variationAttributeIds.has(attr.id));

    const payload = {
      title: input.title,
      category_id: input.category_id,
      price: input.price,
      currency_id: input.currency,
      available_quantity: input.available_quantity,
      buying_mode: input.buying_mode,
      listing_type_id: input.listing_type_id,
      condition: input.condition || env.ML_DEFAULT_CONDITION,
      pictures: pictureIds.map((id) => ({ id })),
      attributes: itemLevelAttributes,
      ...(variationCombinations.length > 0
        ? {
            variations: [
              {
                available_quantity: input.available_quantity,
                price: input.price,
                picture_ids: pictureIds,
                attribute_combinations: variationCombinations
              }
            ]
          }
        : {}),
      ...(input.shipping ? { shipping: input.shipping } : {})
    };

    const item = await this.mlClient.createItem(payload);
    const warnings: string[] = [];
    try {
      await this.mlClient.createDescription(item.id, input.description);
    } catch {
      warnings.push('Item was created, but description could not be set. You can edit description manually in MercadoLibre.');
    }

    if (this.tokenManager.wasRefreshedInRuntime()) {
      warnings.push(
        'Access token was refreshed during runtime. Update ML_ACCESS_TOKEN and ML_REFRESH_TOKEN in your .env file.'
      );
    }

    return {
      status: 'success',
      item_id: item.id,
      listing_url: item.permalink,
      warnings
    };
  }
}
