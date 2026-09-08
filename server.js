// ===== Lokalny runner (dev / VPS bez konfiguracji Vercel) =====
try { require('dotenv').config(); } catch (e) {}

const path = require('path');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[dymek.xyz] Serwer działa na http://${HOST}:${PORT}`);
});