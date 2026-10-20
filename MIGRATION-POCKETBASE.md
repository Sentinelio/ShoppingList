# Encargo: migrar BabelCart de Supabase a PocketBase

Trabaja en una rama nueva `pocketbase-migration` creada desde `claude/polyglot-shopping-cart-doquB`. No toques `main` ni hagas push a la rama de despliegue hasta que yo lo diga.

## Contexto

- El proyecto de Supabase está pausado y se abandona. **Se empieza con la base de datos vacía**: no hay que migrar datos.
- El backend nuevo es **PocketBase** (última versión estable), ya instalado en mi servidor Windows como servicio (`C:\pocketbase`, servicio NSSM `PocketBase`, escucha en `127.0.0.1:8090`).
- Está publicado en internet con Tailscale Funnel en **`https://server-pc.tail3b4002.ts.net`** (panel en `/_/`).
- ⚠️ Ese mismo dominio sirve otra aplicación en las rutas **`/webhook`** y **`/health/public`**. No uses esas rutas para nada.
- La variable de entorno `ANTHROPIC_API_KEY` ya está configurada en el servicio de PocketBase.
- El frontend sigue en GitHub Pages (`https://sentinelio.github.io`), desplegado por `.github/workflows/deploy.yml`.
- En el servidor hay restos de una prueba anterior (`pb_migrations/1792516000_babelcart_schema.js` y `pb_hooks/babelcart.pb.js`). Se sustituyen por lo que generes tú; ver "Despliegue en el servidor".

## Qué hay que entregar

Todo el backend vive en el repo, en una carpeta nueva `pocketbase/`:

```
pocketbase/
├── pb_migrations/   # esquema completo como migraciones JS de PocketBase
├── pb_hooks/        # rutas propias, sustitutos de las Edge Functions y triggers
├── deploy-server.ps1
└── README.md        # cómo desplegar en el servidor
```

Y el frontend adaptado para usar el SDK oficial `pocketbase` en lugar de `@supabase/supabase-js`.

## 1. Esquema

Replica en PocketBase **todas** las tablas que existen hoy: las de `supabase/migrations/001`–`018` más `app_config` (no está en las migraciones; deduce su forma de `src/lib/appConfigStore.ts`). Mantén los **mismos nombres de colecciones y campos** (`list_id`, `added_by_name`, `checked_at`, `brand`, etc.) para que el frontend cambie lo mínimo.

- Las claves foráneas pasan a ser campos `relation` con el mismo nombre, con el `cascadeDelete` equivalente al `ON DELETE` original.
- `jsonb` → `json`; `numeric` → `number`; `timestamptz` → `date` o `autodate` según el caso.
- La tabla `users` de Supabase se fusiona con la colección de auth `users` de PocketBase: añade `lang`, `country`, `avatar_color` y `last_seen_at`.
- `dictionary.key` y `store_phrases.key` se mantienen; si creas índices sobre `key`, entrecomilla el identificador.
- Incluye los datos iniciales de `store_phrases` (migración 005).
- El bucket `receipt-photos` pasa a ser un campo `file` (`photo`) en `receipts`.
- Si tienes que crear campos nuevos que no existían en Supabase, explícalo en el README.

## 2. Autenticación (cambio importante)

La app usa ahora un usuario falso guardado en `localStorage` (lo dice `supabase/functions/_shared/auth.ts`) y por eso varias tablas quedaron con políticas abiertas a todos. Hay que sustituirlo por **auth real e invisible para el usuario**:

- Primer arranque: crear un registro en `users` con un email aleatorio (por ejemplo `<uuid>@babelcart.app`) y una contraseña aleatoria larga, guardar ambos en `localStorage` y hacer `authWithPassword`. En arranques posteriores, reutilizarlos. El usuario nunca ve nada de esto.
- Mantén el flujo actual de perfil (nombre, idioma, país, color) y el modo demo.
- Revisa `useAuth.ts` y todos los sitios que leen el id del usuario actual: debe salir de `pb.authStore.record.id`.

## 3. Permisos

Nada de reglas abiertas a todos salvo lo que es público por diseño (`dictionary`, `store_phrases` y `app_config` en lectura). Todo lo de una lista solo es visible y editable por sus miembros activos.

Ojo con un detalle de PocketBase: varias condiciones `?=` sobre una relación inversa (`@collection.list_members...`) **pueden cumplirse con filas distintas**, así que no sirven para comprobar "este usuario es miembro activo de esta lista". Usa campos desnormalizados mantenidos por hooks:

- En `lists`, añade `active_members` y `owners` (relaciones múltiples a `users`), sincronizados por hooks cada vez que se crea, cambia o borra una fila de `list_members`.
- Las reglas quedan simples, por ejemplo:
  - `items`: `list_id.active_members ?= @request.auth.id`
  - `item_prices` / `item_comments` / `item_history`: `item_id.list_id.active_members ?= @request.auth.id`
  - `receipts`: `list_id.active_members ?= @request.auth.id`; `receipt_items` a través de `receipt_id`.
