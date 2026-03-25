export type MLErrorDetail = {
  message?: string;
  error?: string;
  status?: number;
  cause?: unknown[];
};

export type MLOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
};

export type MLCategorySuggestion = {
  category_id: string;
  category_name: string;
  domain_id?: string;
  domain_name?: string;
  attributes?: Array<{ id: string; value_id?: string; value_name?: string }>;
};

export type MLCategoryAttribute = {
  id: string;
  name: string;
  tags?: {
    required?: boolean;
    catalog_required?: boolean;
    allow_variations?: boolean;
  };
};

export type MLPictureUploadResponse = {
  id: string;
  secure_url?: string;
  max_size?: string;
};

export type MLCreateItemResponse = {
  id: string;
  permalink: string;
  status: string;
};
