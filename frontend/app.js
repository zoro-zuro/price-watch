// State Management
let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let currentView = 'search';
let isLoginMode = true;
let chartInstance = null;

// Pagination State
let allResults = [];
let currentPage = 1;
const RESULTS_PER_PAGE = 8;

// DOM Elements
const authNav = document.getElementById('auth-nav');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const loginOpenBtn = document.getElementById('login-open-btn');
const authModal = document.getElementById('auth-modal');
const chartModal = document.getElementById('chart-modal');
const detailsModal = document.getElementById('details-modal');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const modalTitle = document.getElementById('modal-title');
const closeBtns = document.querySelectorAll('.close-btn');

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const paginationContainer = document.getElementById('pagination');
const loading = document.getElementById('loading');
const searchView = document.getElementById('search-view');
const watchlistView = document.getElementById('watchlist-view');
const watchlistResults = document.getElementById('watchlist-results');
const navSearchBtn = document.getElementById('nav-search-btn');
const navWatchlistBtn = document.getElementById('nav-watchlist-btn');

// Details Elements
const detailsTitle = document.getElementById('details-title');
const aiSummaryContent = document.getElementById('ai-summary-content');
const reviewsContent = document.getElementById('reviews-content');

// Initialization
function init() {
    updateAuthUI();
    setupEventListeners();
}

function updateAuthUI() {
    if (currentUser) {
        userEmailSpan.textContent = currentUser.email;
        logoutBtn.style.display = 'inline-flex';
        loginOpenBtn.style.display = 'none';
        navWatchlistBtn.style.display = 'inline-flex';
    } else {
        userEmailSpan.textContent = '';
        logoutBtn.style.display = 'none';
        loginOpenBtn.style.display = 'inline-flex';
        navWatchlistBtn.style.display = 'none';
        switchView('search');
    }
}

function setupEventListeners() {
    navSearchBtn.addEventListener('click', () => switchView('search'));
    navWatchlistBtn.addEventListener('click', () => switchView('watchlist'));
    
    loginOpenBtn.addEventListener('click', () => {
        isLoginMode = true;
        updateModalMode();
        authModal.style.display = 'block';
    });
    
    closeBtns.forEach(btn => btn.addEventListener('click', () => {
        authModal.style.display = 'none';
        chartModal.style.display = 'none';
        detailsModal.style.display = 'none';
    }));
    
    window.onclick = (event) => {
        if (event.target == authModal) authModal.style.display = 'none';
        if (event.target == chartModal) chartModal.style.display = 'none';
        if (event.target == detailsModal) detailsModal.style.display = 'none';
    };
    
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateModalMode();
    });
    
    authForm.addEventListener('submit', handleAuthSubmit);
    logoutBtn.addEventListener('click', handleLogout);
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
}

function updateModalMode() {
    modalTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
    authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Register';
    toggleAuth.innerHTML = isLoginMode 
        ? "Don't have an account? <a href='#'>Register</a>" 
        : "Already have an account? <a href='#'>Login</a>";
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            currentUser = data;
            authModal.style.display = 'none';
            authForm.reset();
            updateAuthUI();
        } else { alert(data.error || 'Authentication failed'); }
    } catch (err) { alert('Could not connect to server'); }
}

function handleLogout() {
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI();
}

function switchView(view) {
    currentView = view;
    searchView.style.display = view === 'search' ? 'block' : 'none';
    watchlistView.style.display = view === 'watchlist' ? 'block' : 'none';
    navSearchBtn.classList.toggle('active', view === 'search');
    navWatchlistBtn.classList.toggle('active', view === 'watchlist');
    if (view === 'watchlist') loadWatchlist();
}

