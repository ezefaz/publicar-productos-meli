# API para publicar productos en MercadoLibre (Argentina / MLA)

API lista para producción para publicar productos en MercadoLibre Argentina (`MLA`) usando:
- autenticación OAuth con `access_token` y `refresh_token`
- carga de imágenes
- sugerencia de categorías
- validación de atributos obligatorios por categoría
- manejo claro de errores

Alcance actual:
- publica solo **nuevas publicaciones**
- está orientada exclusivamente a **MercadoLibre Argentina (`MLA`)**

## 1. Stack técnico
- Node.js + TypeScript
- Fastify
- Zod
- Sharp

## 2. Requisitos
- Node.js 20 o superior
- Una aplicación creada en MercadoLibre Developers con:
  - `APP_ID` (se usa como `ML_CLIENT_ID`)
  - `CLIENT_SECRET` (se usa como `ML_CLIENT_SECRET`)
  - una `Redirect URI` configurada

## 3. Instalación y ejecución
```bash
npm install
cp .env.example .env
npm run dev
```

URL base por defecto:
- `http://localhost:3000`
- Formulario visual simple: `http://localhost:3000/`

## 4. Variables de entorno
Edita el archivo `.env`:

```env
PORT=3000
NODE_ENV=development

ML_SITE_ID=MLA
ML_API_BASE_URL=https://api.mercadolibre.com
ML_OAUTH_TOKEN_URL=https://api.mercadolibre.com/oauth/token

ML_CLIENT_ID=tu_app_id
ML_CLIENT_SECRET=tu_client_secret
ML_REDIRECT_URI=https://tu-dominio.com/oauth/callback

ML_ACCESS_TOKEN=tu_access_token
ML_REFRESH_TOKEN=tu_refresh_token

ML_DEFAULT_CURRENCY=ARS
ML_DEFAULT_CONDITION=new
ML_DEFAULT_LISTING_TYPE_ID=gold_special
ML_DEFAULT_BUYING_MODE=buy_it_now
ML_MAX_IMAGES=10
```

Importante:
- `ML_CLIENT_ID` es el **App ID** de tu aplicación de MercadoLibre
- `ML_REDIRECT_URI` debe coincidir exactamente con la URI configurada en tu app de MercadoLibre

## 5. Cómo obtener `access_token` y `refresh_token`

Si todavía no tienes los tokens, sigue este flujo OAuth.

### Paso 1. Abrir la URL de autorización
Reemplaza los valores y abre esta URL en el navegador:

```text
https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=TU_APP_ID&redirect_uri=TU_REDIRECT_URI
```

Después de iniciar sesión y autorizar la aplicación, MercadoLibre redirige a:

- `TU_REDIRECT_URI?code=AUTHORIZATION_CODE`

Copia el valor de `code`.

### Paso 2. Intercambiar el `code` por tokens
```bash
curl -X POST https://api.mercadolibre.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=TU_APP_ID&client_secret=TU_CLIENT_SECRET&code=AUTHORIZATION_CODE&redirect_uri=TU_REDIRECT_URI"
```

La respuesta incluye:
- `access_token`
- `refresh_token`
- `expires_in`

Guarda ambos tokens en tu `.env`.

### Paso 3. Renovar tokens cuando vencen
```bash
curl -X POST https://api.mercadolibre.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&client_id=TU_APP_ID&client_secret=TU_CLIENT_SECRET&refresh_token=TU_REFRESH_TOKEN"
```

Actualiza tu `.env` con los nuevos valores:
- `ML_ACCESS_TOKEN`
- `ML_REFRESH_TOKEN`

Notas:
- Esta API intenta refrescar el token automáticamente cuando recibe un `401`
- Si eso ocurre, la respuesta de publicación devuelve un `warning` para que actualices manualmente tu `.env`

## 6. Endpoints de la API

### 6.1 Verificación de salud
`GET /health`

Respuesta:
```json
{ "status": "ok" }
```

### 6.2 Buscar categorías
`GET /categories/search?q=campera bomber`

Respuesta:
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

### 6.3 Ver atributos obligatorios de una categoría
`GET /categories/:categoryId/required-attributes`

Respuesta:
```json
{
  "status": "success",
  "category_id": "MLA424837",
  "required_attribute_ids": ["BRAND", "MODEL", "GENDER", "COLOR", "SIZE"]
}
```

### 6.4 Asistente conversacional de validación
`POST /products/collect`

Sirve para saber qué información falta antes de publicar.

