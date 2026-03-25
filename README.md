# MercadoLibre Product Publisher API (Argentina / MLA)

Production-ready API to publish products in MercadoLibre Argentina (`MLA`) using:
- OAuth token management (access + refresh token)
- image upload pipeline
- category suggestion
- required attributes validation per category
- clear structured errors

Current scope:
- publishes **new listings only**
- marketplace fixed to **Argentina (`MLA`)**

## 1. Tech stack
- Node.js + TypeScript
- Fastify
- Zod
- Sharp

## 2. Requirements
- Node.js 20+
- A MercadoLibre developer app with:
  - `APP_ID` (used as `ML_CLIENT_ID`)
  - `CLIENT_SECRET` (used as `ML_CLIENT_SECRET`)
  - Redirect URI configured in MercadoLibre developers panel

## 3. Install and run
```bash
npm install
cp .env.example .env
npm run dev
```

Default base URL:
- `http://localhost:3000`

## 4. Environment variables
Edit `.env`:

```env
PORT=3000
NODE_ENV=development

ML_SITE_ID=MLA
ML_API_BASE_URL=https://api.mercadolibre.com
ML_OAUTH_TOKEN_URL=https://api.mercadolibre.com/oauth/token

ML_CLIENT_ID=your_app_id
ML_CLIENT_SECRET=your_client_secret
ML_REDIRECT_URI=https://your-domain.com/oauth/callback

ML_ACCESS_TOKEN=your_access_token
ML_REFRESH_TOKEN=your_refresh_token

ML_DEFAULT_CURRENCY=ARS
ML_DEFAULT_CONDITION=new
ML_DEFAULT_LISTING_TYPE_ID=gold_special
ML_DEFAULT_BUYING_MODE=buy_it_now
ML_MAX_IMAGES=10
```

Important:
- `ML_CLIENT_ID` = MercadoLibre **App ID**
- `ML_REDIRECT_URI` must match exactly the URI configured in your ML app

## 5. How to get `access_token` and `refresh_token`

If you do not have tokens yet, follow this OAuth flow.

### Step 1: Open authorization URL
Replace values and open in browser:

```text
https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=YOUR_APP_ID&redirect_uri=YOUR_REDIRECT_URI
```

After login/consent, MercadoLibre redirects to:
- `YOUR_REDIRECT_URI?code=AUTHORIZATION_CODE`

Copy the `code`.

### Step 2: Exchange `code` for tokens
```bash
curl -X POST https://api.mercadolibre.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=YOUR_APP_ID&client_secret=YOUR_CLIENT_SECRET&code=AUTHORIZATION_CODE&redirect_uri=YOUR_REDIRECT_URI"
```

You get:
- `access_token`
- `refresh_token`
- `expires_in`

Save both tokens in `.env`.

### Step 3: Refresh when expired
```bash
curl -X POST https://api.mercadolibre.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=YOUR_APP_ID&client_secret=YOUR_CLIENT_SECRET&refresh_token=YOUR_REFRESH_TOKEN"
```

Update `.env` with the new:
- `ML_ACCESS_TOKEN`
- `ML_REFRESH_TOKEN`

Notes:
- This API already auto-refreshes token on `401`.
- When that happens, publish response includes a warning so you update `.env` manually.

## 6. API endpoints

### 6.1 Health
`GET /health`

Response:
```json
{ "status": "ok" }
```

### 6.2 Category suggestion
`GET /categories/search?q=campera bomber`

Response:
```json
{
  "status": "success",
  "site_id": "MLA",
  "suggestions": [
    {
      "category_id": "MLA424837",
      "category_name": "Camperas",
      "domain_id": "MLA-SPORTSWEAR"
    }
  ]
}
```

### 6.3 Required attributes for category
`GET /categories/:categoryId/required-attributes`

Response:
```json
{
  "status": "success",
  "category_id": "MLA424837",
  "required_attribute_ids": ["BRAND", "MODEL", "GENDER", "COLOR", "SIZE"]
}
```

### 6.4 Conversational helper (single-shot validation)
`POST /products/collect`

Use it to know what data is still missing before publishing.

Example request:
```json
{
  "title": "Campera deportiva bomber unisex",
  "price": 199990,
  "category_id": "MLA424837",
  "attributes": [{ "id": "BRAND", "value_name": "Generica" }]
}
```

