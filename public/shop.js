// ============ DYMEK.XYZ - Frontend Script Part 1 ============

const app = document.getElementById('app');
let cart = JSON.parse(localStorage.getItem('dymek_cart') || '[]');
let products = [];
let adminSession = sessionStorage.getItem('dymek_admin') === '1';
let adminPassValue = localStorage.getItem('dymek_admin_pass') || '';

// ============ HELPERS ============
function formatPrice(price) {
  return Number(price).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

function toast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'}"></i> ${message}`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('hide');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Błąd serwera');
  }
  return res.json();
}

function getProductById(id) {
  return products.find(p => p.id === id);
}

function getEffectivePrice(p) {
  const disc = p.discountPercent || 0;
  return disc > 0 ? p.price * (1 - disc / 100) : p.price;
}

const statusLabels = {
  'oczekuje': 'Oczekuje',
  'oplacone': 'Opłacone',
  'wyslane': 'Wysłane',
  'dostarczone': 'Dostarczone',
  'anulowane': 'Anulowane'
};
const statusLabel = s => statusLabels[s] || s;

// ============ CART ============
function cartUpdateUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = count;
  if (document.getElementById('cartItems')) renderCartItems();
}

function cartTotals() {
  return cart.reduce((s, i) => s + (i.qty * i.price), 0);
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const total = document.getElementById('cartTotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-cart-arrow-down"></i>
        <p>Twój koszyk jest pusty</p>
      </div>`;
    total.textContent = formatPrice(0);
    return;
  }

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-img"><i class="fa-solid fa-wind"></i></div>
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(item.name)}</div>
        <div class="cart-item-price">${formatPrice(item.price)} × ${item.qty}</div>
        <div style="font-size:12px;color:var(--text-muted)">${formatPrice(item.price * item.qty)}</div>
      </div>
      <button class="cart-item-remove" onclick="cartRemove(${idx})"><i class="fa-solid fa-trash-can"></i></button>
    </div>
  `).join('');
  total.textContent = formatPrice(cartTotals());
}

function cartAdd(product, qty = 1) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) existing.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: getEffectivePrice(product), qty });
  localStorage.setItem('dymek_cart', JSON.stringify(cart));
  cartUpdateUI();
  toast(`Dodano do koszyka: ${product.name}`);
}

function cartRemove(idx) {
  cart.splice(idx, 1);
  localStorage.setItem('dymek_cart', JSON.stringify(cart));
  cartUpdateUI();
}

function addToCart(id) {
  const product = getProductById(id);
  if (!product) return toast('Nie znaleziono produktu', 'error');
  const qtyInput = document.querySelector(`.qty-input[data-product="${id}"]`);
  const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 1) : 1;
  cartAdd(product, qty);
}

function qtyChange(btn, delta) {
  const qtyInput = btn.closest('.qty-controls').querySelector('.qty-input');
  let val = (parseInt(qtyInput.value) || 1) + (delta ? 1 : -1);
  if (val < 1) val = 1;
  qtyInput.value = val;
}

// ============ ROUTER ============
const categoryMeta = {
  jednorazowki: { title: 'Jednorazówki', icon: 'fa-bolt', desc: 'Gotowe do użycia, zero konserwacji, maksimum smaku.' },
  pody: { title: 'Pody', icon: 'fa-plug', desc: 'Kompaktowe pod systemy — nowoczesność w Twojej kieszeni.' },
  snusy: { title: 'Snusy', icon: 'fa-layer-group', desc: 'Nikotynowe woreczki bez dymu i bez tytoniu.' },
  liquidy: { title: 'Liquidy', icon: 'fa-flask', desc: 'Najszerszy wybór smaków do Twojego e-papierosa.' },
  mody: { title: 'Mody', icon: 'fa-microchip', desc: 'Zaawansowane mody dla prawdziwych entuzjastów.' }
};

function router() {
  const path = window.location.pathname;
  const nav = document.getElementById('mainNav');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.remove('active');
  });

  if (path.startsWith('/kategoria/')) {
    document.querySelectorAll('.nav-link').forEach(l => {
      if (l.getAttribute('href') === path) l.classList.add('active');
    });
  }

  nav.classList.remove('open');

  if (path === '/') renderHome();
  else if (path.startsWith('/kategoria/')) {
    const slug = path.split('/')[2];
    renderCategory(slug);
  } else if (path === '/kontakt') renderContact();
  else if (path === '/regulamin') renderRegulamin();
  else if (path === '/admin') renderAdmin();
  else if (path.startsWith('/zamowienie/')) {
    renderOrderStatus(decodeURIComponent(path.split('/')[2]));
  } else renderNotFound();

  window.scrollTo(0, 0);
}