- `list_members`: reproduce la lógica de las migraciones 007–009 (`require_approval`, `who_can_approve`, `who_can_remove`) usando `owners` y `active_members`.
- Unirse por código: un no-miembro no puede ver la lista, así que crea la ruta `POST /api/babelcart/join` (`{ code }`), que encuentra la lista, crea la fila en `list_members` como `pending` o `active` según `require_approval`, y devuelve la lista y el estado.
- `users`: cada uno solo se lista a sí mismo; cualquier usuario autenticado puede ver un perfil concreto (para los avatares de los miembros).
- `product_prices`: lectura para autenticados; se crea solo desde el hook que replica el trigger de la migración 018; borrar solo lo propio.
- Escritura de `dictionary`, `store_phrases` y `app_config`: solo superusuario o un campo `is_admin` en `users`. Revisa cómo se protege hoy `AdminPage` y propón lo más simple.

## 4. Edge Functions y triggers → `pb_hooks`

Rutas bajo `/api/babelcart/...`, todas con `$apis.requireAuth()` salvo que se diga lo contrario. **Copia los prompts de las Edge Functions literalmente**; están afinados.

| Supabase | PocketBase |
|---|---|
| `translate` | `POST /api/babelcart/translate`, mismo contrato (`{ text, langs }` → `{ t, c, b }`). Si hoy el frontend guarda el resultado en `dictionary`, mueve ese guardado al hook. |
| `translate-ui` | `POST /api/babelcart/translate-ui`, mismo contrato. |
| `parse-receipt` | `POST /api/babelcart/parse-receipt`, mismo contrato; acepta `imageBase64` (lo prioritario) e `imageUrl`. Copia también `validateReceipt`. |
| `seed-dictionary` | `POST /api/babelcart/seed-dictionary`, solo superusuario/admin. |
| `run-migration` | Se elimina: lo sustituyen las migraciones de PocketBase. |
| RPC `increment_store_phrase_usage` | `POST /api/babelcart/phrase-used` (`{ key }`). |
| Triggers de la migración 018 | Hooks after-create / after-delete de `item_prices`, con la misma lógica de `compute_product_key`. |

Notas sobre los hooks de PocketBase (JSVM):

- Cada handler se ejecuta aislado: **no puede usar variables ni funciones declaradas fuera de él**. Pon el código común en un módulo y cárgalo dentro del handler con `require(\`${__hooks}/lib/xxx.js\`)`.
- Llamadas a Claude con `$http.send` (sin `fetch`). Lee la key con `$os.getenv("ANTHROPIC_API_KEY")`.
- Modelos por variable de entorno, con valores por defecto: `BABELCART_MODEL_TRANSLATE` = `claude-haiku-5-5`, `BABELCART_MODEL_UI` = `claude-haiku-5-5`, `BABELCART_MODEL_RECEIPT` = `claude-sonnet-5-5`.
- Errores con `BadRequestError`, `NotFoundError`, etc., y mensajes útiles en el log del servidor.

## 5. Frontend

- Sustituye `src/lib/supabase.ts` por `src/lib/pocketbase.ts`, con la URL en `VITE_PB_URL` (`https://server-pc.tail3b4002.ts.net`).
- Adapta los 27 archivos que importan Supabase. Las consultas `.from(...).select/insert/update/delete/upsert` pasan a `pb.collection(...)`. Los `upsert` necesitan buscar primero o una ruta propia.
- Realtime: los 5 `channel(...)` pasan a `pb.collection(x).subscribe("*", cb, { filter })`, y hay que desuscribirse al desmontar.
- Fotos de tickets: subir al campo `photo` de `receipts` y obtener la URL con `pb.files.getURL`.
- Quita `@supabase/supabase-js`, borra `.env.production` con las claves de Supabase y crea el nuevo con `VITE_PB_URL`. Actualiza `.env.example` y `deploy.yml` si hace falta.
- Mueve `supabase/` a `legacy/supabase/` (no la borres todavía).
- Añade una entrada al changelog.

## 6. Despliegue en el servidor

`pocketbase/deploy-server.ps1` debe, ejecutado como administrador desde un clon del repo en el servidor:

1. Parar el servicio (`nssm stop PocketBase`).
2. Copiar `pocketbase/pb_migrations` y `pocketbase/pb_hooks` a `C:\pocketbase\`, borrando antes lo que hubiera en esas dos carpetas.
3. Con un parámetro `-Reset`, borrar además `C:\pocketbase\pb_data` (primera instalación) y recordar recrear el superusuario con `pocketbase superuser upsert`.
4. Arrancar el servicio y comprobar que `http://127.0.0.1:8090/api/health` responde.

`pocketbase/README.md`: instalación desde cero, despliegue, variables de entorno y cómo añadir una migración nueva.

## 7. Comprobaciones antes de darlo por terminado

- `npm run build` y `npm run lint` sin errores.
- Prueba manual contra un PocketBase local (`./pocketbase serve` con estas migraciones y hooks): crear usuario, crear lista, unirse con código desde otro navegador (con y sin aprobación), añadir item con traducción, marcarlo, añadir precio (comprobar que aparece en `product_prices`), comentario, importar un ticket y ver los cambios en tiempo real en el otro navegador.
- Comprobar que un usuario que no es miembro **no** puede leer los items de una lista aunque conozca su id.
- Resumen final: qué ha cambiado, decisiones tomadas y cualquier cosa que haya quedado pendiente.
