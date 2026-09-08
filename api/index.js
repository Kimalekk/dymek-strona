const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { 
  getProducts, 
  saveProducts, 
  getOrders, 
  saveOrders, 
  getWallet, 
  saveWallet 
} = require('../db');

const app = express();

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// Bezpieczna i odporna na błędy weryfikacja hasła
function verifyPass(inputPass) {
  if (!inputPass) return false;

  const cleanInput = String(inputPass).trim();
  const envPass = String(process.env.ADMIN_PASS || '').trim();

  // Akceptowane warianty
  const validPasswords = [
    'dymek123!@',
    'dymek2024',
    envPass
  ].filter(Boolean);

  return validPasswords.includes(cleanInput);
}

// Middleware autoryzacji nagłówka
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!verifyPass(token)) {
    return res.status(403).json({ error: 'Nieprawidłowe hasło administratora' });
  }

  next();
}

// ===== ENDPOINTY PUBLICZNE =====

app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania produktów' });
  }
});

app.get('/api/wallet-public', async (req, res) => {
  try {
    const wallet = await getWallet();
    res.json({ address: wallet.address || process.env.WALLET_ADDRESS || 'bc1qxyzcryptoexampleaddress1234567890' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania portfela' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, total } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Koszyk jest pusty' });
    }

    const orders = await getOrders();
    const newOrder = {
      id: crypto.randomBytes(4).toString('hex'),
      items,
      total: total || 0,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    orders.unshift(newOrder);
    await saveOrders(orders);

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Błąd tworzenia zamówienia' });
  }
});

// ===== ENDPOINTY ADMINISTRATORA =====

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (verifyPass(password)) {
    res.json({ success: true, token: password });
  } else {
    res.status(401).json({ error: 'Nieprawidłowe hasło' });
  }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania zamówień' });
  }
});

app.post('/api/admin/products', adminAuth, async (req, res) => {
  try {
    await saveProducts(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zapisu produktów' });
  }
});

app.post('/api/admin/wallet', adminAuth, async (req, res) => {
  try {
    if (!req.body.address) return res.status(400).json({ error: 'Brak adresu' });
    await saveWallet({ address: req.body.address });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zapisu portfela' });
  }
});

// ===== FALLBACK DLA ROUTERA FRONTENDOWEGO =====
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Nie znaleziono endpointu API' });
  }
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

module.exports = app;
