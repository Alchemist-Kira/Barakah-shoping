export const DB_KEYS = {
  PRODUCTS: 'barakah_products',
  CATEGORIES: 'barakah_categories',
  BANNERS: 'barakah_banners',
  SETTINGS: 'barakah_settings',
  ORDERS: 'barakah_orders'
};

// --- INITIAL SEED DATA ---
const defaultCategories = [
  { id: 'c1', name: "Men's Collection", subcategories: ['Panjabi', 'Pajamas / Pyjamas', 'Lungi', 'T-shirt / Undershirt'] },
  { id: 'c2', name: "Women's Collection", subcategories: ['One-piece', 'Two-piece', 'Three-piece'] },
  { id: 'c3', name: "Islamic & Prayer Essentials", subcategories: ['Prayer Mat (Janamaz)', 'Cap / Prayer Cap (Topi)', 'Ihram Clothing'] },
  { id: 'c4', name: "Bags & Accessories", subcategories: ['Vanity Bag / Handbag', 'School Bag', 'Bag (General purpose)'] },
  { id: 'c5', name: "Footwear", subcategories: ['Shoes'] },
  { id: 'c6', name: "Home & Daily Essentials", subcategories: ['Bedsheet', 'Gamcha / Cotton Towel'] }
];

const defaultProducts = [
  // Men
  { id: 'p1', name: 'Premium Embroidered Panjabi', category: "Men's Collection", subcategory: 'Panjabi', price: 2800, image: 'https://images.unsplash.com/photo-1596455607563-ad6193f76b17?auto=format&fit=crop&q=80&w=600', description: 'Elegant embroidered panjabi perfect for festive occasions.' },
  { id: 'p2', name: 'Comfort Cotton T-Shirt', category: "Men's Collection", subcategory: 'T-shirt / Undershirt', price: 450, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=600', description: 'Breathable undershirt for everyday comfort.' },
  // Women
  { id: 'p3', name: 'Floral Print Three-Piece', category: "Women's Collection", subcategory: 'Three-piece', price: 3200, image: 'https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?auto=format&fit=crop&q=80&w=600', description: 'Beautiful floral three-piece suit with soft dupatta.' },
  { id: 'p4', name: 'Casual Daily Kurti', category: "Women's Collection", subcategory: 'One-piece', price: 1500, image: 'https://images.unsplash.com/photo-1583391733958-d25e07fac662?auto=format&fit=crop&q=80&w=600', description: 'Comfortable one-piece kurti for daily wear.' },
  // Islamic
  { id: 'p5', name: 'Turkish Prayer Mat', category: "Islamic & Prayer Essentials", subcategory: 'Prayer Mat (Janamaz)', price: 1200, image: 'https://images.unsplash.com/photo-1606216487198-d1ff0fc61bea?auto=format&fit=crop&q=80&w=600', description: 'Premium thick prayer mat imported from Turkey.' },
  // Home
  { id: 'p6', name: 'Luxury King Size Bedsheet', category: "Home & Daily Essentials", subcategory: 'Bedsheet', price: 1850, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600', description: 'Soft 100% cotton double bedsheet with elegant prints.' },
  // Bags
  { id: 'p7', name: 'Classic Leather Handbag', category: "Bags & Accessories", subcategory: 'Vanity Bag / Handbag', price: 2500, image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&q=80&w=600', description: 'Stylish and spacious genuine leather handbag.' }
];

const defaultBanners = [
  { id: 'b1', image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=1200', title: 'New Premium Collection', subtitle: 'Discover the latest trends in fashion.', link: "/store" },
  { id: 'b2', image: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&q=80&w=1200', title: 'Home & Living', subtitle: 'Upgrade your living space today.', link: "/store" }
];

const defaultSettings = {
  shippingInside: 80,
  shippingOutside: 150
};

// --- INITIALIZE DATABASE ---
export const initDB = () => {
  if (!localStorage.getItem(DB_KEYS.CATEGORIES)) localStorage.setItem(DB_KEYS.CATEGORIES, JSON.stringify(defaultCategories));
  if (!localStorage.getItem(DB_KEYS.PRODUCTS)) localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
  if (!localStorage.getItem(DB_KEYS.BANNERS)) localStorage.setItem(DB_KEYS.BANNERS, JSON.stringify(defaultBanners));
  if (!localStorage.getItem(DB_KEYS.SETTINGS)) localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(defaultSettings));
  if (!localStorage.getItem(DB_KEYS.ORDERS)) localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify([]));
  // Keep cart separate to avoid wiping users cart on DB init
};

// Run initialization immediately on import
initDB();

// --- CRUD HELPER FUNCTIONS ---
const getTable = (key) => JSON.parse(localStorage.getItem(key)) || [];
const saveTable = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// PRODUCTS
export const getProducts = () => getTable(DB_KEYS.PRODUCTS);
export const getProductById = (id) => getProducts().find(p => p.id === id);
export const addProduct = (product) => {
  const table = getTable(DB_KEYS.PRODUCTS);
  const newProduct = { ...product, id: 'p' + Date.now() };
  saveTable(DB_KEYS.PRODUCTS, [newProduct, ...table]);
  return newProduct;
};
export const updateProduct = (updatedProduct) => {
  const table = getTable(DB_KEYS.PRODUCTS).map(p => p.id === updatedProduct.id ? updatedProduct : p);
  saveTable(DB_KEYS.PRODUCTS, table);
};
export const deleteProduct = (id) => {
  const table = getTable(DB_KEYS.PRODUCTS).filter(p => p.id !== id);
  saveTable(DB_KEYS.PRODUCTS, table);
};

// CATEGORIES
export const getCategories = () => getTable(DB_KEYS.CATEGORIES);
export const addCategory = (category) => {
  const table = getTable(DB_KEYS.CATEGORIES);
  const newCat = { ...category, id: 'c' + Date.now() };
  saveTable(DB_KEYS.CATEGORIES, [...table, newCat]);
};
export const updateCategory = (updatedCat) => {
  const table = getTable(DB_KEYS.CATEGORIES).map(c => c.id === updatedCat.id ? updatedCat : c);
  saveTable(DB_KEYS.CATEGORIES, table);
};
export const deleteCategory = (id) => {
  const table = getTable(DB_KEYS.CATEGORIES).filter(c => c.id !== id);
  saveTable(DB_KEYS.CATEGORIES, table);
};

// BANNERS
export const getBanners = () => getTable(DB_KEYS.BANNERS);
export const addBanner = (banner) => {
  const table = getTable(DB_KEYS.BANNERS);
  const newBan = { ...banner, id: 'b' + Date.now() };
  saveTable(DB_KEYS.BANNERS, [...table, newBan]);
};
export const deleteBanner = (id) => {
  const table = getTable(DB_KEYS.BANNERS).filter(b => b.id !== id);
  saveTable(DB_KEYS.BANNERS, table);
};

// SETTINGS
export const getSettings = () => JSON.parse(localStorage.getItem(DB_KEYS.SETTINGS));
export const updateSettings = (newSettings) => saveTable(DB_KEYS.SETTINGS, { ...getSettings(), ...newSettings });

// ORDERS
export const getOrders = () => getTable(DB_KEYS.ORDERS);
export const getOrderById = (id) => getOrders().find(o => o.id === id);
export const addOrder = (order) => {
  const table = getTable(DB_KEYS.ORDERS);
  // Add print status to mock orders
  const newOrder = { ...order, id: 'ORD-' + Math.floor(100000 + Date.now() % 900000), date: new Date().toISOString() };
  saveTable(DB_KEYS.ORDERS, [newOrder, ...table]);
  return newOrder;
};
export const updateOrderStatus = (id, status) => {
  const table = getOrders().map(o => o.id === id ? { ...o, status } : o);
  saveTable(DB_KEYS.ORDERS, table);
};
export const deleteOrder = (id) => {
  const table = getOrders().filter(o => o.id !== id);
  saveTable(DB_KEYS.ORDERS, table);
};
