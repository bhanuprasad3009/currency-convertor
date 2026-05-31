// Currency Data Definition
const CURRENCIES = {
  USD: { name: "US Dollar", flag: "🇺🇸", symbol: "$" },
  INR: { name: "Indian Rupee", flag: "🇮🇳", symbol: "₹" },
  EUR: { name: "Euro", flag: "🇪🇺", symbol: "€" },
  GBP: { name: "British Pound", flag: "🇬🇧", symbol: "£" },
  JPY: { name: "Japanese Yen", flag: "🇯🇵", symbol: "¥" },
  AUD: { name: "Australian Dollar", flag: "🇦🇺", symbol: "A$" },
  CAD: { name: "Canadian Dollar", flag: "🇨🇦", symbol: "C$" },
  CNY: { name: "Chinese Yuan", flag: "🇨🇳", symbol: "¥" },
  SGD: { name: "Singapore Dollar", flag: "🇸🇬", symbol: "S$" },
  AED: { name: "UAE Dirham", flag: "🇦🇪", symbol: "د.إ" }
};

// Fallback rates (in case API is offline or rate-limited)
const FALLBACK_RATES = {
  USD: 1.0,
  INR: 83.25,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156.40,
  AUD: 1.51,
  CAD: 1.36,
  CNY: 7.24,
  SGD: 1.35,
  AED: 3.67
};

// App State Management
const state = {
  rates: {},
  lastUpdated: null,
  activeView: 'home',
  theme: 'dark'
};

// DOM Elements
const elements = {
  navHome: document.getElementById('nav-home'),
  navAbout: document.getElementById('nav-about'),
  logoLink: document.getElementById('logo-link'),
  homeView: document.getElementById('home-view'),
  aboutView: document.getElementById('about-view'),
  themeToggle: document.getElementById('theme-toggle'),
  amountInput: document.getElementById('amount'),
  amountPrefix: document.getElementById('amount-prefix'),
  amountError: document.getElementById('amount-error'),
  fromSelect: document.getElementById('from-currency'),
  toSelect: document.getElementById('to-currency'),
  swapBtn: document.getElementById('swap-currencies'),
  converterForm: document.getElementById('converter-form'),
  resultCard: document.getElementById('result-card'),
  resultFormula: document.getElementById('result-formula'),
  resultAmountVal: document.getElementById('result-amount-val'),
  resultAmountCode: document.getElementById('result-amount-code'),
  resultMeta: document.getElementById('result-meta'),
  statsBaseCurrency: document.getElementById('stats-base-currency'),
  ratesListContainer: document.getElementById('rates-list-container')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRouting();
  populateDropdowns();
  setupEventListeners();
  fetchExchangeRates();
});