Ejemplo de request:
```json
{
  "title": "Campera deportiva bomber unisex",
  "price": 199990,
  "category_id": "MLA424837",
  "attributes": [{ "id": "BRAND", "value_name": "Generica" }]
}
```

Ejemplo de respuesta:
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

### 6.5 Publicar producto
`POST /products/publish`

Content-Type:
- `multipart/form-data`

Campos esperados:
- `title` (string)
- `description` (string)
- `price` (number)
- `currency` (string, para `MLA` usar `ARS`)
- `available_quantity` (entero mayor a 0)
- `category_id` (string)
- `condition` (opcional, por defecto `new`)
- `listing_type_id` (opcional)
- `buying_mode` (opcional)
- `attributes` (string JSON con array de atributos)
- `shipping` (opcional, string JSON con objeto)
- `images` (campo de archivo repetido, mínimo 1, máximo `ML_MAX_IMAGES`)

Ejemplo:
```bash
curl -X POST http://localhost:3000/products/publish \
  -F 'title=Campera deportiva bomber unisex' \
  -F 'description=Campera deportiva tipo bomber, calce regular, ideal para uso urbano y entrenamiento. Producto genérico, sin licencia de marcas.' \
  -F 'price=199990' \
  -F 'currency=ARS' \
  -F 'available_quantity=1' \
  -F 'category_id=MLA424837' \
  -F 'attributes=[{"id":"BRAND","value_name":"Generica"},{"id":"MODEL","value_name":"Bomber unisex"},{"id":"GENDER","value_name":"Sin género"},{"id":"COLOR","value_name":"Negro"},{"id":"SIZE","value_name":"L"}]' \
  -F 'images=@/ruta/absoluta/photo-1.jpg' \
  -F 'images=@/ruta/absoluta/photo-2.jpg'
```

Respuesta exitosa:
```json
{
  "status": "success",
  "item_id": "MLA3096033132",
  "listing_url": "http://articulo.mercadolibre.com.ar/MLA-3096033132-...",
  "warnings": []
}
```

## 7. Requisitos y recomendaciones para imágenes
- Usa archivos reales en formato `JPEG`, `PNG` o `WebP`
- Evita archivos `HEIC/HEIF` renombrados como `.jpg`
- Si las fotos de tu teléfono están en `HEIC`, conviértelas antes de subirlas

Si la imagen no es válida, la API devuelve alguno de estos errores:
- `UNSUPPORTED_IMAGE_FORMAT`
- `UNSUPPORTED_IMAGE_CONTENT`

## 8. Formato de errores
Todas las respuestas de error siguen este formato:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Mensaje descriptivo",
  "details": {}
}
```

Códigos comunes:
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

## 9. Resolución de problemas

### Error `403 unauthorized` desde MercadoLibre
- Tu `ML_ACCESS_TOKEN` es inválido o venció
- Refresca el token y actualiza el `.env`
- Puedes validarlo así:

```bash
curl -H "Authorization: Bearer TU_ACCESS_TOKEN" https://api.mercadolibre.com/users/me
```

### Faltan atributos obligatorios
- Consulta los atributos requeridos de la categoría:

```bash
curl "http://localhost:3000/categories/MLA424837/required-attributes"
```

- Envía todos los atributos requeridos en `attributes`

### Las imágenes se suben mal o aparecen negras
- Verifica que no sean archivos `HEIC` disfrazados de `.jpg`
- Convierte la imagen antes de subirla

En macOS:
```bash
sips -s format jpeg /ruta/imagen.heic --out /ruta/imagen.jpg
```

## 10. Scripts disponibles
- `npm run dev` -> ejecuta el servidor en desarrollo con watch
- `npm run typecheck` -> valida TypeScript sin compilar
- `npm run build` -> compila a `dist/`
- `npm run start` -> ejecuta la versión compilada

## 11. Estructura del proyecto
- `src/modules/auth/token-manager.ts` -> manejo de `access_token` y `refresh_token`
- `src/modules/mercadolibre/client.ts` -> cliente de MercadoLibre con reintento en `401`
- `src/modules/images/image-uploader.ts` -> validación y carga de imágenes
- `src/modules/categories/category-service.ts` -> helpers de categorías
- `src/modules/publishing/product-publisher.ts` -> lógica de publicación
- `src/modules/validation/*` -> validación de requests y payloads
- `src/routes/*` -> endpoints HTTP
- `src/app.ts` -> configuración de Fastify y manejo global de errores
- `src/server.ts` -> entrada principal del servidor

## 12. Seguridad
- No subas `.env` al repositorio
- Rota tus tokens si fueron expuestos
- Usa HTTPS en producción
