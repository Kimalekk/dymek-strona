// ===== DYMEK.XYZ — FRONTEND SHOP ROUTER & LOGIC =====

const API_BASE = '/api';

// Stan aplikacji
const state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('dymek_cart') || '[]'),
  currentCategory: null,
  searchQuery: '',
  walletAddress: 'bc1qxyzcryptoexampleaddress1234567890'
};

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', async () => {
  initEventListeners();
  await fetchWalletAddress();
  await loadProducts();
  handleRouting();

  window.addEventListener('popstate', handleRouting);
});

// Pobieranie publicznego portfela
async function fetchWalletAddress() {
  try {
    const res = await fetch(`${API_BASE}/wallet-public`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        state.walletAddress = data.address;
      }
    }
  } catch (err) {
    console.error('Błąd pobierania portfela:', err);
  }
}

// Pobieranie produktów
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (res.ok) {
      state.products = await res.json();
    }
  } catch (err) {
    console.error('Błąd ładowania produktów:', err);
  }
}

// Inicjalizacja zdarzeń UI
function initEventListeners() {
  const cartBtn = document.getElementById('cartBtn');
  const closeCart = document.getElementById('closeCart');
  const cartOverlay = document.getElementById('cartOverlay');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (cartBtn) cartBtn.addEventListener('click', toggleCart);
  if (closeCart) closeCart.addEventListener('click', toggleCart);
  if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);
  if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

  const searchBtn = document.getElementById('searchBtn');
  const closeSearch = document.getElementById('closeSearch');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');

  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (closeSearch) closeSearch.addEventListener('click', closeSearchModal);
  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearchModal();
    });
  }
  if (searchInput) searchInput.addEventListener('input', handleSearchInput);

  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('active'));
  }

  // Przechwytywanie kliknięć dla SPA Routera
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.origin === window.location.origin && !link.getAttribute('target')) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        handleRouting();
      }
    }
  });

  updateCartUI();
}

// Precyzyjny Router SPA
function handleRouting() {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
  const app = document.getElementById('app');
  if (!app) return;

  if (path.startsWith('/kategoria/')) {
    const parts = path.split('/');
    const category = parts[2] ? decodeURIComponent(parts[2]) : null;
    
    if (category) {
      state.currentCategory = category;
      renderProductsView(category);
      return;
    }
  }

  if (path === '/kontakt') {
    renderContactView();
  } else if (path === '/regulamin') {
    renderTermsView();
  } else {
    state.currentCategory = null;
    renderHomeView();
  }
}

// Strona Główna
function renderHomeView() {
  const app = document.getElementById('app');
  
  const categoriesHtml = `
    <section class="hero-section">
      <h2>Witamy w <span>dymek.xyz</span></h2>
      <p>Najlepsze e-papierosy, jednorazówki, snusy i liquidy w jednym miejscu.</p>
    </section>

    <section class="categories-grid">
      <a href="/kategoria/jednorazowki" class="category-card">
        <i class="fa-solid fa-bolt"></i>
        <h3>Jednorazówki</h3>
        <p>Wygodne i gotowe do użycia.</p>
      </a>
      <a href="/kategoria/pody" class="category-card">
        <i class="fa-solid fa-plug"></i>
        <h3>Pody</h3>
        <p>Kompaktowe systemy wielorazowe.</p>
      </a>
      <a href="/kategoria/snusy" class="category-card">
        <i class="fa-solid fa-layer-group"></i>
        <h3>Snusy</h3>
        <p>Mocne woreczki nikotynowe.</p>
      </a>
      <a href="/kategoria/liquidy" class="category-card">
        <i class="fa-solid fa-flask"></i>
        <h3>Liquidy</h3>
        <p>Szeroki wybór smaków i mocy.</p>
      </a>
      <a href="/kategoria/mody" class="category-card">
        <i class="fa-solid fa-microchip"></i>
        <h3>Mody</h3>
        <p>Zaawansowane urządzenia.</p>
      </a>
    </section>

    <section class="featured-products">
      <h3>Wyróżnione produkty</h3>
      <div class="products-grid">
        ${renderProductsGrid(state.products.filter(p => p.featured))}
      </div>
    </section>
  `;

  app.innerHTML = categoriesHtml;
  bindProductEvents();
}