Example response:
```json
{
  "status": "incomplete",
  "missing_fields": [
    "description",
    "available_quantity",
    "attributes.MODEL",
    "attributes.GENDER",
    "attributes.COLOR",
    "attributes.SIZE"
  ],
  "validation_errors": []
}
```

### 6.5 Publish product
`POST /products/publish`

Content-Type:
- `multipart/form-data`

Expected fields:
- `title` (string)
- `description` (string)
- `price` (number)
- `currency` (string, for MLA use `ARS`)
- `available_quantity` (int > 0)
- `category_id` (string)
- `condition` (optional, default `new`)
- `listing_type_id` (optional)
- `buying_mode` (optional)
- `attributes` (JSON array string)
- `shipping` (optional JSON object string)
- `images` (repeated file field, min 1, max `ML_MAX_IMAGES`)

Example:
```bash
curl -X POST http://localhost:3000/products/publish \
  -F 'title=Campera deportiva bomber unisex' \
  -F 'description=Campera deportiva tipo bomber, calce regular, ideal uso urbano y entrenamiento. Producto genérico, sin licencia de marcas.' \
  -F 'price=199990' \
  -F 'currency=ARS' \
  -F 'available_quantity=1' \
  -F 'category_id=MLA424837' \
  -F 'attributes=[{"id":"BRAND","value_name":"Generica"},{"id":"MODEL","value_name":"Bomber unisex"},{"id":"GENDER","value_name":"Sin género"},{"id":"COLOR","value_name":"Negro"},{"id":"SIZE","value_name":"L"}]' \
  -F 'images=@/absolute/path/photo-1.jpg' \
  -F 'images=@/absolute/path/photo-2.jpg'
```

Success response:
```json
{
  "status": "success",
  "item_id": "MLA3096033132",
  "listing_url": "http://articulo.mercadolibre.com.ar/MLA-3096033132-...",
  "warnings": []
}
```

## 7. Image requirements and recommendations
- Use real JPEG/PNG/WebP files.
- Avoid HEIC/HEIF files renamed as `.jpg`.
- If your phone photos are HEIC, convert before upload.

If image is unsupported you will get:
- `UNSUPPORTED_IMAGE_FORMAT` or `UNSUPPORTED_IMAGE_CONTENT`

## 8. Error format
All errors follow:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

Common codes:
- `VALIDATION_ERROR`
- `INVALID_CONTENT_TYPE`
- `MISSING_IMAGES`
- `TOO_MANY_IMAGES`
- `UNSUPPORTED_IMAGE_FORMAT`
- `UNSUPPORTED_IMAGE_CONTENT`
- `INVALID_ATTRIBUTES_JSON`
- `INVALID_SHIPPING_JSON`
- `MISSING_REQUIRED_ATTRIBUTES`
- `INVALID_CURRENCY`
- `EXTERNAL_API_ERROR`
- `INTERNAL_SERVER_ERROR`

## 9. Troubleshooting

### 403 unauthorized from MercadoLibre
- Your `ML_ACCESS_TOKEN` is invalid or expired.
- Refresh token and update `.env`.
- Validate token quickly:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.mercadolibre.com/users/me
```

### Missing required attributes
- Query required attributes for selected category:
```bash
curl "http://localhost:3000/categories/MLA424837/required-attributes"
```
- Send all required `attributes`.

### Image uploads look wrong
- Ensure files are not HEIC disguised as JPG.
- Convert on macOS:
```bash
sips -s format jpeg /path/input.heic --out /path/output.jpg
```

## 10. NPM scripts
- `npm run dev` -> run in dev with watch
- `npm run typecheck` -> TS no emit checks
- `npm run build` -> build to `dist/`
- `npm run start` -> run compiled server

## 11. Project structure
- `src/modules/auth/token-manager.ts` -> access/refresh token logic
- `src/modules/mercadolibre/client.ts` -> ML API client with retry on 401
- `src/modules/images/image-uploader.ts` -> image validation/upload pipeline
- `src/modules/categories/category-service.ts` -> category helpers
- `src/modules/publishing/product-publisher.ts` -> publish orchestration
- `src/modules/validation/*` -> request and payload validation
- `src/routes/*` -> HTTP routes
- `src/app.ts` -> app wiring and error handler
- `src/server.ts` -> process entrypoint

## 12. Security notes
- Never commit `.env`.
- Rotate tokens if exposed.
- Use HTTPS in production.

