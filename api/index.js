// ===== DYMEK.XYZ — serverless entry (Vercel) =====
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB, USE_KV, DATA_DIR } = require('../db');

try { require('dotenv').config(); } catch (e) {}

const app = express();

app.use(express.json({ limit: '2mb' }));

// ===== SEED (tylko gdy baza pusta) =====
let seedPromise = null;

function seedData() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const products = await readDB('products');
    if (products.length > 0) return;

    const seedProducts = [
      { id: 'prod-elf-bar-10000', name: 'Elf Bar 10000', category: 'jednorazowki', price: 89.99, discountPercent: 0, shortDesc: 'Jednorazowy vape 10000 puffów, smak Watermelon Ice.', badge: 'Bestseller', icon: 'fa-bolt', featured: true },
      { id: 'prod-vozol-gear-10000', name: 'Vozol Gear 10000', category: 'jednorazowki', price: 95, discountPercent: 10, shortDesc: 'Mocny i wydajny, 10000 puffów, smak Blueberry Raz.', badge: 'PROMOCJA', icon: 'fa-bolt', featured: false },
      { id: 'prod-vaporesso-xros3', name: 'Vaporesso XROS 3', category: 'pody', price: 149, discountPercent: 0, shortDesc: 'Pod system z regulacja przeplywu powietrza i 1000 mAh.', badge: '', icon: 'fa-plug', featured: true },
      { id: 'prod-oxva-xlim-pro', name: 'Oxva Xlim Pro', category: 'pody', price: 159, discountPercent: 5, shortDesc: 'Kompaktowy pod z ekranem i trybami mocy.', badge: 'NOWOSC', icon: 'fa-plug', featured: false },
      { id: 'prod-siberia-classic', name: 'Siberia Classic', category: 'snusy', price: 39.99, discountPercent: 0, shortDesc: 'Mocne woreczki nikotynowe, 43 mg, 20 szt.', badge: 'Mocny', icon: 'fa-layer-group', featured: false },
      { id: 'prod-velo-freeze', name: 'Velo Freeze', category: 'snusy', price: 24.99, discountPercent: 0, shortDesc: 'Odswiezajace woreczki z mentolem, 20 szt.', badge: '', icon: 'fa-layer-group', featured: true },
      { id: 'prod-liquid-monster', name: 'Liquid Monster 10ml', category: 'liquidy', price: 19.99, discountPercent: 15, shortDesc: 'Klasyczny smak do MTL, 20 mg nikotyny.', badge: 'PROMOCJA', icon: 'fa-flask', featured: false },
      { id: 'prod-liquid-menthol', name: 'Liquid Menthol Ice 10ml', category: 'liquidy', price: 18.99, discountPercent: 0, shortDesc: 'Intensywny mentol, mocne uderzenie w gardlo.', badge: '', icon: 'fa-flask', featured: false },
      { id: 'prod-geekvape-aegis-100', name: 'Geekvape Aegis Max 100', category: 'mody', price: 299, discountPercent: 0, shortDesc: 'Wodoodporny mod jednobateryjny, 100W.', badge: 'TOP', icon: 'fa-microchip', featured: true },
      { id: 'prod-dovpo-odyssey', name: 'Dovpo Odyssey 200W', category: 'mody', price: 349, discountPercent: 0, shortDesc: 'Mocny mod dwubateryjny z chipsetem DNA.', badge: '', icon: 'fa-microchip', featured: false }
    ];
    await writeDB('products', seedProducts);

    const config = await readDB('config');
    if (!config.length) {
      await writeDB('config', [{ key: 'wallet', value: process.env.WALLET_ADDRESS || 'bc1qxyzcryptoexampleaddress1234567890' }]);
    }
  })();
  return seedPromise;
}

app.use('/api', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    await seedData();
  } catch (e) {
    console.error('SEED ERROR', e);
  }
  next();
});

// ===== AUTORYZACJA =====
function verifyPass(pass) {
  const a = Buffer.from(String(pass || ''));
  const b = Buffer.from(String(process.env.ADMIN_PASS || 'dymek2024'));
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch (e) { return false; }
}

function adminAuth(req, res, next) {
  if (verifyPass(req.headers['x-admin-pass'])) return next();
  res.status(401).json({ error: 'Brak dostępu' });
}

// ===== HEALTH / AUTH =====
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: USE_KV ? 'vercel-kv' : 'files', ts: new Date().toISOString() });
});

app.post('/api/auth', (req, res) => {
  const { password } = req.body || {};
  if (verifyPass(password)) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Nieprawidłowe hasło' });
});

// ===== PRODUKTY =====
app.get('/api/products', async (req, res) => {
  let products = await readDB('products');
  const { category, search } = req.query;
  if (category) products = products.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || (p.shortDesc || '').toLowerCase().includes(q));
  }
  res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
  const products = await readDB('products');
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(product);
});

app.post('/api/products', adminAuth, async (req, res) => {
  const products = await readDB('products');
  const product = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  products.push(product);
  await writeDB('products', products);
  res.status(201).json(product);
});