// Widok Kategorie
function renderProductsView(category) {
  const app = document.getElementById('app');
  
  // Dopasowanie bez względu na wielkość liter
  const filtered = state.products.filter(p => 
    (p.category || '').toLowerCase() === category.toLowerCase()
  );
  
  const title = category.charAt(0).toUpperCase() + category.slice(1);

  app.innerHTML = `
    <div class="category-header">
      <h2>Kategoria: <span>${title}</span></h2>
    </div>
    <div class="products-grid">
      ${filtered.length ? renderProductsGrid(filtered) : '<p class="no-products" style="padding: 40px 0; text-align: center;">Brak produktów w tej kategorii.</p>'}
    </div>
  `;

  bindProductEvents();
}

function renderProductsGrid(products) {
  if (!products || !products.length) return '';
  return products.map(p => `
    <div class="product-card">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <div class="product-icon"><i class="fa-solid ${p.icon || 'fa-box'}"></i></div>
      <h4>${p.name}</h4>
      <p class="product-desc">${p.shortDesc || ''}</p>
      <div class="product-footer">
        <span class="price">${p.price ? p.price.toFixed(2) : '0.00'} zł</span>
        <button class="btn btn-primary add-to-cart-btn" data-id="${p.id}">
          <i class="fa-solid fa-cart-plus"></i> Dodaj
        </button>
      </div>
    </div>
  `).join('');
}

function bindProductEvents() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      addToCart(id);
    });
  });
}