// Theme Logic
function initTheme() {
  const savedTheme = localStorage.getItem('apexconvert_theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(themeName) {
  state.theme = themeName;
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('apexconvert_theme', themeName);
  
  // Update toggle button icon styling
  if (themeName === 'light') {
    elements.themeToggle.innerHTML = `
      <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
  } else {
    elements.themeToggle.innerHTML = `
      <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
      </svg>
    `;
  }
}

// Router for SPA
function initRouting() {
  const handleRoute = () => {
    const hash = window.location.hash || '#home';
    
    if (hash === '#about') {
      state.activeView = 'about';
      elements.navHome.classList.remove('active');
      elements.navAbout.classList.add('active');
      elements.homeView.classList.remove('active');
      elements.aboutView.classList.add('active');
    } else {
      state.activeView = 'home';
      elements.navAbout.classList.remove('active');
      elements.navHome.classList.add('active');
      elements.aboutView.classList.remove('active');
      elements.homeView.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Execute once on load
}

// Populate From/To Dropdowns
function populateDropdowns() {
  const fragmentFrom = document.createDocumentFragment();
  const fragmentTo = document.createDocumentFragment();

  Object.entries(CURRENCIES).forEach(([code, details]) => {
    const optFrom = document.createElement('option');
    optFrom.value = code;
    optFrom.textContent = `${details.flag} ${code} - ${details.name}`;
    if (code === 'USD') optFrom.selected = true;
    fragmentFrom.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = code;
    optTo.textContent = `${details.flag} ${code} - ${details.name}`;
    if (code === 'EUR') optTo.selected = true;
    fragmentTo.appendChild(optTo);
  });

  elements.fromSelect.appendChild(fragmentFrom);
  elements.toSelect.appendChild(fragmentTo);
  
  // Set initial currency prefix
  updateAmountPrefix();
}

// Update prefix label based on selected currency
function updateAmountPrefix() {
  const code = elements.fromSelect.value;
  elements.amountPrefix.textContent = CURRENCIES[code]?.symbol || '$';
}

// Event Listeners
function setupEventListeners() {
  // Theme toggle
  elements.themeToggle.addEventListener('click', () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Currency Selectors change
  elements.fromSelect.addEventListener('change', () => {
    updateAmountPrefix();
    renderRatesSidebar();
    autoConvert();
  });
  elements.toSelect.addEventListener('change', () => {
    autoConvert();
  });

  // Amount input events (live updates + validation)
  elements.amountInput.addEventListener('input', () => {
    validateAmount();
    autoConvert();
  });

  // Swap button
  elements.swapBtn.addEventListener('click', () => {
    // Spin icon animation
    elements.swapBtn.classList.add('rotated');
    setTimeout(() => elements.swapBtn.classList.remove('rotated'), 500);

    // Swap values
    const temp = elements.fromSelect.value;
    elements.fromSelect.value = elements.toSelect.value;
    elements.toSelect.value = temp;

    // Trigger visual changes
    updateAmountPrefix();
    renderRatesSidebar();
    autoConvert();
  });

  // Form submission
  elements.converterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateAmount()) {
      performConversion();
    }
  });
}

// Fetch Rates from API or Cache
async function fetchExchangeRates() {
  const CACHE_KEY = 'apexconvert_rates_data';
  const CACHE_TIME_KEY = 'apexconvert_rates_timestamp';
  const ONE_HOUR = 60 * 60 * 1000; // ms

  const cachedRates = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
  const now = Date.now();

  if (cachedRates && cachedTime && (now - cachedTime < ONE_HOUR)) {
    state.rates = JSON.parse(cachedRates);
    state.lastUpdated = new Date(parseInt(cachedTime));
    onRatesReady();
    return;
  }

  try {
    // Show skeleton loader in popular rates
    renderSidebarSkeletons();
    
    // We use a base USD rates endpoint as it's the standard for key-less endpoints
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    if (data && data.rates) {
      state.rates = data.rates;
      state.lastUpdated = new Date();
      
      // Save cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.rates));
      localStorage.setItem(CACHE_TIME_KEY, now.toString());
      
      onRatesReady();
    } else {
      throw new Error('API returned invalid format');
    }
  } catch (error) {
    console.warn('API error, falling back to local static rates:', error);
    state.rates = FALLBACK_RATES;
    state.lastUpdated = new Date();
    onRatesReady();
  }
}

function renderSidebarSkeletons() {
  elements.ratesListContainer.innerHTML = Array(5).fill(0).map(() => `
    <div class="rate-row skeleton-pulse">Loading rates...</div>
  `).join('');
}

function onRatesReady() {
  renderRatesSidebar();
  performConversion();
}

// Render the Sidebar containing rates relative to selected "From" Currency
function renderRatesSidebar() {
  const baseCode = elements.fromSelect.value;
  elements.statsBaseCurrency.textContent = baseCode;
  
  if (!state.rates[baseCode]) return;
  
  // Calculate relative rates since API endpoint yields rates relative to USD
  const baseRateToUSD = state.rates[baseCode]; // e.g. how many baseCode per 1 USD
  
  let rowsHtml = '';
  
  Object.keys(CURRENCIES).forEach(code => {
    if (code === baseCode) return; // Skip matching source
    
    // rate_relative = rate_target_to_usd / rate_base_to_usd
    const targetRateToUSD = state.rates[code];
    if (!targetRateToUSD) return;
    
    const relativeRate = targetRateToUSD / baseRateToUSD;
    const details = CURRENCIES[code];
    
    rowsHtml += `
      <div class="rate-row">
        <span class="rate-currency">
          <span class="currency-flag-emoji">${details.flag}</span>
          <span>1 ${baseCode} = ${code}</span>
        </span>
        <span class="rate-value">${formatRate(relativeRate)}</span>
      </div>
    `;
  });
  
  elements.ratesListContainer.innerHTML = rowsHtml;
}

// Format Rate decimals cleanly
function formatRate(rate) {
  if (rate >= 1000) return rate.toFixed(1);
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(6);
}

// Validate inputs
function validateAmount() {
  const val = parseFloat(elements.amountInput.value);
  if (isNaN(val) || val <= 0) {
    elements.amountInput.classList.add('error');
    elements.amountError.style.display = 'block';
    return false;
  } else {
    elements.amountInput.classList.remove('error');
    elements.amountError.style.display = 'none';
    return true;
  }
}

// Perform live conversion when amount/select values change
function autoConvert() {
  if (validateAmount()) {
    performConversion(true);
  } else {
    elements.resultCard.classList.remove('active');
  }
}

// Core Conversion Calculation
function performConversion(isLive = false) {
  const fromCode = elements.fromSelect.value;
  const toCode = elements.toSelect.value;
  const amount = parseFloat(elements.amountInput.value);
  
  if (isNaN(amount) || amount <= 0) return;
  if (!state.rates[fromCode] || !state.rates[toCode]) return;
  
  // Conversion Logic:
  // Convert from fromCode -> USD, then USD -> toCode
  // rate = rate_to_usd_for_target / rate_to_usd_for_source
  const rateFromUSD = state.rates[fromCode];
  const rateToUSD = state.rates[toCode];
  
  const conversionRate = rateToUSD / rateFromUSD;
  const finalAmount = amount * conversionRate;
  
  // Format Results
  const fromSymbol = CURRENCIES[fromCode]?.symbol || '';
  const toSymbol = CURRENCIES[toCode]?.symbol || '';
  
  elements.resultFormula.textContent = `1 ${fromCode} = ${formatRate(conversionRate)} ${toCode}`;
  elements.resultAmountVal.textContent = finalAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  elements.resultAmountCode.textContent = toCode;
  
  // Last Updated format
  const dateOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const updatedString = state.lastUpdated 
    ? `Rates updated today at ${state.lastUpdated.toLocaleTimeString(undefined, dateOptions)}`
    : 'Rates updated just now';
    
  elements.resultMeta.textContent = updatedString;
  
  // Show Card
  elements.resultCard.classList.add('active');
}