// ============ HOME ============
async function renderHome() {
  try {
    products = await api('/api/products');
  } catch (e) {
    products = [];
  }

  const popular = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
  const featured = products.filter(p => p.featured).slice(0, 4);

  app.innerHTML = `
    <section class="hero">
      <h1>Witamy w dymek<span>.xyz</span></h1>
      <p>Najlepsze e-papierosy, liquidy i akcesoria vapingowe. Szybka dostawa, niskie ceny i pełne bezpieczeństwo.</p>
      <div class="hero-badges">
        <div class="hero-badge"><i class="fa-solid fa-bolt"></i> Szybka wysyłka</div>
        <div class="hero-badge"><i class="fa-solid fa-shield-halved"></i> 100% oryginały</div>
        <div class="hero-badge"><i class="fa-solid fa-lock"></i> Anonimowa wysyłka</div>
        <div class="hero-badge"><i class="fa-solid fa-headset"></i> Wsparcie na Discordzie</div>
      </div>
      <a href="/kategoria/jednorazowki" class="btn btn-primary btn-lg"><i class="fa-solid fa-store"></i> Kup teraz</a>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Nasze <span>kategorie</span></h2>
      </div>
      <div class="categories-grid">
        ${Object.entries(categoryMeta).map(([key, cat]) => `
          <a href="/kategoria/${key}" class="category-card">
            <i class="fa-solid ${cat.icon}"></i>
            <h3>${cat.title}</h3>
            <p>${cat.desc}</p>
          </a>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Bestsellery</h2>
        <a href="/kategoria/jednorazowki" class="see-all">Zobacz wszystko →</a>
      </div>
      <div class="products-grid">${popular.map(renderProductCard).join('') || '<p style="color:var(--text-muted)">Brak produktów — dodaj je w panelu admina.</p>'}</div>
    </section>

    ${featured.length ? `
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Polecane</h2>
      </div>
      <div class="products-grid">${featured.map(renderProductCard).join('')}</div>
    </section>` : ''}
  `;
}

function renderProductCard(p) {
  const finalPrice = getEffectivePrice(p);
  const disc = p.discountPercent || 0;
  return `
    <div class="product-card">
      ${disc > 0 ? `<div class="product-badge discount">-${disc}%</div>` : p.badge ? `<div class="product-badge">${esc(p.badge)}</div>` : ''}
      <div class="product-img"><i class="fa-solid ${p.icon || 'fa-wind'}"></i></div>
      <div class="product-info">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-desc">${esc(p.shortDesc || '')}</div>
        <div>
          <span class="product-price">${formatPrice(finalPrice)}</span>
          ${disc > 0 ? `<span class="product-old-price">${formatPrice(p.price)}</span>` : ''}
        </div>
        <div class="product-price-row">
          <div class="qty-controls">
            <button class="qty-btn" onclick="qtyChange(this)">−</button>
            <input type="text" class="qty-input" value="1" data-product="${p.id}">
            <button class="qty-btn" onclick="qtyChange(this, 1)">+</button>
          </div>
          <button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">
            <i class="fa-solid fa-cart-plus"></i> Dodaj
          </button>
        </div>
      </div>
    </div>`;
}

// ============ CATEGORY PAGES ============
let currentCategory = null;
let filterState = { sort: 'default', min: '', max: '' };

async function renderCategory(slug) {
  const meta = categoryMeta[slug];
  if (!meta) return renderNotFound();

  try {
    products = await api('/api/products');
  } catch (e) {
    return renderNotFound();
  }

  currentCategory = slug;
  filterState = { sort: 'default', min: '', max: '' };

  const cats = ['jednorazowki', 'pody', 'snusy', 'liquidy', 'mody'];

  app.innerHTML = `
    <div class="shop-layout">
      <aside class="filter-sidebar">
        <div>
          <div class="filter-title">Kategorie</div>
          <nav class="filter-cats">
            ${cats.map(c => {
              const count = products.filter(p => p.category === c).length;
              return `<a href="/kategoria/${c}" class="${c === slug ? 'active' : ''}">
                ${categoryMeta[c].title}
                <span class="count">${count}</span>
              </a>`;
            }).join('')}
          </nav>
        </div>

        <div>
          <div class="filter-title">Sortowanie</div>
          <select class="filter-select" id="filterSort" onchange="applyFilters()">
            <option value="default">Domyślne</option>
            <option value="price-asc">Cena: od najniższej</option>
            <option value="price-desc">Cena: od najwyższej</option>
            <option value="name">Nazwa: A-Z</option>
          </select>
        </div>

        <div>
          <div class="filter-title">Cena</div>
          <div class="filter-price">
            <input type="number" id="filterMin" placeholder="Od" min="0" onchange="applyFilters()">
            <input type="number" id="filterMax" placeholder="Do" min="0" onchange="applyFilters()">
          </div>
        </div>

        <button class="btn btn-secondary full-width" onclick="resetFilters()"><i class="fa-solid fa-rotate-left"></i> Resetuj filtry</button>
      </aside>

      <div class="shop-content">
        <div class="page-hero">
          <h1>${meta.title}</h1>
          <p>${meta.desc}</p>
        </div>
        <div class="products-grid" id="categoryProducts"></div>
      </div>
    </div>
  `;

  renderCategoryProducts();
}

function renderCategoryProducts() {
  let list = products.filter(p => p.category === currentCategory);

  const min = parseFloat(filterState.min);
  const max = parseFloat(filterState.max);
  if (!isNaN(min)) list = list.filter(p => getEffectivePrice(p) >= min);
  if (!isNaN(max)) list = list.filter(p => getEffectivePrice(p) <= max);

  if (filterState.sort === 'price-asc') list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
  else if (filterState.sort === 'price-desc') list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
  else if (filterState.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  const grid = document.getElementById('categoryProducts');
  grid.innerHTML = list.map(renderProductCard).join('') ||
    '<p class="no-results"><i class="fa-solid fa-magnifying-glass" style="display:block;font-size:32px;color:var(--border);margin-bottom:12px"></i>Brak produktów spełniających kryteria.</p>';
}

function applyFilters() {
  filterState.sort = document.getElementById('filterSort').value;
  filterState.min = document.getElementById('filterMin').value;
  filterState.max = document.getElementById('filterMax').value;
  renderCategoryProducts();
}

function resetFilters() {
  filterState = { sort: 'default', min: '', max: '' };
  if (document.getElementById('filterSort')) document.getElementById('filterSort').value = 'default';
  if (document.getElementById('filterMin')) document.getElementById('filterMin').value = '';
  if (document.getElementById('filterMax')) document.getElementById('filterMax').value = '';
  renderCategoryProducts();
}

// ============ SEARCH ============
function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.add('open');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<p class="search-hint"><i class="fa-solid fa-magnifying-glass" style="margin-right:8px"></i>Wpisz nazwę produktu, aby szukać...</p>';
  setTimeout(() => document.getElementById('searchInput').focus(), 60);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
}

async function searchProducts() {
  const q = document.getElementById('searchInput').value.trim();
  const results = document.getElementById('searchResults');

  if (q.length < 2) {
    results.innerHTML = '<p class="search-hint"><i class="fa-solid fa-magnifying-glass" style="margin-right:8px"></i>' +
      (q ? 'Wpisz minimum 2 znaki...' : 'Wpisz nazwę produktu, aby szukać...') + '</p>';
    return;
  }

  results.innerHTML = '<p class="search-hint">Szukanie...</p>';

  try {
    const data = await api('/api/products?search=' + encodeURIComponent(q));
    if (data.length === 0) {
      results.innerHTML = `<p class="search-hint">Brak wyników dla "<strong>${esc(q)}</strong>"</p>`;
      return;
    }
    results.innerHTML = data.map(p => `
      <a href="/kategoria/${p.category}" class="search-result" onclick="closeSearch()">
        <div class="search-result-icon"><i class="fa-solid ${p.icon || 'fa-wind'}"></i></div>
        <div>
          <div class="search-result-name">${esc(p.name)}</div>
          <div class="search-result-meta">${esc(categoryMeta[p.category]?.title || p.category)} · ${formatPrice(getEffectivePrice(p))}</div>
        </div>
        <span class="search-result-add" onclick="event.preventDefault();event.stopPropagation();addFromSearch('${p.id}')" title="Dodaj do koszyka">
          <i class="fa-solid fa-cart-plus"></i>
        </span>
      </a>`).join('');
  } catch (e) {
    results.innerHTML = '<p class="search-hint">Wystąpił błąd podczas wyszukiwania.</p>';
  }
}

async function addFromSearch(id) {
  try {
    const p = await api('/api/products/' + id);
    cartAdd(p, 1);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ CONTACT ============
function renderContact() {
  app.innerHTML = `
    <section class="page-hero">
      <h1>Kontakt</h1>
      <p>Masz pytanie? Napisz do nas — odpowiadamy zwykle w kilka minut.</p>
      <a href="${DISCORD_URL}" target="_blank" class="btn btn-primary btn-lg" style="margin-top:16px"><i class="fa-brands fa-discord"></i> Napisz na Discordzie</a>
    </section>
    <div class="contact-grid">
      <div class="contact-card">
        <div class="contact-item">
          <div class="contact-icon"><i class="fa-brands fa-discord"></i></div>
          <div>
            <h4>Discord</h4>
            <p>Szybki kontakt i wsparcie: <a href="https://discord.gg/dymek" target="_blank">discord.gg/dymek</a></p>
          </div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><i class="fa-solid fa-envelope"></i></div>
          <div>
            <h4>E-mail</h4>
            <p><a href="mailto:kontakt@dymek.xyz">kontakt@dymek.xyz</a></p>
          </div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><i class="fa-brands fa-telegram"></i></div>
          <div>
            <h4>Telegram</h4>
            <p>@dymekxyz — sprawdzamy regularnie w godzinach 10:00–22:00</p>
          </div>
        </div>
        <div class="contact-item">
          <div class="contact-icon"><i class="fa-solid fa-clock"></i></div>
          <div>
            <h4>Godziny obsługi</h4>
            <p>Codziennie 10:00 – 22:00. Zamówienia wysyłamy w dni robocze.</p>
          </div>
        </div>
      </div>
      <div class="contact-card">
        <h3 style="margin-bottom:20px;font-size:18px">Napisz do nas</h3>
        <form onsubmit="event.preventDefault();submitContact(this)">
          <div class="form-group">
            <label>Twoje imię / nick</label>
            <input type="text" id="contactName" required placeholder="Np. Vaper123">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" id="contactEmail" required placeholder="ty@przyklad.pl">
          </div>
          <div class="form-group">
            <label>Wiadomość</label>
            <textarea id="contactMsg" required placeholder="W czym możemy pomóc?"></textarea>
          </div>
          <button type="submit" class="btn btn-primary full-width"><i class="fa-solid fa-paper-plane"></i> Wyślij wiadomość</button>
        </form>
      </div>
    </div>
  `;
}

function submitContact(form) {
  const name = document.getElementById('contactName').value;
  const msg = document.getElementById('contactMsg').value;
  const ticket = {
    orderId: null,
    subject: `Wiadomość od ${name}`,
    messages: [{ body: msg, author: name, createdAt: new Date().toISOString() }]
  };
  api('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  }).then(() => {
    toast('Wiadomość wysłana! Odpowiemy wkrótce.');
    form.reset();
  }).catch(err => toast(err.message, 'error'));
}

// ============ REGULAMIN ============
function renderRegulamin() {
  app.innerHTML = `
    <section class="page-hero">
      <h1>Regulamin</h1>
      <p>Prosimy o zapoznanie się z regulaminem przed złożeniem zamówienia.</p>
    </section>
    <div class="rules-content">
      <div class="rules-section">
        <h2>1. Postanowienia ogólne</h2>
        <p>Sklep internetowy <strong>dymek.xyz</strong> oferuje sprzedaż e-papierosów oraz akcesoriów vapingowych. Wszystkie towary sprzedawane są wyłącznie osobom pełnoletnim (18+).</p>
      </div>
      <div class="rules-section">
        <h2>2. Składanie zamówień</h2>
        <ol>
          <li>Zamówienia składane są przez koszyk i formularz zamówienia.</li>
          <li>Po złożeniu zamówienia otrzymujesz unikalny numer zamówienia (ID).</li>
          <li>Płatność możliwa jest kryptowalutami lub inną metodą uzgodnioną na Discordzie.</li>
        </ol>
      </div>
      <div class="rules-section">
        <h2>3. Płatności</h2>
        <ol>
          <li>Płatność krypto: przelewasz dokładną kwotę na adres walleta podany przy zamówieniu.</li>
          <li>Po wykonaniu przelewu utwórz ticket z numerem zamówienia i potwierdzeniem przelewu (hash / TXID).</li>
          <li>Zamówienie zostanie oznaczone jako <strong>opłacone</strong> po weryfikacji płatności.</li>
          <li>Inne metody płatności: napisz na tickecie wybraną metodę, a my odpowiemy w ciągu kilku minut.</li>
        </ol>
      </div>
      <div class="rules-section">
        <h2>4. Wysyłka</h2>
        <ol>
          <li>Wysyłka realizowana jest w ciągu 24-48h od zaksięgowania płatności.</li>
          <li>Paczki wysyłane są dyskretnie — bez znaków graficznych kojarzących się z vapingiem.</li>
          <li>Śledzenie przesyłki przekazujemy na tickecie zamówienia.</li>
        </ol>
      </div>
      <div class="rules-section">
        <h2>5. Reklamacje</h2>
        <p>W przypadku problemów z produktem skontaktuj się z nami na Discordzie w ciągu 7 dni od otrzymania paczki. Dołącz numer zamówienia oraz nagranie lub zdjęcie problemu.</p>
      </div>
      <div class="rules-section">
        <h2>6. Odpowiedzialność</h2>
        <p>Produkty z nikotyną przeznaczone są wyłącznie dla osób pełnoletnich. Sklep nie ponosi odpowiedzialności za nieprzestrzeganie prawa lokalnego przez klienta. Nie sprzedajemy osobom niepełnoletnim — kupując potwierdzasz, że masz ukończone 18 lat.</p>
      </div>
      <div class="rules-section">
        <h2>7. Ochrona danych</h2>
        <p>Nie sprzedajemy ani nie udostępniamy danych klientów podmiotom trzecim. Płatności realizowane są anonimowo.</p>
      </div>
    </div>
  `;
}

// ============ 404 ============
function renderNotFound() {
  app.innerHTML = `
    <section class="page-hero">
      <h1>404</h1>
      <p>Nie znaleźliśmy tej strony.</p>
      <a href="/" class="btn btn-primary btn-lg" style="margin-top:20px"><i class="fa-solid fa-house"></i> Wróć na stronę główną</a>
    </section>
  `;
}

// ============ CHECKOUT ============
let checkoutTotal = 0;
let currentOrder = null;

function openCheckout() {
  if (cart.length === 0) {
    toast('Twój koszyk jest pusty', 'error');
    return;
  }

  checkoutTotal = cartTotals();

  const overlay = document.createElement('div');
  overlay.className = 'checkout-overlay';
  overlay.id = 'checkoutOverlay';
  overlay.innerHTML = `
    <div class="checkout-modal">
      <h2><i class="fa-solid fa-truck-fast" style="color:var(--primary-light);margin-right:8px"></i> Zamówienie</h2>

      <div class="checkout-summary">
        ${cart.map(i => `
          <div class="checkout-summary-row">
            <span>${esc(i.name)} × ${i.qty}</span>
            <span>${formatPrice(i.price * i.qty)}</span>
          </div>`).join('')}
        <div class="checkout-summary-row discount" id="discountRow" style="display:none">
          <span>Rabat (<span id="discountCode"></span>)</span>
          <span id="discountAmount">0,00 zł</span>
        </div>
        <div class="checkout-summary-row total">
          <span>Razem</span>
          <span id="orderTotal">${formatPrice(checkoutTotal)}</span>
        </div>
      </div>

      <div class="form-group">
        <label>Kod rabatowy</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="discountInput" placeholder="np. DYMEK10">
          <button class="btn btn-secondary" onclick="applyDiscount()" id="applyDiscBtn">Zastosuj</button>
        </div>
        <div class="code-info" id="discountInfo"></div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Imię / pseudonim *</label>
          <input type="text" id="orderName" required placeholder="Jak się nazywamy">
        </div>
        <div class="form-group">
          <label>Kontakt (Discord / Telegram) *</label>
          <input type="text" id="orderContact" required placeholder="np. @dymek_user">
        </div>
      </div>

      <div class="form-group">
        <label>Uwagi do zamówienia</label>
        <textarea id="orderNotes" placeholder="Np. preferowana metoda dostawy, dodatkowe wskazówki..."></textarea>
      </div>

      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
        <i class="fa-solid fa-shield-halved" style="color:var(--success)"></i> Składając zamówienie potwierdzasz, że masz ukończone 18 lat i akceptujesz <a href="/regulamin" style="color:var(--primary-light)">regulamin</a>.
      </div>

      <button class="btn btn-primary full-width btn-lg" onclick="placeOrder()">
        <i class="fa-solid fa-wallet"></i> Złóż zamówienie
      </button>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCheckout();
  });

  document.body.appendChild(overlay);
}