function addToCart(id) {
  const product = state.products.find(p => String(p.id) === String(id));
  if (!product) return;

  const existing = state.cart.find(item => String(item.id) === String(id));
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...product, qty: 1 });
  }

  saveCart();
  updateCartUI();
  toggleCart(true);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => String(item.id) !== String(id));
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('dymek_cart', JSON.stringify(state.cart));
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');

  const totalCount = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = state.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  if (cartCount) cartCount.textContent = totalCount;
  if (cartTotal) cartTotal.textContent = `${totalPrice.toFixed(2)} zł`;

  if (cartItems) {
    if (state.cart.length === 0) {
      cartItems.innerHTML = '<p class="empty-cart-msg">Twój koszyk jest pusty</p>';
    } else {
      cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-info">
            <strong>${item.name}</strong>
            <small>${item.qty} x ${item.price.toFixed(2)} zł</small>
          </div>
          <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">&times;</button>
        </div>
      `).join('');
    }
  }
}

function toggleCart(open) {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer || !overlay) return;

  if (typeof open === 'boolean') {
    drawer.classList.toggle('active', open);
    overlay.classList.toggle('active', open);
  } else {
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
  }
}

async function handleCheckout() {
  if (state.cart.length === 0) {
    alert('Twój koszyk jest pusty!');
    return;
  }

  const total = state.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.cart, total: total })
    });

    if (res.ok) {
      const orderData = await res.json();
      state.cart = [];
      saveCart();
      updateCartUI();
      toggleCart(false);
      showOrderSuccessModal(orderData);
    } else {
      alert('Błąd podczas składania zamówienia.');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Wystąpił błąd połączenia z serwerem.');
  }
}

function showOrderSuccessModal(orderData) {
  const totalAmount = orderData.total ? orderData.total.toFixed(2) : '0.00';
  const orderId = orderData.id || orderData._id || 'OK';

  const modalHtml = `
    <div class="cart-overlay active" id="orderModalOverlay"></div>
    <div class="modal-dialog active">
      <div class="modal-content">
        <div class="modal-header">
          <i class="fa-solid fa-circle-check text-success" style="font-size: 2.5rem; color: #10b981;"></i>
          <h3>Zamówienie złożone!</h3>
          <p>Numer Twojego zamówienia: <strong class="badge-order">${orderId}</strong></p>
        </div>

        <div class="payment-box">
          <span>Do zapłaty:</span>
          <strong class="payment-amount">${totalAmount} zł</strong>
        </div>

        <h4>Wybierz metodę płatności:</h4>

        <div class="payment-methods">
          <div class="method-card active">
            <i class="fa-brands fa-bitcoin"></i>
            <div>
              <strong>Kryptowaluty</strong>
              <small>USDT, BTC, ETH, LTC — anonimowo</small>
            </div>
          </div>
          <div class="method-card">
            <i class="fa-solid fa-ticket"></i>
            <div>
              <strong>Inna metoda (ticket)</strong>
              <small>Ustalimy na tickecie np. BLIK, przelew</small>
            </div>
          </div>
        </div>

        <div class="wallet-container">
          <label>Adres portfela (skopiuj dokładnie):</label>
          <div class="wallet-input-group">
            <input type="text" readonly value="${state.walletAddress}" id="walletAddressInput">
            <button class="btn-copy" id="copyWalletBtn" title="Kopiuj">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </div>

        <ol class="instructions-list">
          <li>Skopiuj adres portfela i <strong>przelej dokładnie ${totalAmount} zł</strong> (w przeliczeniu na BTC/USDT).</li>
          <li>Nie wysyłaj <strong>mniej ani więcej</strong> niż wymagana kwota.</li>
          <li>Po wykonaniu przelewu utwórz <strong>ticket na Discordzie</strong> z numerem zamówienia i TXID (hash transakcji), aby potwierdzić płatność.</li>
        </ol>

        <a href="https://discord.gg/dymek" target="_blank" rel="noopener" class="btn btn-discord-full">
          <i class="fa-brands fa-discord"></i> Potwierdź płatność na Discordzie
        </a>

        <button class="close-modal-btn" id="closeOrderModalBtn">Zamknij</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('copyWalletBtn').addEventListener('click', () => {
    const input = document.getElementById('walletAddressInput');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert('Skopiowano adres portfela!');
  });

  const closeModal = () => {
    const overlay = document.getElementById('orderModalOverlay');
    const dialog = document.querySelector('.modal-dialog');
    if (overlay) overlay.remove();
    if (dialog) dialog.remove();
  };

  document.getElementById('closeOrderModalBtn').addEventListener('click', closeModal);
  document.getElementById('orderModalOverlay').addEventListener('click', closeModal);
}

function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  if (overlay) overlay.classList.add('active');
  if (input) input.focus();
}

function closeSearchModal() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.classList.remove('active');
}

function handleSearchInput(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;

  if (!query) {
    resultsContainer.innerHTML = '<p class="search-hint">Wpisz nazwę produktu, aby szukać...</p>';
    return;
  }

  const filtered = state.products.filter(p => 
    p.name.toLowerCase().includes(query) || (p.shortDesc || '').toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    resultsContainer.innerHTML = '<p class="search-hint">Brak wyników wyszukiwania.</p>';
    return;
  }

  resultsContainer.innerHTML = filtered.map(p => `
    <div class="search-result-item" onclick="location.href='/kategoria/${p.category}'">
      <strong>${p.name}</strong>
      <span>${p.price.toFixed(2)} zł</span>
    </div>
  `).join('');
}

function renderContactView() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <h2>Kontakt</h2>
      <p>Masz pytania? Skontaktuj się z nami bezpośrednio na naszym serwerze Discord!</p>
      <a href="https://discord.gg/dymek" target="_blank" class="btn btn-discord-full" style="max-width: 300px; margin-top: 20px;">
        <i class="fa-brands fa-discord"></i> Dołącz do Discorda
      </a>
    </div>
  `;
}

function renderTermsView() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <h2>Regulamin</h2>
      <p>1. Sklep przeznaczony jest wyłącznie dla osób pełnoletnich (18+).</p>
      <p>2. Wszystkie płatności realizowane są przez kryptowaluty lub ustalane na ticketach.</p>
      <p>3. Do każdego zamówienia dołączany jest indywidualny identyfikator przesyłki.</p>
    </div>
  `;
}