app.put('/api/products/:id', adminAuth, async (req, res) => {
  const products = await readDB('products');
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono' });
  products[idx] = { ...products[idx], ...req.body, id: products[idx].id };
  await writeDB('products', products);
  res.json(products[idx]);
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
  let products = await readDB('products');
  products = products.filter(p => p.id !== req.params.id);
  await writeDB('products', products);
  res.json({ ok: true });
});

// ===== ZNIŻKI =====
app.get('/api/discounts', adminAuth, async (req, res) => {
  res.json(await readDB('discounts'));
});

app.post('/api/discounts', adminAuth, async (req, res) => {
  const discounts = await readDB('discounts');
  const discount = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString(), usedCount: req.body.usedCount || 0 };
  discounts.push(discount);
  await writeDB('discounts', discounts);
  res.status(201).json(discount);
});

app.delete('/api/discounts/:id', adminAuth, async (req, res) => {
  let discounts = await readDB('discounts');
  discounts = discounts.filter(d => d.id !== req.params.id);
  await writeDB('discounts', discounts);
  res.json({ ok: true });
});

app.post('/api/validate-discount', async (req, res) => {
  const { code } = req.body || {};
  const discounts = await readDB('discounts');
  const disc = discounts.find(d => d.code.toLowerCase() === String(code).toLowerCase());
  if (!disc) return res.status(404).json({ error: 'Nieprawidłowy kod' });
  if (disc.expiresAt && new Date(disc.expiresAt) < new Date()) return res.status(400).json({ error: 'Kod wygasł' });
  if (disc.maxUses && disc.usedCount >= disc.maxUses) return res.status(400).json({ error: 'Kod wyczerpany' });

  const idx = discounts.findIndex(d => d.id === disc.id);
  discounts[idx].usedCount = (discounts[idx].usedCount || 0) + 1;
  await writeDB('discounts', discounts);

  res.json({ percent: disc.percent, id: disc.id });
});

// ===== ZAMÓWIENIA =====
app.get('/api/orders', adminAuth, async (req, res) => {
  res.json(await readDB('orders'));
});

app.post('/api/orders', async (req, res) => {
  const orders = await readDB('orders');
  const order = { id: uuidv4(), ...req.body, status: 'oczekuje', createdAt: new Date().toISOString() };
  orders.push(order);
  await writeDB('orders', orders);
  res.status(201).json(order);
});

app.put('/api/orders/:id', adminAuth, async (req, res) => {
  const orders = await readDB('orders');
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono' });
  orders[idx] = { ...orders[idx], ...req.body, id: orders[idx].id };
  await writeDB('orders', orders);
  res.json(orders[idx]);
});

// ===== TICKETY =====
app.get('/api/tickets/:orderId', async (req, res) => {
  const orders = await readDB('orders');
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Nie znaleziono zamówienia' });
  res.json(order);
});

app.post('/api/tickets', async (req, res) => {
  const tickets = await readDB('tickets');
  const ticket = { id: uuidv4(), ...req.body, status: 'otwarty', createdAt: new Date().toISOString(), messages: [] };
  tickets.push(ticket);
  await writeDB('tickets', tickets);
  res.status(201).json(ticket);
});

app.get('/api/tickets', adminAuth, async (req, res) => {
  res.json(await readDB('tickets'));
});

app.post('/api/tickets/:id/message', async (req, res) => {
  const tickets = await readDB('tickets');
  const ticket = tickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Nie znaleziono' });
  ticket.messages.push({ ...req.body, createdAt: new Date().toISOString() });
  await writeDB('tickets', tickets);
  res.json(ticket);
});

app.put('/api/tickets/:id', async (req, res) => {
  const tickets = await readDB('tickets');
  const idx = tickets.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nie znaleziono' });
  tickets[idx] = { ...tickets[idx], ...req.body, id: tickets[idx].id };
  await writeDB('tickets', tickets);
  res.json(tickets[idx]);
});

// ===== KONFIG =====
app.get('/api/wallet', adminAuth, async (req, res) => {
  const config = await readDB('config');
  res.json(config.find(c => c.key === 'wallet') || { value: '' });
});

app.put('/api/wallet', adminAuth, async (req, res) => {
  let config = await readDB('config');
  const idx = config.findIndex(c => c.key === 'wallet');
  if (idx >= 0) config[idx].value = String(req.body.address || '');
  else config.push({ key: 'wallet', value: String(req.body.address || '') });
  await writeDB('config', config);
  res.json({ ok: true });
});

app.get('/api/wallet-public', async (req, res) => {
  const config = await readDB('config');
  const w = config.find(c => c.key === 'wallet');
  res.json({ address: w ? w.value : '' });
});

// ===== STATYSTYKI =====
app.get('/api/stats', adminAuth, async (req, res) => {
  const orders = await readDB('orders');
  const products = await readDB('products');
  const totalRevenue = orders.filter(o => o.status !== 'anulowane').reduce((s, o) => s + (o.total || 0), 0);
  res.json({
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'oczekuje').length,
    totalProducts: products.length,
    totalRevenue
  });
});

// ===== EXPORT FOR VERCEL =====
module.exports = app;