// Search Logic with Pagination and Store Filter
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // Get selected stores
    const selectedStores = Array.from(document.querySelectorAll('input[name="store"]:checked'))
        .map(cb => cb.value);

    if (selectedStores.length === 0) return alert('Please select at least one store.');

    loading.style.display = 'block';
    searchResults.innerHTML = '';
    paginationContainer.innerHTML = '';
    
    try {
        const storeParams = selectedStores.join(',');
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&stores=${storeParams}`);
        allResults = await response.json();
        
        loading.style.display = 'none';
        if (allResults.length === 0) {
            searchResults.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No verified products found matching your criteria.</p>';
            return;
        }
        
        currentPage = 1;
        renderCurrentPage();
    } catch (err) {
        loading.style.display = 'none';
        alert('Failed to fetch search results');
    }
}

function renderCurrentPage() {
    searchResults.innerHTML = '';
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const itemsToShow = allResults.slice(startIndex, startIndex + RESULTS_PER_PAGE);
    
    itemsToShow.forEach(renderProductCard);
    renderPaginationButtons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationButtons() {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(allResults.length / RESULTS_PER_PAGE);
    
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderCurrentPage();
        });
        paginationContainer.appendChild(btn);
    }
}

function renderProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.title}" class="card-img" style="cursor: pointer">
        <div class="card-body">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem">
                <span class="store-tag">${product.store}</span>
                ${product.rating ? `<span class="rating-tag">★ ${product.rating}</span>` : ''}
            </div>
            <h3 class="card-title">${product.title}</h3>
            <div class="price-row">
                <span class="card-price">₹${product.price ? product.price.toLocaleString() : 'N/A'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem">
                <button class="btn btn-outline details-btn">AI Details</button>
                <button class="btn btn-primary watch-btn" ${!currentUser ? 'disabled' : ''}>
                    ${currentUser ? 'Watch' : 'Login'}
                </button>
                <a href="${product.url}" target="_blank" class="btn btn-outline visit-btn" style="grid-column: 1/-1; text-decoration: none; width: 100%">
                   Visit Official Site
                </a>
            </div>
        </div>
    `;
    
    card.querySelector('.card-img').addEventListener('click', () => window.open(product.url, '_blank'));
    card.querySelector('.details-btn').addEventListener('click', () => showProductDetails(product));
    
    const watchBtn = card.querySelector('.watch-btn');
    watchBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        try {
            const response = await fetch('/api/watch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
                body: JSON.stringify(product)
            });
            if (response.ok) { watchBtn.textContent = 'Watched'; watchBtn.disabled = true; }
        } catch (err) { alert('Failed to connect'); }
    });
    
    searchResults.appendChild(card);
}

// AI Details logic (same as before)
async function showProductDetails(product) {
    detailsTitle.textContent = product.title;
    aiSummaryContent.textContent = 'Analyzing reviews with Llama 3...';
    reviewsContent.innerHTML = 'Loading highlights...';
    detailsModal.style.display = 'block';
    try {
        const res = await fetch(`/api/product-details?url=${encodeURIComponent(product.url)}&title=${encodeURIComponent(product.title)}`);
        const data = await res.json();
        aiSummaryContent.innerHTML = data.summary.replace(/\n/g, '<br>').replace(/- /g, '&bull; ');
        if (data.reviews && data.reviews.length > 0) {
            reviewsContent.innerHTML = data.reviews.map(r => `<div class="review-card">"${r}"</div>`).join('');
        } else {
            reviewsContent.innerHTML = '<p style="color: var(--text-muted)">No specialized review text found for this item.</p>';
        }
    } catch (err) { aiSummaryContent.innerHTML = '<span style="color: #ef4444">API Overloaded. Try again.</span>'; }
}

// Watchlist Logic
async function loadWatchlist() {
    if (!currentUser) return;
    watchlistResults.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Syncing your list...</p>';
    try {
        const response = await fetch('/api/watched', {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        const items = await response.json();
        watchlistResults.innerHTML = '';
        if (items.length === 0) {
            watchlistResults.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Your list is currently empty.</p>';
            return;
        }
        items.forEach(renderWatchlistCard);
    } catch (err) { alert('Sync failed'); }
}

function renderWatchlistCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <img src="${item.product_image || 'https://via.placeholder.com/200'}" class="card-img" style="max-height: 150px">
        <div class="card-body">
            <span class="store-tag">${item.store}</span>
            <h3 class="card-title">${item.product_title}</h3>
            <div style="display: flex; gap: 0.5rem">
                <button class="btn btn-outline history-btn">History</button>
                <button class="btn btn-danger remove-btn">Remove</button>
            </div>
            <div class="alert-row">
                <input type="number" class="alert-input" value="${item.target_price || ''}" placeholder="Target Price">
                <button class="btn btn-primary alert-save-btn">Save</button>
            </div>
        </div>
    `;
    card.querySelector('.history-btn').addEventListener('click', () => showHistoryChart(item.product_url));
    card.querySelector('.remove-btn').addEventListener('click', () => removeFromWatchlist(item.id, card));
    card.querySelector('.alert-save-btn').addEventListener('click', () => updateAlert(item.id, card.querySelector('.alert-input').value));
    watchlistResults.appendChild(card);
}

async function removeFromWatchlist(id, card) {
    if (!confirm('Stop watching this item?')) return;
    const response = await fetch(`/api/watch/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
    });
    if (response.ok) card.remove();
}

async function updateAlert(id, price) {
    const response = await fetch(`/api/alert/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
        body: JSON.stringify({ target_price: price })
    });
    if (response.ok) alert('Price alert saved!');
}

async function showHistoryChart(url) {
    const response = await fetch(`/api/price-history?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    if (data.length === 0) return alert('Data is still building.');
    chartModal.style.display = 'block';
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => new Date(d.scraped_at).toLocaleDateString()),
            datasets: [{ 
                label: 'Price', 
                data: data.map(d => d.price), 
                borderColor: '#2563eb', 
                tension: 0.4, 
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

init();
