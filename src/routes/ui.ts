import { FastifyInstance } from 'fastify';

const publishFormHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Publicar Producto en MercadoLibre (Argentina)</title>
  <style>
    :root {
      --bg: #f3f5f7;
      --card: #ffffff;
      --text: #13171a;
      --muted: #4b5563;
      --line: #d8dee4;
      --brand: #0a7cff;
      --ok: #0f7b42;
      --err: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .wrap {
      max-width: 760px;
      margin: 24px auto;
      padding: 0 16px 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(16, 24, 40, 0.04);
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
    }
    .sub {
      margin: 0 0 20px;
      color: var(--muted);
      font-size: 14px;
    }
    form {
      display: grid;
      gap: 14px;
    }
    label {
      display: grid;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
    }
    input, textarea, select, button {
      font: inherit;
    }
    input, textarea {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      width: 100%;
      background: #fff;
    }
    textarea {
      min-height: 100px;
      resize: vertical;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: end;
    }
    .btn {
      border: 1px solid var(--brand);
      color: #fff;
      background: var(--brand);
      border-radius: 8px;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.secondary {
      color: var(--brand);
      background: #fff;
    }
    .hint {
      color: var(--muted);
      font-size: 12px;
      margin: 0;
    }
    #result {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--line);
      background: #fff;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    .ok { border-color: #a6f4c5; color: var(--ok); background: #f0fdf4; }
    .err { border-color: #fecdca; color: var(--err); background: #fffbfa; }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
      .row { flex-direction: column; align-items: stretch; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Publicar producto (Argentina)</h1>
      <p class="sub">Formulario simple para publicar en MercadoLibre Argentina. Moneda fija: <strong>ARS</strong>.</p>

      <form id="publishForm">
        <label>
          Título
          <input name="title" required minlength="3" />
        </label>

        <label>
          Descripción
          <textarea name="description" required minlength="5"></textarea>
        </label>

        <div class="grid">
          <label>
            Precio (ARS)
            <input name="price" type="number" min="1" step="1" required />
          </label>
          <label>
            Stock
            <input name="available_quantity" type="number" min="1" step="1" required />
          </label>
        </div>

        <div class="grid">
          <label>
            Moneda
            <input name="currency" value="ARS" readonly />
          </label>
          <label>
            Condición
            <select name="condition">
              <option value="new" selected>new</option>
            </select>
          </label>
        </div>

        <div class="row">
          <label style="flex: 1;">
            Buscar categoría
            <input id="categoryQuery" placeholder="ej: campera bomber" />
          </label>
          <button id="searchCategoryBtn" class="btn secondary" type="button">Sugerir categorías</button>
        </div>

        <label>
          category_id
          <input name="category_id" id="categoryIdInput" required />
        </label>

        <label>
          Atributos (JSON)
          <textarea name="attributes" required>[{"id":"BRAND","value_name":"Generica"},{"id":"MODEL","value_name":"Modelo X"}]</textarea>
        </label>
        <p class="hint">Formato: array JSON con objetos { "id", "value_name" } o { "id", "value_id" }.</p>

        <label>
          Imágenes (1 o más)
          <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required />
        </label>

        <button class="btn" type="submit">Publicar producto</button>
      </form>

      <pre id="result">Esperando acción...</pre>
    </div>
  </div>

  <script>
    const form = document.getElementById('publishForm');
    const result = document.getElementById('result');
    const searchBtn = document.getElementById('searchCategoryBtn');
    const categoryQuery = document.getElementById('categoryQuery');
    const categoryIdInput = document.getElementById('categoryIdInput');

    function setResultOk(text) {
      result.classList.remove('err');
      result.classList.add('ok');
      result.textContent = text;
    }

    function setResultErr(text) {
      result.classList.remove('ok');
      result.classList.add('err');
      result.textContent = text;
    }

    searchBtn.addEventListener('click', async () => {
      const q = (categoryQuery.value || '').trim();
      if (!q) {
        setResultErr('Escribe un texto para buscar categorías.');
        return;
      }

      try {
        searchBtn.disabled = true;
        const res = await fetch('/categories/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        if (!res.ok) {
          setResultErr(JSON.stringify(data, null, 2));
          return;
        }

        if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
          setResultErr('No se encontraron categorías para esa búsqueda.');
          return;
        }

        const lines = data.suggestions.map((s, idx) => (idx + 1) + '. ' + s.category_name + ' (' + s.category_id + ')');
        categoryIdInput.value = data.suggestions[0].category_id;
        setResultOk('Sugerencias:\\n' + lines.join('\\n') + '\\n\\nSe autocompletó category_id con la primera opción.');
      } catch (error) {
        setResultErr('Error buscando categorías: ' + String(error));
      } finally {
        searchBtn.disabled = false;
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData();
      const elements = new FormData(form);

      formData.set('title', elements.get('title') || '');
      formData.set('description', elements.get('description') || '');
      formData.set('price', elements.get('price') || '');
      formData.set('currency', 'ARS');
      formData.set('available_quantity', elements.get('available_quantity') || '');
      formData.set('category_id', elements.get('category_id') || '');
      formData.set('condition', elements.get('condition') || 'new');
      formData.set('attributes', elements.get('attributes') || '[]');

      const imageInput = form.querySelector('input[name="images"]');
      const files = imageInput && imageInput.files ? imageInput.files : [];
      if (!files.length) {
        setResultErr('Debes seleccionar al menos una imagen.');
        return;
      }
      for (const file of files) {
        formData.append('images', file);
      }

      try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        result.textContent = 'Publicando...';
        result.classList.remove('ok', 'err');

        const res = await fetch('/products/publish', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setResultErr(JSON.stringify(data, null, 2));
          return;
        }

        const summary = [
          'Publicación exitosa',
          'item_id: ' + data.item_id,
          'listing_url: ' + data.listing_url,
          'warnings: ' + JSON.stringify(data.warnings || [])
        ].join('\\n');

        setResultOk(summary);
      } catch (error) {
        setResultErr('Error publicando: ' + String(error));
      } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
      }
    });
  </script>
</body>
</html>`;

export function uiRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return publishFormHtml;
  });
}
