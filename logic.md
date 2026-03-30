# Backend Database and Product Logic

This document outlines the core logic behind the e-commerce database, image processing, and product management. You can adapt these patterns to any new Node.js/Express backend application.

## 1. Database Logic (SQLite)
The application uses **SQLite** through the `better-sqlite3` package. This provides a fast, synchronous connection suitable for moderate scale e-commerce.

### Schema Management
- **Tables:** Defined in `server/db.js`, the database natively creates tables (`products`, `orders`, `order_items`, `settings`, etc.) using standard `CREATE TABLE IF NOT EXISTS`.
- **Primary Keys:** Uses `INTEGER PRIMARY KEY AUTOINCREMENT` for easy, auto-scaling IDs.
- **Lightweight Migrations:** Instead of complex ORMs, schema updates are handled via safe `ALTER TABLE` queries wrapped in `try/catch` blocks. If a column already exists, the error is safely ignored:
  ```javascript
  try {
    db.exec(`ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'`);
  } catch (e) { /* Column already exists */ }
  ```
- **Array Storage:** SQLite doesn't have native array types natively, so arrays (like `sizes`, `colors`, `tags`, `images`) are converted to and stored as **JSON strings** (e.g., `'["S","M","L"]'`).

---

## 2. Image Processing (Saved & Deleted)
Image optimization is done in-memory before saving raw files to the disk. This ensures fast load times on the frontend and minimal storage usage on the server.

### Saving Images
- **Multer (Memory Storage):** The `/api/products` endpoints use `multer` configured to `memoryStorage()`. Images are kept in RAM (`req.files[].buffer`) rather than being saved immediately as raw, unoptimized files on disk.
- **Sharp (Optimization):** A custom middleware (`processImages` in `server/index.js`) loops through all uploaded files and uses the `sharp` library to natively process the buffers:
  1. Generates a highly unique filename (`Date.now() + Math.random() + '.webp'`).
  2. Converts the image to **WebP format** (`.webp`) for intense compression and quality retention.
  3. Resizes main images to exactly 1200px width (`quality: 80`, `withoutEnlargement: true`).
  4. Generates an additional 400px width **thumbnail** for the *first* (primary) image. The frontend uses these thumbnails to speed up rendering store grids.
  5. Uses `sharp.toFile(outputPath)` to output and save them physically into the `server/uploads/` folder.

### Deleting Images
- When replacing images via a `PUT` update request or completely deleting a product via `DELETE`, the backend requires the ID.
- It queries the database for the old product's `imageUrl`, `thumbnailUrl`, and the stringified `images` JSON array.
- It calculates which image paths were abandoned/orphaned by subtracting the incoming image paths from the currently stored images.
- Any image and thumbnail paths that are no longer referenced are physically deleted from the filesystem using Node's native delete command: `fs.unlinkSync(filePath)`.

---

## 3. Adding Products (POST)
**Endpoint:** `app.post('/api/products')`

- **Authentication:** Protected by an `authenticateToken` middleware that verifies an active Admin JWT session before proceeding.
- **Data Parsing:** Reads string inputs from the frontend form data (name, description, price, stock) and gathers the newly generated WebP image paths mapped from `req.files`.
- **JSON Serialization:** Re-converts sizes, colors, and tags mapped from the form back into JSON strings via `JSON.stringify()`.
- **Dynamic Categories:** Auto-Add Feature! If a user submits a product under a category string that hasn't been used yet, the backend automatically senses this and inserts the new category object into the `settings` database table. This ensures the new category appears seamlessly in the frontend Store's main filters immediately without needing manual adding.
- **Insertion:** Finally, a safe parameterized SQL prepared statement `db.prepare('INSERT INTO products ...').run(...)` inserts all data into the SQLite `products` table preventing SQL injection attacks.

---

## 4. Fetching Products (GET)
Fetching products efficiently is arguably the most common action for users. This implementation involves dynamic SQL query stacking.

**Endpoint:** `app.get('/api/store/products')`

- **Dynamic WHERE Clauses:** The backend SQL starts generically as `SELECT * FROM products WHERE 1=1`. Conditions are appended dynamically depending on what the user wants to filter:
  - **Price:** Adds bounds: `AND price >= ? AND price <= ?` using query params `minPrice` and `maxPrice`.
  - **Search Bar:** Appends wildcard matching: `AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)`
  - **Categories:** Uses a dynamic `IN (?,?,?)` clause based on the selected categories array.
- **Pagination Strategy:** It performs a swift `COUNT(*)` query executing the filtered clauses first (so the frontend knows how many infinite-scroll pages exist). Then it appends standard `LIMIT ? OFFSET ?` rules to the main querying returning bite-sized chunks of items (e.g., 24 rows at once per API call).
- **Post-Filtering JSON Fallback:** Because this system relies on JSON arrays inside generic SQLite TEXT columns (like `sizes`), standard SQLite builds on simple hosting providers might not have advanced JSON sorting functions compiled natively. The backend works around this effortlessly by fetching the filtered products block, unpacking the strings via `JSON.parse(product.sizes)` synchronously in JavaScript, and applying a fast Array `.filter()` matching requested criteria right before responding to the frontend with an array of exactly what matches!