function closeCheckout() {
  document.getElementById('checkoutOverlay')?.remove();
}

function applyDiscount() {
  const code = document.getElementById('discountInput').value.trim();
  const info = document.getElementById('discountInfo');

  if (!code) {
    info.className = 'code-info error visible';
    info.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Wpisz kod rabatowy';
    return;
  }

  api('/api/validate-discount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  }).then(disc => {
    const discount = disc.percent / 100;
    const amount = checkoutTotal * discount;
    const newTotal = checkoutTotal - amount;

    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('discountCode').textContent = code.toUpperCase();
    document.getElementById('discountAmount').textContent = '-' + formatPrice(amount);
    document.getElementById('orderTotal').textContent = formatPrice(newTotal);

    info.className = 'code-info visible';
    info.innerHTML = `<i class="fa-solid fa-circle-check"></i> Kod zastosowany: −${disc.percent}%`;
    window.appliedDiscount = disc;
    checkoutTotal = newTotal;
    toast(`Rabat ${disc.percent}% zastosowany`, 'success');
  }).catch(err => {
    info.className = 'code-info error visible';
    info.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message}`;
  });
}

async function placeOrder() {
  const name = document.getElementById('orderName').value.trim();
  const contact = document.getElementById('orderContact').value.trim();

  if (!name || !contact) {
    toast('Uzupełnij imię i kontakt', 'error');
    return;
  }

  const order = {
    customer: { name, contact, notes: document.getElementById('orderNotes').value },
    items: cart,
    total: Number(checkoutTotal.toFixed(2)),
    discountCode: window.appliedDiscount ? document.getElementById('discountCode').textContent : null,
    discountPercent: window.appliedDiscount ? window.appliedDiscount.percent : 0
  };

  try {
    const created = await api('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    currentOrder = created;
    localStorage.removeItem('dymek_cart');
    cart = [];
    cartUpdateUI();
    renderPayment(created);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderPayment(order) {
  const overlay = document.getElementById('checkoutOverlay');
  overlay.innerHTML = `
    <div class="checkout-modal payment-step">
      <h3><i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:8px"></i> Zamówienie złożone!</h3>
      <p style="color:var(--text-muted);margin-bottom:24px">
        Numer Twojego zamówienia:
        <span class="order-number" onclick="navigator.clipboard.writeText('${order.id}');toast('Skopiowano numer zamówienia')">${order.id.slice(0, 8)}</span>
      </p>

      <div class="checkout-summary" style="text-align:left">
        <div class="checkout-summary-row total">
          <span>Do zapłaty</span>
          <span>${formatPrice(order.total)}</span>
        </div>
      </div>

      <h4 style="font-size:16px;margin-bottom:16px;color:var(--text-muted)">Wybierz metodę płatności:</h4>

      <div class="payment-options">
        <button class="payment-option" id="optCrypto" onclick="selectPayment('crypto')">
          <i class="fa-brands fa-bitcoin"></i>
          <div>
            Kryptowaluty
            <p>USDT, BTC, ETH, LTC — anonimowo</p>
          </div>
        </button>
        <button class="payment-option" id="optTicket" onclick="selectPayment('ticket')">
          <i class="fa-solid fa-ticket"></i>
          <div>
            Inna metoda (ticket)
            <p>Ustalimy na tickecie np. BLIK, przelew</p>
          </div>
        </button>
      </div>

      <div id="paymentContent"></div>
    </div>
  `;
}

const DISCORD_URL = 'https://discord.gg/dymek';

async function selectPayment(method) {
  const content = document.getElementById('paymentContent');
  const optCrypto = document.getElementById('optCrypto');
  const optTicket = document.getElementById('optTicket');

  optCrypto.classList.toggle('selected', method === 'crypto');
  optTicket.classList.toggle('selected', method === 'ticket');

  if (method === 'crypto') {
    let walletAddress = '';
    try {
      const w = await api('/api/wallet-public');
      walletAddress = w.address || '';
    } catch (e) {}

    if (!walletAddress) {
      content.innerHTML = `
        <div class="ticket-info">
          <i class="fa-solid fa-circle-info"></i> Adres walleta nie został jeszcze ustawiony przez administratora.<br>
          Prosimy o cierpliwość — skontaktuj się z nami na Discordzie.
        </div>
        <button class="btn btn-primary full-width" onclick="openDiscordTicket()"><i class="fa-brands fa-discord"></i> Otwórz Discorda</button>
      `;
      return;
    }

    content.innerHTML = `
      <div class="wallet-box">
        <label>Adres portfela (skopiuj dokładnie):</label>
        <div class="wallet-address">
          <code id="walletAddr">${esc(walletAddress)}</code>
          <button class="copy-btn" onclick="copyWallet()"><i class="fa-solid fa-copy"></i></button>
        </div>
      </div>

      <div class="payment-steps">
        <ol>
          <li><strong>Skopiuj</strong> adres portfela i <strong>przelej dokładnie ${formatPrice(currentOrder.total)}</strong> (w przeliczeniu na BTC/USDT).</li>
          <li>Nie wysyłaj <strong>mniej ani więcej</strong> niż wymagana kwota.</li>
          <li>Po wykonaniu przelewu utwórz <strong>ticket na Discordzie</strong> z numerem zamówienia i TXID (hash transakcji), aby potwierdzić płatność.</li>
        </ol>
      </div>

      <button class="btn btn-primary full-width btn-lg" onclick="openDiscordTicket()">
        <i class="fa-brands fa-discord"></i> Potwierdź płatność na Discordzie
      </button>
    `;
  } else {
    content.innerHTML = `
      <div class="ticket-info">
        <i class="fa-solid fa-circle-info"></i> Płatności inną metodą (np. <strong>BLIK</strong>, przelew tradycyjny, inna kryptowaluta) ustalamy na <strong>Discordzie</strong>.<br>
        Utwórz ticket z numerem zamówienia i wybraną metodą — otrzymasz instrukcje w kilka minut.
      </div>
      <button class="btn btn-primary full-width btn-lg" onclick="openDiscordTicket()">
        <i class="fa-brands fa-discord"></i> Utwórz ticket na Discordzie
      </button>
    `;
  }

  window.selectedPaymentMethod = method;
}

async function copyWallet() {
  const code = document.getElementById('walletAddr').textContent.trim();
  try {
    await navigator.clipboard.writeText(code);
    toast('Adres portfela skopiowany!');
  } catch (e) {
    toast('Nie udało się skopiować', 'error');
  }
}

async function openDiscordTicket() {
  const order = currentOrder;
  const txid = document.getElementById('txid')?.value?.trim();
  let message = '';
  if (order) {
    message = `Dzień dobry! Potwierdzam płatność krypto za zamówienie.\nNumer zamówienia: ${order.id}\nKwota: ${formatPrice(order.total)}\n`;
    if (txid) message += `TXID: ${txid}\n`;
    message += 'Zamówienie: dymek.xyz';
  }
  try {
    await navigator.clipboard.writeText(message.trim() || 'Dzień dobry! Chcę potwierdzić płatność za zamówienie w sklepie dymek.xyz.');
    if (order) toast('Numer zamówienia skopiowany — wklej go w tickecie na Discordzie.', 'info');
  } catch (e) {}
  window.open(DISCORD_URL, '_blank');
}

// ============ ORDER STATUS PAGE ============
async function renderOrderStatus(orderId) {
  try {
    const order = await api('/api/tickets/' + orderId);
    app.innerHTML = `
      <section class="page-hero">
        <h1>Zamówienie <span>#${esc(order.id.slice(0, 8))}</span></h1>
        <p>Złożone ${new Date(order.createdAt).toLocaleString('pl-PL')}</p>
      </section>

      <div style="max-width:720px;margin:0 auto">
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-id">${esc(order.id)}</span>
<span class="order-status ${order.status}">${esc(statusLabel(order.status))}</span>
          </div>
          <div class="order-card-body">
            <div class="order-info-block">
              <h5>Zamówione produkty</h5>
              <div class="order-products">
                ${order.items.map(i => `<div>• ${esc(i.name)} × ${i.qty} — ${formatPrice(i.price * i.qty)}</div>`).join('')}
              </div>
            </div>
            <div class="order-info-block">
              <h5>Dane</h5>
              <p>Klient: ${esc(order.customer.name)}<br>
              Kontakt: ${esc(order.customer.contact)}<br>
              ${order.customer.notes ? `Notatki: ${esc(order.customer.notes)}` : ''}</p>
            </div>
          </div>
          <div class="order-card-footer">
            <div class="order-total">${formatPrice(order.total)}</div>
          </div>
        </div>

        <div class="ticket-info" style="margin-top:20px">
          <i class="fa-solid fa-circle-info"></i>
          <strong>Status płatności:</strong>
          ${order.status === 'oplacone' ? 'Płatność zweryfikowana. Przekażemy numer przesyłki na tickecie po wysyłce.'
            : order.status === 'wyslane' ? 'Zamówienie zostało wysłane! Sprawdź Discorda na numer przesyłki.'
            : order.status === 'dostarczone' ? 'Zamówienie dostarczone. Dziękujemy za zakupy!'
            : 'Oczekujemy na płatność. Przelej krypto na adres z ekranu płatności, a następnie utwórz ticket na Discordzie z numerem zamówienia i TXID, aby potwierdzić płatność.'}
        </div>

        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
          <a href="${DISCORD_URL}" target="_blank" class="btn btn-primary"><i class="fa-brands fa-discord"></i> Zgłoś płatność na Discordzie</a>
          <a href="/" class="btn btn-secondary"><i class="fa-solid fa-house"></i> Wróć do sklepu</a>
        </div>
      </div>
    `;

    window._ticketOrder = order;
  } catch (e) {
    app.innerHTML = `
      <section class="page-hero">
        <h1>Nie znaleziono zamówienia</h1>
        <p>Sprawdź czy numer zamówienia jest poprawny.</p>
        <a href="/" class="btn btn-primary btn-lg" style="margin-top:20px">Wróć na stronę główną</a>
      </section>
    `;
  }
}

// ============ ADMIN ============
let adminTab = 'dashboard';
let adminEditId = null;

function adminFetch(path, options = {}) {
  return api(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'x-admin-pass': adminPassValue
    }
  });
}

async function renderAdmin() {
  // Weryfikuj przechowywane hasło na serwerze
  if (adminSession && adminPassValue) {
    try {
      await api('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassValue })
      });
    } catch (e) {
      adminSession = false;
      adminPassValue = '';
      sessionStorage.removeItem('dymek_admin');
      localStorage.removeItem('dymek_admin_pass');
    }
  }

  if (!adminSession) {
    app.innerHTML = `
      <div class="admin-login">
        <h2><i class="fa-solid fa-user-shield" style="color:var(--primary-light);margin-right:8px"></i> Panel admina</h2>
        <div class="form-group">
          <label>Hasło administratora</label>
          <input type="password" id="adminPassInput" placeholder="Wpisz hasło">
        </div>
        <button class="btn btn-primary full-width" onclick="adminLogin()"><i class="fa-solid fa-lock-open"></i> Zaloguj się</button>
        <p id="adminLoginError" style="color:var(--danger);font-size:13px;margin-top:12px;display:none">Nieprawidłowe hasło</p>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="admin-panel">
      <div class="admin-header">
        <h2><i class="fa-solid fa-user-shield" style="color:var(--primary-light);margin-right:8px"></i> Panel administratora</h2>
        <button class="btn btn-secondary" onclick="adminLogout()"><i class="fa-solid fa-right-from-bracket"></i> Wyloguj</button>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="dashboard" onclick="switchAdminTab('dashboard')"><i class="fa-solid fa-chart-line"></i> Dashboard</button>
        <button class="admin-tab" data-tab="products" onclick="switchAdminTab('products')"><i class="fa-solid fa-box"></i> Produkty</button>
        <button class="admin-tab" data-tab="add" onclick="switchAdminTab('add')"><i class="fa-solid fa-plus"></i> Dodaj produkt</button>
        <button class="admin-tab" data-tab="discounts" onclick="switchAdminTab('discounts')"><i class="fa-solid fa-tags"></i> Znizki</button>
        <button class="admin-tab" data-tab="orders" onclick="switchAdminTab('orders')"><i class="fa-solid fa-truck"></i> Zamowienia</button>
        <button class="admin-tab" data-tab="tickets" onclick="switchAdminTab('tickets')"><i class="fa-solid fa-ticket"></i> Tickety</button>
        <button class="admin-tab" data-tab="settings" onclick="switchAdminTab('settings')"><i class="fa-solid fa-gear"></i> Ustawienia</button>
      </div>

      <div id="adminContent"></div>
    </div>
  `;

  adminTab = 'dashboard';
  adminContentRender();
}

async function adminLogin() {
  const pass = document.getElementById('adminPassInput').value;
  const errEl = document.getElementById('adminLoginError');
  if (errEl) errEl.style.display = 'none';
  if (!pass) {
    if (errEl) errEl.style.display = 'block';
    return;
  }
  try {
    await api('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    adminPassValue = pass;
    localStorage.setItem('dymek_admin_pass', pass);
    adminSession = true;
    sessionStorage.setItem('dymek_admin', '1');
    renderAdmin();
  } catch (e) {
    if (errEl) errEl.style.display = 'block';
    adminPassValue = '';
  }
}

function adminLogout() {
  adminSession = false;
  sessionStorage.removeItem('dymek_admin');
  renderAdmin();
}

function switchAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });
  adminContentRender();
}

async function adminContentRender() {
  const container = document.getElementById('adminContent');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-muted);padding:20px">Wczytywanie...</p>';

  if (adminTab === 'dashboard') {
    try {
      const stats = await adminFetch('/api/stats');
      const orders = await adminFetch('/api/orders');
      const tickets = await adminFetch('/api/tickets');

      const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

      container.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.pendingOrders}</div>
            <div class="stat-label">Oczekujące zamówienia</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalOrders}</div>
            <div class="stat-label">Wszystkie zamówienia</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalProducts}</div>
            <div class="stat-label">Produkty w sklepie</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatPrice(stats.totalRevenue)}</div>
            <div class="stat-label">Przychód (bez anulowanych)</div>
          </div>
        </div>

        <h3 style="font-size:18px;font-weight:700;margin:24px 0 12px"><i class="fa-solid fa-clock" style="color:var(--primary-light)"></i> Ostatnie zamówienia</h3>
        <div class="orders-list">
          ${recentOrders.map(renderOrderCard).join('') || '<p style="color:var(--text-muted)">Brak zamówień</p>'}
        </div>

        <h3 style="font-size:18px;font-weight:700;margin:24px 0 12px"><i class="fa-solid fa-ticket" style="color:var(--primary-light)"></i> Ostatnie tickety (${tickets.length})</h3>
        <div class="discounts-list">
          ${tickets.slice().reverse().map(t => `
            <div class="discount-card">
              <i class="fa-solid fa-ticket" style="color:var(--primary-light);font-size:22px"></i>
              <div class="discount-info">
                <h4>${esc(t.subject)}</h4>
                <p>${esc((t.messages[t.messages.length-1]?.body || '').slice(0, 80))} — ${new Date(t.createdAt).toLocaleString('pl-PL')}</p>
              </div>
              <span class="order-status ${t.status}">${esc(t.status)}</span>
            </div>`).join('') || '<p style="color:var(--text-muted)">Brak ticketów</p>'}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<p style="color:var(--danger)">Błąd ładowania dashboardu: ${esc(e.message)}</p>`;
    }
  } else if (adminTab === 'products' || adminTab === 'add') {
    renderAdminProducts(container);
  } else if (adminTab === 'discounts') {
    renderAdminDiscounts(container);
  } else if (adminTab === 'orders') {
    renderAdminOrders(container);
  } else if (adminTab === 'tickets') {
    renderAdminTickets(container);
  } else if (adminTab === 'settings') {
    renderAdminSettings(container);
  }
}

