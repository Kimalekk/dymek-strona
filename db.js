// Warstwa danych: Vercel KV na produkcji (Vercel), pliki JSON lokalnie (dev)
const fs = require('fs');
const path = require('path');

let kv = null;
try {
  kv = require('@vercel/kv').kv;
} catch (e) {
  kv = null;
}

const USE_KV = !!(process.env.KV_REST_API_URL && kv);

let DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
let USE_FILES = false;
if (!USE_KV) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    USE_FILES = true;
  } catch (e) {
    // Brak uprawnien do zapisu (np. Vercel bez KV) - fallback do pamieci
    USE_FILES = false;
  }
}

const mem = new Map();

const ns = (name) => 'dymek:' + name;

async function readDB(name) {
  if (!USE_KV && !USE_FILES) {
    return mem.get(name) || [];
  }
  if (USE_KV) {
    try {
      const data = await kv.get(ns(name));
      return data || [];
    } catch (e) {
      return mem.get(name) || [];
    }
  }
  const file = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

async function writeDB(name, data) {
  if (!USE_KV && !USE_FILES) {
    mem.set(name, data);
    return;
  }
  if (USE_KV) {
    try {
      await kv.set(ns(name), data);
    } catch (e) {
      mem.set(name, data);
    }
    return;
  }
  const file = path.join(DATA_DIR, name + '.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { readDB, writeDB, USE_KV, DATA_DIR };
