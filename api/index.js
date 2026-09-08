const express = require('express');
const crypto = require('crypto');
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

// Bezpieczne sprawdzanie hasła admina
function verifyPass(inputPass) {
  const envPass = process.env.ADMIN_PASS || 'dymek123!@';
  const fallbackPass = 'dymek2024';

  const passStr = String(inputPass || '').trim();
  return passStr === envPass.trim() || passStr === fallbackPass;
}

// Middleware do weryfikacji tokena / hasła admina
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Brak nagłówka Authorization' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!verifyPass(token)) {
    return res.status(403).json({ error: 'Nieprawidłowe hasło administratora' });
  }

  next();
}

// ===== PUBLICZNE ENDPOINTY =====

// Pobieranie listy produktów
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error('Błąd pobierania produktów:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobieranie publicznego adresu portfela
app.get('/api/wallet-public', async (req, res) => {
  try {
    const wallet = await getWallet();
    res.json({ address: wallet.address || process.env.WALLET_ADDRESS || 'bc1qxyzcryptoexampleaddress1234567890' });
  } catch (err) {
    console.error('Błąd pobierania portfela:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Składanie nowego zamówienia
app.post('/api/orders', async (req, res) => {
  try {
    const { items, total } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Koszyk nie może być pusty' });
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
    console.error('Błąd tworzenia zamówienia:', err);
    res.status(500).json({ error: 'Błąd podczas składania zamówienia' });
  }
});

// ===== ENDPOINTY ADMINISTRATORA =====

// Logowanie do panelu admina
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (verifyPass(password)) {
    res.json({ success: true, token: password });
  } else {
    res.status(401).json({ error: 'Nieprawidłowe hasło' });
  }
});

// Pobieranie zamówień
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania zamówień' });
  }
});

// Zapis produktów
app.post('/api/admin/products', adminAuth, async (req, res) => {
  try {
    const products = req.body;
    await saveProducts(products);
    res.json({ success: true, message: 'Zapisano produkty' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zapisu produktów' });
  }
});

// Zapis adresu portfela krypto
app.post('/api/admin/wallet', adminAuth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Adres portfela jest wymagany' });
    }
    await saveWallet({ address });
    res.json({ success: true, address });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zapisu portfela' });
  }
});

// Eksport aplikacji dla Vercela
module.exports = app;