async function renderAdminProducts(container) {
  try {
    const list = await adminFetch('/api/products');
    const isAdd = adminTab === 'add';

    container.innerHTML = `
      <div class="admin-form" id="productForm">
        <div class="admin-form-title"><i class="fa-solid ${isAdd ? 'fa-plus' : 'fa-pen'}"></i> ${isAdd ? 'Dodaj nowy produkt' : 'Edytuj produkt'}</div>
        <input type="hidden" id="productId" value="${adminEditId || ''}">
        <div class="form-row">
          <div class="form-group">
            <label>Nazwa produktu *</label>
            <input type="text" id="pName" placeholder="Np. Vozol Gear 10000">
          </div>
          <div class="form-group">
            <label>Cena (zł) *</label>
            <input type="number" id="pPrice" step="0.01" min="0" placeholder="79.99">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kategoria *</label>
            <select id="pCategory">
              <option value="jednorazowki">Jednorazówki</option>
              <option value="pody">Pody</option>
              <option value="snusy">Snusy</option>
              <option value="liquidy">Liquidy</option>
              <option value="mody">Mody</option>
            </select>
          </div>
          <div class="form-group">
            <label>Znizka (%)</label>
            <input type="number" id="pDiscount" min="0" max="90" step="1" placeholder="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Krótki opis</label>
            <input type="text" id="pShortDesc" placeholder="Krótki opis pod nazwa">
          </div>
          <div class="form-group">
            <label>Plakietka (np. NOWOSC)</label>
            <input type="text" id="pBadge" placeholder="NOWOSC / PROMOCJA">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ikona produktu (Font Awesome)</label>
            <input type="text" id="pIcon" placeholder="np. fa-bolt (domyslnie fa-wind)">
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:24px">
            <label style="margin:0;display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="pFeatured" style="width:auto"> <span>Polecany na stronie glownej</span>
            </label>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="saveProduct()"><i class="fa-solid fa-floppy-disk"></i> ${isAdd ? 'Dodaj produkt' : 'Zapisz zmiany'}</button>
          ${adminEditId ? `<button class="btn btn-secondary" onclick="cancelEdit()"><i class="fa-solid fa-xmark"></i> Anuluj edycje</button>` : ''}
        </div>
      </div>

      <div class="admin-form-title" style="margin-top:32px"><i class="fa-solid fa-box"></i> Wszystkie produkty (${list.length})</div>
      <div class="admin-products-list">
        ${list.map(p => `
          <div class="admin-product-row">
            <div class="admin-product-icon"><i class="fa-solid ${p.icon || 'fa-wind'}"></i></div>
            <div class="admin-product-info">
              <h4>${esc(p.name)}</h4>
              <p>${esc(p.category)} — ${formatPrice(p.price)} ${p.discountPercent > 0 ? `<span style="color:var(--success)">(−${p.discountPercent}% → ${formatPrice(getEffectivePrice(p))})</span>` : ''}</p>
            </div>
            <div class="admin-product-actions">
              <button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`).join('') || '<p style="color:var(--text-muted)">Brak produktów — dodaj pierwszy!</p>'}
      </div>
    `;

    if (adminEditId) fillProductForm(list.find(p => p.id === adminEditId));
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger)">Błąd: ${esc(e.message)}</p>`;
  }
}

