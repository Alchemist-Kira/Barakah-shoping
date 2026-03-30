import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { getDb } from './db.js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Database is initialized in db.js via getDb()
const db = await getDb();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const verified = jwt.verify(token, secret);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const { username, passwordHash, rememberMe } = req.body;
  if (username === process.env.VITE_ADMIN_USERNAME && passwordHash === process.env.VITE_ADMIN_PASSWORD_HASH) {
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ username }, process.env.JWT_SECRET || 'fallback-secret-for-dev', { expiresIn: tokenExpiry });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Change Credentials (Secure: requires auth + current password verification)
app.post('/api/auth/change-password', authenticateToken, (req, res) => {
  const { currentPasswordHash, newPasswordHash, newUsername } = req.body;

  // Verify current password
  if (currentPasswordHash !== process.env.VITE_ADMIN_PASSWORD_HASH) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update password if provided
    if (newPasswordHash && newPasswordHash.length >= 10) {
      envContent = envContent.replace(
        /VITE_ADMIN_PASSWORD_HASH=.*/,
        `VITE_ADMIN_PASSWORD_HASH=${newPasswordHash}`
      );
      process.env.VITE_ADMIN_PASSWORD_HASH = newPasswordHash;
    }

    // Update username if provided
    if (newUsername && newUsername.trim().length >= 3) {
      envContent = envContent.replace(
        /VITE_ADMIN_USERNAME=.*/,
        `VITE_ADMIN_USERNAME=${newUsername.trim()}`
      );
      process.env.VITE_ADMIN_USERNAME = newUsername.trim();
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    res.json({ success: true, message: 'Credentials updated successfully' });
  } catch (err) {
    console.error('Credential change error:', err);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

// Settings Management
app.get('/api/settings', async (req, res) => {
  try {
    const db = await getDb();
    const [settings] = await db.query('SELECT * FROM settings');
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Update Setting
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Setting key is required' });
    const db = await getDb();
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    // MySQL equivalent for INSERT OR REPLACE
    await db.query(`
      INSERT INTO settings ("key", value) VALUES (?, ?) 
      ON CONFLICT("key") DO UPDATE SET value = EXCLUDED.value
    `, [key, strValue]);
    res.json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Orders Management
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const [orders] = await db.query('SELECT * FROM orders ORDER BY date DESC');
    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : (o.items || []);
      } catch (err) {
        console.error("JSON parse error for order", o.id, err);
      }
      
      return {
        ...o,
        id: String(o.id), // Ensure it's a string for frontend search
        items: Array.isArray(items) ? items : [],
        customerInfo: {
          name: o.customerName,
          phone: o.customerPhone,
          address: o.customerAddress,
          location: o.customerLocation,
          note: o.customerNote
        }
      };
    });
    res.json(parsedOrders);
  } catch(e) {
    console.error("Order fetch error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const db = await getDb();
    const { id, customerInfo, items, subtotal, deliveryCharge, grandTotal, status, paymentMethod } = req.body;
    
    await db.query(`
      INSERT INTO orders (
        id, customerName, customerPhone, customerAddress, customerLocation, customerNote,
        items, subtotal, deliveryCharge, grandTotal, status, paymentMethod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, customerInfo.name, customerInfo.phone, customerInfo.address, customerInfo.location, customerInfo.note,
      JSON.stringify(items), subtotal, deliveryCharge, grandTotal, status, paymentMethod
    ]);
    
    res.json({ success: true });
  } catch(e) {
    console.error("Order save error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/orders/history', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.query("DELETE FROM orders WHERE status != 'Pending'");
    res.json({ success: true, message: 'History cleared' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.query("DELETE FROM orders WHERE id = ?", [req.params.id]);
    res.json({ success: true, message: 'Order deleted' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const newStatus = req.body.status;
    const orderId = req.params.id;

    // If cancelling, restore stock for each item in the order
    if (newStatus === 'Cancelled') {
      const [orderRows] = await db.query('SELECT items, status FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length > 0 && orderRows[0].status !== 'Cancelled') {
        const items = JSON.parse(orderRows[0].items || '[]');
        for (const item of items) {
          const productId = item.product?.id;
          const qty = item.quantity || 1;
          if (productId) {
            await db.query('UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?', [qty, productId]);
          }
        }
      }
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Fraud Detection - BDCourier API
app.post('/api/fraud-check', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const apiKey = process.env.BDCOURIER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'BDCourier API key not configured' });

    const response = await fetch('https://api.bdcourier.com/courier-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ phone: phone.trim() })
    });

    const data = await response.json();
    console.log('BDCourier raw response:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (e) {
    console.error('Fraud check error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Image Processing Middleware & Generic Upload
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload', authenticateToken, (req, res, next) => {
  upload.single('image')(req, res, function (err) {
    if (err) return res.status(400).json({ error: `Upload error: ${err.message}` });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const filepath = path.join(uploadsDir, filename);
    
    await sharp(req.file.buffer)
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);
      
    res.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Post Product

const handleProductUpload = upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'galleryImages', maxCount: 10 }]);

app.post('/api/products', authenticateToken, (req, res, next) => {
  handleProductUpload(req, res, function (err) {
    if (err) return res.status(400).json({ error: `Upload mapping error: ${err.message}` });
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDb();
    let processedMainImage = '';
    let processedThumbnail = '';
    const processedGallery = [];

    if (req.files && req.files.mainImage) {
      const file = req.files.mainImage[0];
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
      const filepath = path.join(uploadsDir, filename);
      
      await sharp(file.buffer)
        .resize(1200, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);
      
      processedMainImage = `/uploads/${filename}`;

      const thumbFilename = `thumb-${filename}`;
      const thumbFilepath = path.join(uploadsDir, thumbFilename);
      
      await sharp(file.buffer)
        .resize(400, null, { withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbFilepath);
        
      processedThumbnail = `/uploads/${thumbFilename}`;
    }

    if (req.files && req.files.galleryImages) {
      for (const file of req.files.galleryImages) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const filepath = path.join(uploadsDir, filename);
        await sharp(file.buffer).resize(1200, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(filepath);
        processedGallery.push(`/uploads/${filename}`);
      }
    }

    const product = req.body;
    
    // Combine existing and new images according to the provided images array from client
    // The client sends a JSON array of image objects (existing URL or placeholder for new file)
    let finalImages = [];
    if (product.images) {
      const clientImages = JSON.parse(product.images);
      let newImageIdx = 0;
      clientImages.forEach(img => {
        if (typeof img === 'string' && img.startsWith('/uploads')) {
          finalImages.push(img);
        } else if (img === 'new' && processedGallery[newImageIdx]) {
          finalImages.push(processedGallery[newImageIdx]);
          newImageIdx++;
        }
      });
    } else {
      finalImages = processedGallery;
    }

    // First image is mainImage
    const mainImage = finalImages[0] || '';
    let thumbnail = '';
    
    if (mainImage) {
      const filename = path.basename(mainImage);
      const thumbFilename = `thumb-${filename}`;
      const thumbFilepath = path.join(uploadsDir, thumbFilename);
      const fullFilepath = path.join(uploadsDir, filename);
      // We check if thumbnail already exists to avoid reprocessing if it's an existing image
      if (!fs.existsSync(thumbFilepath) && fs.existsSync(fullFilepath)) {
        await sharp(fullFilepath).resize(400, null, { withoutEnlargement: true }).webp({ quality: 70 }).toFile(thumbFilepath);
      }
      thumbnail = `/uploads/${thumbFilename}`;
    }

    if (product.category) {
      const [existingCatsQuery] = await db.query(`SELECT value FROM settings WHERE \`key\` = 'categories'`);
      let cats = existingCatsQuery.length > 0 ? JSON.parse(existingCatsQuery[0].value) : [];
      if (!cats.find(c => c.name === product.category)) {
        cats.push({ name: product.category, subcategories: [] });
        await db.query(`
          INSERT INTO settings ("key", value) VALUES ('categories', ?) 
          ON CONFLICT("key") DO UPDATE SET value = EXCLUDED.value
        `, JSON.stringify(cats));
      }
    }
    
    let sizes = product.sizes || '[]';
    let colors = product.colors || '[]';

    const [info] = await db.execute(`
      INSERT INTO products (
        name, description, category, subcategory, regularPrice, salePrice, 
        stockQuantity, inStock, mainImage, thumbnail, galleryImages, images, sizes, colors, isNew
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product.name, product.description || '', product.category || '', product.subcategory || '',
      Number(product.regularPrice) || 0, product.salePrice ? Number(product.salePrice) : null,
      Number(product.stockQuantity) || 0,
      product.inStock === 'true' ? 1 : 0, mainImage, thumbnail, JSON.stringify(finalImages), JSON.stringify(finalImages),
      sizes, colors, product.isNew === 'true' ? 1 : 0
    ]);

    res.json({ success: true, id: info.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, upload.fields([{ name: 'galleryImages', maxCount: 15 }]), async (req, res) => {
  try {
    const db = await getDb();
    const processedGallery = [];

    if (req.files && req.files.galleryImages) {
      for (const file of req.files.galleryImages) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const filepath = path.join(uploadsDir, filename);
        await sharp(file.buffer).resize(1200, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(filepath);
        processedGallery.push(`/uploads/${filename}`);
      }
    }

    const product = req.body;
    let finalImages = [];
    if (product.images) {
      const clientImages = JSON.parse(product.images);
      let newImageIdx = 0;
      clientImages.forEach(img => {
        if (typeof img === 'string' && img.startsWith('/uploads')) {
          finalImages.push(img);
        } else if (img === 'new' && processedGallery[newImageIdx]) {
          finalImages.push(processedGallery[newImageIdx]);
          newImageIdx++;
        }
      });
    }

    const mainImage = finalImages[0] || '';
    let thumbnail = '';
    
    if (mainImage) {
      const filename = path.basename(mainImage);
      const thumbFilename = `thumb-${filename}`;
      const thumbFilepath = path.join(uploadsDir, thumbFilename);
      const fullFilepath = path.join(uploadsDir, filename);
      if (!fs.existsSync(thumbFilepath) && fs.existsSync(fullFilepath)) {
        await sharp(fullFilepath).resize(400, null, { withoutEnlargement: true }).webp({ quality: 70 }).toFile(thumbFilepath);
      }
      thumbnail = `/uploads/${thumbFilename}`;
    }

    await db.query(`
      UPDATE products SET 
        name=?, description=?, category=?, subcategory=?, regularPrice=?, salePrice=?, 
        stockQuantity=?, inStock=?, mainImage=?, thumbnail=?, galleryImages=?, images=?, sizes=?, colors=?, isNew=?
      WHERE id=?
    `, [
      product.name, product.description || '', product.category || '', product.subcategory || '',
      Number(product.regularPrice) || 0, product.salePrice ? Number(product.salePrice) : null,
      Number(product.stockQuantity) || 0, product.inStock === 'true' ? 1 : 0,
      mainImage, thumbnail, JSON.stringify(finalImages), JSON.stringify(finalImages),
      product.sizes || '[]', product.colors || '[]', product.isNew === 'true' ? 1 : 0,
      req.params.id
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const product = rows[0];
    
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const parsedProduct = {
      ...product,
      price: product.salePrice || product.regularPrice || 0, // Injected Market Price
      inStock: product.inStock === 1,
      isNew: product.isNew === 1,
      galleryImages: JSON.parse(product.galleryImages || '[]'),
      images: JSON.parse(product.images || '[]'),
      sizes: typeof product.sizes === 'string' && product.sizes.startsWith('[') ? JSON.parse(product.sizes) : product.sizes,
      colors: typeof product.colors === 'string' && product.colors.startsWith('[') ? JSON.parse(product.colors) : product.colors,
    };

    res.json(parsedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/store/products', async (req, res) => {
  try {
    const db = await getDb();
    const { minPrice, maxPrice, search, category, subcategory, sortBy, page = 1, limit = 24 } = req.query;
    
    let baseQuery = `FROM products WHERE 1=1 AND inStock = 1`;
    const params = [];

    if (minPrice) {
      baseQuery += ` AND (salePrice >= ? OR (salePrice IS NULL AND regularPrice >= ?))`;
      params.push(Number(minPrice), Number(minPrice));
    }
    if (maxPrice) {
      baseQuery += ` AND (salePrice <= ? OR (salePrice IS NULL AND regularPrice <= ?))`;
      params.push(Number(maxPrice), Number(maxPrice));
    }
    if (search) {
      baseQuery += ` AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
    
    if (category) {
      const catsArray = category.split(',');
      const placeholders = catsArray.map(() => '?').join(',');
      baseQuery += ` AND category IN (${placeholders})`;
      params.push(...catsArray);
    }
    
    if (subcategory) {
      const subcatsArray = subcategory.split(',');
      const placeholders = subcatsArray.map(() => '?').join(',');
      baseQuery += ` AND subcategory IN (${placeholders})`;
      params.push(...subcatsArray);
    }
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [countRows] = await db.query(countQuery, params);
    const total = countRows[0].total;

    let orderClause = 'ORDER BY id DESC';
    if (sortBy === 'price_low') orderClause = 'ORDER BY COALESCE(salePrice, regularPrice) ASC';
    else if (sortBy === 'price_high') orderClause = 'ORDER BY COALESCE(salePrice, regularPrice) DESC';
    else if (sortBy === 'newest') orderClause = 'ORDER BY id DESC';

    const offset = (Number(page) - 1) * Number(limit);
    const paginatedQuery = `SELECT * ${baseQuery} ${orderClause} LIMIT ? OFFSET ?`;
    const [products] = await db.query(paginatedQuery, [...params, Number(limit), offset]);

    const parsedProducts = products.map(p => ({
      ...p,
      price: p.salePrice || p.regularPrice || 0, // Injected Market Price
      inStock: p.inStock === 1,
      isNew: p.isNew === 1,
      galleryImages: JSON.parse(p.galleryImages || '[]'),
      images: JSON.parse(p.images || '[]'),
      sizes: typeof p.sizes === 'string' && p.sizes.startsWith('[') ? JSON.parse(p.sizes) : p.sizes,
      colors: typeof p.colors === 'string' && p.colors.startsWith('[') ? JSON.parse(p.colors) : p.colors,
    }));

    res.json({
      products: parsedProducts,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const { search, category, sortBy, page = 1, limit = 50 } = req.query;
    
    let baseQuery = `FROM products WHERE 1=1`;
    const params = [];

    if (search) {
      baseQuery += ` AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(sku) LIKE ?)`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
    
    if (category && category !== 'All') {
      baseQuery += ` AND category = ?`;
      params.push(category);
    }
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const [countRows] = await db.query(countQuery, params);
    const total = countRows[0].total;

    let orderClause = 'ORDER BY id DESC';
    if (sortBy === 'newest') orderClause = 'ORDER BY id DESC';
    else if (sortBy === 'oldest') orderClause = 'ORDER BY id ASC';
    else if (sortBy === 'price-low') orderClause = 'ORDER BY COALESCE(salePrice, regularPrice) ASC';
    else if (sortBy === 'price-high') orderClause = 'ORDER BY COALESCE(salePrice, regularPrice) DESC';
    else if (sortBy === 'stock-low') orderClause = 'ORDER BY stockQuantity ASC, id DESC';
    else if (sortBy === 'stock-high') orderClause = 'ORDER BY stockQuantity DESC, id DESC';

    const offset = (Number(page) - 1) * Number(limit);
    const paginatedQuery = `SELECT * ${baseQuery} ${orderClause} LIMIT ? OFFSET ?`;
    const [products] = await db.query(paginatedQuery, [...params, Number(limit), offset]);

    const parsedProducts = products.map(p => ({
      ...p,
      price: p.salePrice || p.regularPrice || 0,
      inStock: p.inStock === 1,
      isNew: p.isNew === 1,
      galleryImages: JSON.parse(p.galleryImages || '[]'),
      images: JSON.parse(p.images || '[]'),
      sizes: typeof p.sizes === 'string' && p.sizes.startsWith('[') ? JSON.parse(p.sizes) : (p.sizes ? p.sizes.split(',').map(s=>s.trim()) : []),
      colors: typeof p.colors === 'string' && p.colors.startsWith('[') ? JSON.parse(p.colors) : (p.colors ? p.colors.split(',').map(c=>c.trim()) : []),
    }));

    res.json({
      products: parsedProducts,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

// Production static file serving
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  console.log('Serving frontend from:', distDir);
  app.use(express.static(distDir));
  // Catch-all route to serve the SPA (React) frontend
  app.use((req, res) => {
    // Exclude API routes and asset routes from catch-all
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API route not found' });
    }
  });
}

app.listen(PORT, async () => {
  await getDb(); // Initialize DB connection
  console.log(`E-commerce Server running on port ${PORT}`);
});