function fillProductForm(p) {
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('pName').value = p.name || '';
  document.getElementById('pPrice').value = p.price || '';
  document.getElementById('pCategory').value = p.category || 'jednorazowki';
  document.getElementById('pDiscount').value = p.discountPercent || 0;
  document.getElementById('pShortDesc').value = p.shortDesc || '';
  document.getElementById('pBadge').value = p.badge || '';
  document.getElementById('pIcon').value = p.icon || '';
  document.getElementById('pFeatured').checked = !!p.featured;
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const data = {
    name: document.getElementById('pName').value.trim(),
    price: parseFloat(document.getElementById('pPrice').value),
    category: document.getElementById('pCategory').value,
    discountPercent: parseInt(document.getElementById('pDiscount').value) || 0,
    shortDesc: document.getElementById('pShortDesc').value.trim(),
    badge: document.getElementById('pBadge').value.trim(),
    icon: document.getElementById('pIcon').value.trim() || 'fa-wind',
    featured: document.getElementById('pFeatured').checked
  };

  if (!data.name || !data.price || data.price <= 0) {
    toast('Podaj nazwe i poprawna cene', 'error');
    return;
  }

  try {
    if (id) {
      await adminFetch('/api/products/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      toast('Produkt zaktualizowany');
    } else {
      await adminFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      toast('Produkt dodany');
    }
    adminEditId = null;
    switchAdminTab('products');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function editProduct(id) {
  adminEditId = id;
  adminTab = 'add';
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'add'));
  renderAdminProducts(document.getElementById('adminContent'));
}

function cancelEdit() {
  adminEditId = null;
  switchAdminTab('products');
}

async function deleteProduct(id) {
  if (!confirm('Na pewno usunac ten produkt?')) return;
  try {
    await adminFetch('/api/products/' + id, { method: 'DELETE' });
    toast('Produkt usuniety');
    switchAdminTab('products');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ ADMIN ORDERS ============
async function renderAdminOrders(container) {
  try {
    const orders = await adminFetch('/api/orders');
    container.innerHTML = `
      <div class="admin-form">
        <div class="admin-form-title" style="margin-bottom:0"><i class="fa-solid fa-filter"></i> Filtr</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <input type="text" id="orderFilter" placeholder="Szukaj po ID, kliencie lub kontakcie..." oninput="filterOrders()" style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);outline:none">
        </div>
      </div>
      <div class="orders-list" id="ordersList">
        ${[...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(renderOrderCard).join('') || '<p style="color:var(--text-muted)">Brak zamówień</p>'}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger)">Błąd: ${esc(e.message)}</p>`;
  }
}

function renderOrderCard(order) {
  return `
    <div class="order-card" data-search="${esc((order.id + ' ' + order.customer?.name + ' ' + order.customer?.contact).toLowerCase())}">
      <div class="order-card-header">
        <div>${order.customer?.notes ? `<span class="order-id">${esc(order.customer.notes.slice(0, 40))}</span>` : ''}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="order-id">${esc(order.id)}</span>
          <span class="order-status ${order.status}">${esc(order.status)}</span>
        </div>
      </div>
      <div class="order-card-body">
        <div class="order-info-block">
          <h5>Produkty</h5>
          <div class="order-products">
            ${order.items.map(i => `<div>• ${esc(i.name)} × ${i.qty} — ${formatPrice(i.price * i.qty)}</div>`).join('')}
            ${order.discountPercent ? `<div style="color:var(--success)">Rabat: −${order.discountPercent}%</div>` : ''}
          </div>
        </div>
        <div class="order-info-block">
          <h5>Klient</h5>
          <p>${esc(order.customer?.name || '—')}<br>${esc(order.customer?.contact || '—')}</p>
        </div>
      </div>
      <div class="order-card-footer">
        <div>
          <div class="order-total">${formatPrice(order.total)}</div>
          <div style="font-size:12px;color:var(--text-muted)">${new Date(order.createdAt).toLocaleString('pl-PL')}</div>
        </div>
        <div class="order-actions">
          <button class="btn btn-success btn-sm" onclick="setOrderStatus('${order.id}', 'oplacone')">Oplacone</button>
          <button class="btn btn-secondary btn-sm" onclick="setOrderStatus('${order.id}', 'wyslane')">Wyslane</button>
          <button class="btn btn-primary btn-sm" onclick="setOrderStatus('${order.id}', 'dostarczone')">Dostarczone</button>
          <button class="btn btn-danger btn-sm" onclick="setOrderStatus('${order.id}', 'anulowane')">Anuluj</button>
        </div>
      </div>
    </div>
  `;
}

async function setOrderStatus(id, status) {
  const labels = { oplacone: 'oplacone', wyslane: 'wyslane', dostarczone: 'dostarczone', anulowane: 'anulowane' };
  try {
    await adminFetch('/api/orders/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: labels[status] })
    });
    toast('Status zmieniony na: ' + labels[status]);
    adminContentRender();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function filterOrders() {
  const q = document.getElementById('orderFilter').value.toLowerCase();
  document.querySelectorAll('.order-card').forEach(card => {
    card.style.display = card.getAttribute('data-search').includes(q) ? '' : 'none';
  });
}

// ============ ADMIN DISCOUNTS ============
async function renderAdminDiscounts(container) {
  try {
    const discounts = await adminFetch('/api/discounts');
    container.innerHTML = `
      <div class="admin-form">
        <div class="admin-form-title"><i class="fa-solid fa-tags"></i> Stworz znizke</div>
        <div class="form-row">
          <div class="form-group">
            <label>Kod znizki *</label>
            <input type="text" id="dCode" placeholder="np. DYMEK10" style="text-transform:uppercase">
          </div>
          <div class="form-group">
            <label>Procent znizki *</label>
            <input type="number" id="dPercent" min="1" max="90" placeholder="10">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Data waznosci (opcjonalnie)</label>
            <input type="datetime-local" id="dExpires">
          </div>
          <div class="form-group">
            <label>Maksymalna liczba uzyc (0 = bez limitu)</label>
            <input type="number" id="dMaxUses" min="0" placeholder="0">
          </div>
        </div>
        <button class="btn btn-primary" onclick="createDiscount()"><i class="fa-solid fa-plus"></i> Utworz znizke</button>
      </div>

      <div class="admin-form-title" style="margin-top:32px"><i class="fa-solid fa-list"></i> Aktywne znizki (${discounts.length})</div>
      <div class="discounts-list">
        ${discounts.map(d => `
          <div class="discount-card">
            <div class="discount-percent">−${d.percent}%</div>
            <div class="discount-info">
              <h4>${esc(d.code)}</h4>
              <p>
                Uzycia: ${d.usedCount || 0}${d.maxUses ? ' / ' + d.maxUses : ''}
                ${d.expiresAt ? ' · Wazny do: ' + new Date(d.expiresAt).toLocaleString('pl-PL') : ' · Bez terminu'}
              </p>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteDiscount('${d.id}')"><i class="fa-solid fa-trash"></i> Usun</button>
          </div>`).join('') || '<p style="color:var(--text-muted)">Brak aktywnych znizek. Stworz pierwsza powyzej.</p>'}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger)">Błąd: ${esc(e.message)}</p>`;
  }
}

async function createDiscount() {
  const code = document.getElementById('dCode').value.trim().toUpperCase();
  const percent = parseInt(document.getElementById('dPercent').value);
  const expiresAt = document.getElementById('dExpires').value || null;
  const maxUses = parseInt(document.getElementById('dMaxUses').value) || 0;

  if (!code || !percent || percent < 1 || percent > 90) {
    toast('Podaj kod i procent (1-90)', 'error');
    return;
  }

  try {
    await adminFetch('/api/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, percent, expiresAt, maxUses, usedCount: 0 })
    });
    toast('Znizka utworzona! Kod: ' + code);
    adminContentRender();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteDiscount(id) {
  if (!confirm('Usunac ta znizke?')) return;
  try {
    await adminFetch('/api/discounts/' + id, { method: 'DELETE' });
    toast('Znizka usunieta');
    adminContentRender();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ ADMIN TICKETS ============
async function renderAdminTickets(container) {
  try {
    const tickets = await adminFetch('/api/tickets');
    container.innerHTML = `
      <div class="admin-form-title"><i class="fa-solid fa-ticket"></i> Tickety (${tickets.length})</div>
      <div class="discounts-list">
        ${tickets.slice().reverse().map(t => `
          <div class="discount-card" style="cursor:pointer" onclick="toggleTicket('${t.id}')">
            <i class="fa-solid fa-ticket" style="color:var(--primary-light);font-size:22px"></i>
            <div class="discount-info">
              <h4>${esc(t.subject)}</h4>
              <p>${esc((t.messages[t.messages.length-1]?.body || '').slice(0, 100))}${(t.messages[t.messages.length-1]?.body || '').length > 100 ? '...' : ''}</p>
              <p style="font-size:11px;color:var(--text-muted)">${t.orderId ? 'Zamowienie: ' + esc(t.orderId.slice(0, 8)) : 'Bez zamowienia'} · ${new Date(t.createdAt).toLocaleString('pl-PL')}</p>
            </div>
            <div id="ticketOpen-${t.id}" style="display:none"></div>
            <span class="order-status ${t.status}">${esc(t.status)}</span>
          </div>
          <div id="ticketThread-${t.id}" style="display:none;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px;margin-top:-8px">
            ${t.messages.map(m => `
              <div style="margin-bottom:12px">
                <div style="font-size:12px;font-weight:700;color:var(--primary-light)">${esc(m.author)} <span style="color:var(--text-muted);font-weight:400">· ${new Date(m.createdAt).toLocaleString('pl-PL')}</span></div>
                <div style="font-size:14px;white-space:pre-wrap">${esc(m.body)}</div>
              </div>`).join('')}
            <div class="form-group" style="margin-top:12px">
              <textarea id="ticketReply-${t.id}" placeholder="Odpowiedz klientowi..." style="min-height:60px"></textarea>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="replyTicket('${t.id}')"><i class="fa-solid fa-paper-plane"></i> Odpowiedz</button>
              <button class="btn btn-success btn-sm" onclick="closeTicket('${t.id}')"><i class="fa-solid fa-check"></i> Zamknij</button>
            </div>
          </div>`).join('') || '<p style="color:var(--text-muted)">Brak ticketow</p>'}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger)">Błąd: ${esc(e.message)}</p>`;
  }
}

function toggleTicket(id) {
  const thread = document.getElementById('ticketThread-' + id);
  thread.style.display = thread.style.display === 'none' ? 'block' : 'none';
  const openDiv = document.getElementById('ticketOpen-' + id);
  openDiv.style.display = 'none';
}

async function replyTicket(id) {
  const body = document.getElementById('ticketReply-' + id).value.trim();
  if (!body) return toast('Napisz odpowiedz', 'error');
  try {
    await api('/api/tickets/' + id + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, author: 'Admin' })
    });
    toast('Odpowiedz wyslana');
    renderAdminTickets(document.getElementById('adminContent'));
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function closeTicket(id) {
  try {
    await adminFetch('/api/tickets/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'zamkniety' })
    });
    toast('Ticket zamkniety');
    renderAdminTickets(document.getElementById('adminContent'));
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ ADMIN SETTINGS ============
async function renderAdminSettings(container) {
  let wallet = '';
  try {
    const w = await adminFetch('/api/wallet');
    wallet = w.value || '';
  } catch (e) {}

  container.innerHTML = `
    <div class="admin-form" style="max-width:560px">
      <div class="admin-form-title"><i class="fa-solid fa-wallet"></i> Adres portfela krypto</div>
      <div class="form-group">
        <label>Adres (BTC/USDT lub dowolny)</label>
        <input type="text" id="walletInput" value="${esc(wallet)}" placeholder="bc1q...">
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Ten adres bedzie wyswietlany klientom jako miejsce platnosci krypto po zlozeniu zamowienia.</p>
      <button class="btn btn-primary" onclick="saveWallet()"><i class="fa-solid fa-floppy-disk"></i> Zapisz adres</button>
    </div>

    <div class="admin-form" style="max-width:560px">
      <div class="admin-form-title"><i class="fa-solid fa-shield-halved"></i> Bezpieczenstwo</div>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:16px">
        Haslo admina jest ustawione na stale w pliku <code>server.js</code> (zmienna <code>ADMIN_PASS</code>).<br>
        Aktualnie w sesji: zalogowany.
      </p>
    </div>
  `;
}

async function saveWallet() {
  const address = document.getElementById('walletInput').value.trim();
  try {
    await adminFetch('/api/wallet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    toast('Adres portfela zapisany');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', () => { closeCart(); openCheckout(); });
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('mainNav').classList.toggle('open');
  });

  document.getElementById('searchBtn').addEventListener('click', openSearch);
  document.getElementById('closeSearch').addEventListener('click', closeSearch);
  document.getElementById('searchInput').addEventListener('input', searchProducts);
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); searchProducts(); }
  });
  document.getElementById('searchOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('searchOverlay')) closeSearch();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCart();
      closeCheckout();
      closeSearch();
    }
  });

  cartUpdateUI();
  router();
  window.addEventListener('popstate', router);
});

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}