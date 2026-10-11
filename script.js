const WHATSAPP_NUMBER = '50496278653'; // ajusta si necesitas otro prefijo

let products = [];
const productsContainer = document.getElementById('products-container');
let cart = [];
let currentFilter = 'all';
let searchTerm = '';
let priceSort = 'default';
let decantFilter = 'all';

function formatPriceVal(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    const value = String(v).trim().replace(/[^0-9.,-]/g, '');
    if (!value) return 0;

    // Coma entre miles: 1,000 / 1,000.50. Punto decimal: 1000.50.
    const normalized = value.includes(',')
        ? value.replace(/,/g, '')
        : value;
    return parseFloat(normalized) || 0;
}

function formatPriceText(n) {
    return `L. ${Number(n).toLocaleString('en-US')}`;
}

function renderProducts() {
    productsContainer.innerHTML = '';
    const visibleProducts = products
        .map((product, index) => ({ product, index }))
        .filter(({ product }) => {
            const matchesCategory = currentFilter === 'all' || product.category === currentFilter;
            const searchableText = `${product.name || ''} ${product.description || ''}`.toLowerCase();
            const has5ml = formatPriceVal(product.price_5ml) > 0;
            const has10ml = formatPriceVal(product.price_10ml) > 0;
            const hasDecant = decantFilter === 'all'
                || (decantFilter === 'available' && (has5ml || has10ml))
                || (decantFilter === '5ml' && has5ml)
                || (decantFilter === '10ml' && has10ml);
            return matchesCategory && searchableText.includes(searchTerm) && hasDecant;
        });

    if (priceSort !== 'default') {
        visibleProducts.sort((a, b) => {
            const priceA = formatPriceVal(a.product.price_full);
            const priceB = formatPriceVal(b.product.price_full);
            return priceSort === 'high-low' ? priceB - priceA : priceA - priceB;
        });
    }

    visibleProducts.forEach(({ product, index }) => {
        const imgHtml = product.image
            ? `<button class="image-preview-btn" type="button" data-image="${product.image}" data-name="${product.name}"><img src="${product.image}" alt="Ver foto de ${product.name}" class="product-img"><span class="image-preview-label">Ver foto completa</span></button>`
            : '🧴';

        const priceFull = formatPriceVal(product.price_full ?? product.price);
        const price5 = formatPriceVal(product.price_5ml);
        const price10 = formatPriceVal(product.price_10ml);

        const presentationOptions = [
            { value: 'full', label: 'Sellado', price: priceFull },
            ...(price5 > 0 ? [{ value: '5ml', label: '5 ml', price: price5 }] : []),
            ...(price10 > 0 ? [{ value: '10ml', label: '10 ml', price: price10 }] : [])
        ];

        const availableLabels = presentationOptions
            .filter(option => option.price > 0)
            .map(option => option.value === 'full' ? 'Sellado' : option.label)
            .join(' · ');

        const presentationButtons = presentationOptions
            .filter(option => option.price > 0)
            .map(option => `
                <button class="presentation-option-btn" type="button" aria-pressed="false" data-index="${index}" data-presentation="${option.value}" data-price="${option.price}">
                    <span>${option.value === 'full' ? 'Bote sellado' : option.label}</span>
                    <strong>${formatPriceText(option.price)}</strong>
                </button>
            `)
            .join('');

        const card = document.createElement('div');
        card.classList.add('product-card');
        card.innerHTML = `
            <div class="product-image">${imgHtml}</div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description || ''}</p>
                <div class="product-price">Presentaciones disponibles:</div>
                <div class="presentations-labels">${availableLabels || 'Sellado'}</div>
                <div class="price-instruction">Precios 👇</div>
                <div class="presentation-actions">
                    ${presentationButtons}
                    <button class="presentation-confirm-btn" type="button" data-index="${index}" disabled>ACEPTAR</button>
                </div>
            </div>
        `;

        productsContainer.appendChild(card);
    });

    if (visibleProducts.length === 0) {
        productsContainer.innerHTML = '<p class="no-results">No encontramos perfumes con esos criterios.</p>';
    }
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    countEl.textContent = totalQty;
    const f = document.getElementById('floating-count');
    if (f) f.textContent = totalQty;
}

// Toast notifications (simple)
function showToast(message, timeout = 2000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, timeout);
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';

    let total = 0;

    cart.forEach(item => {
        const prod = products[item.index];
        const priceNum = item.price;
        total += priceNum * item.qty;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="info">
                <strong>${prod.name}</strong>
                <div style="opacity:0.7;">${prod.description || ''}</div>
                <div style="opacity:0.8;">Presentación: ${item.presentation}</div>
            </div>
            <div style="text-align:right;">
                <div>${formatPriceText(priceNum)}</div>
                <div class="qty-controls">
                    <button class="button qty-decrease" data-index="${item.index}" data-pres="${item.presentation}">-</button>
                    <span style="min-width:22px;display:inline-block;text-align:center;">${item.qty}</span>
                    <button class="button qty-increase" data-index="${item.index}" data-pres="${item.presentation}">+</button>
                </div>
                <div>
                    <button class="remove-btn" data-index="${item.index}" data-pres="${item.presentation}">Eliminar</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('cart-total').textContent = formatPriceText(total);
    updateCartCount();
}

function addToCart(index, presentation, price) {
    // usar index+presentation para diferenciar presentaciones
    const key = index + '::' + presentation;
    const existing = cart.find(i => i.key === key);
    if (existing) existing.qty += 1;
    else cart.push({ key, index, presentation, price, qty: 1 });
    renderCart();
    const prod = products[index];
    showToast(`${prod.name || 'Producto'} agregado al carrito`);
}

function changeQtyByKey(key, delta) {
    const item = cart.find(i => i.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) cart = cart.filter(i => i.key !== key);
    renderCart();
}

function removeByKey(key) {
    cart = cart.filter(i => i.key !== key);
    renderCart();
}

// Delegación: agregar desde productos
productsContainer.addEventListener('click', (e) => {
    const previewButton = e.target.closest('.image-preview-btn');
    if (previewButton) {
        openImagePreview(previewButton.dataset.image, previewButton.dataset.name);
        return;
    }

    const btn = e.target.closest('.presentation-option-btn');
    if (btn) {
        const actions = btn.closest('.presentation-actions');
        actions.querySelectorAll('.presentation-option-btn').forEach(optionButton => {
            optionButton.classList.remove('selected');
            optionButton.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
        actions.querySelector('.presentation-confirm-btn').disabled = false;
        return;
    }

    const confirmBtn = e.target.closest('.presentation-confirm-btn');
    if (!confirmBtn || confirmBtn.disabled) return;
    const selectedBtn = confirmBtn.closest('.presentation-actions').querySelector('.presentation-option-btn.selected');
    if (!selectedBtn) return;
    const index = parseInt(selectedBtn.dataset.index, 10);
    const presentation = selectedBtn.dataset.presentation;
    const price = formatPriceVal(selectedBtn.dataset.price);
    if (!price) return alert('Precio no disponible para la presentación seleccionada.');
    addToCart(index, presentation, price);
});

// Vista ampliada de cada perfume sin salir de la página
const imageModal = document.getElementById('image-modal');
const previewImage = document.getElementById('preview-image');
const previewName = document.getElementById('preview-name');
const closeImageModal = document.getElementById('close-image-modal');

function openImagePreview(image, name) {
    previewImage.src = image;
    previewImage.alt = name;
    previewName.textContent = name;
    imageModal.setAttribute('aria-hidden', 'false');
}

function closePreview() {
    imageModal.setAttribute('aria-hidden', 'true');
    previewImage.src = '';
}

closeImageModal.addEventListener('click', closePreview);
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) closePreview();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
});

// Delegación para el botón Aceptar: confirma selección y muestra feedback breve
// (el botón 'Aceptar' fue eliminado; la selección se confirma al agregar al carrito)

// Carrito (modal)
const cartButton = document.getElementById('cart-button');
const cartModal = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart');

cartButton.addEventListener('click', () => {
    cartModal.setAttribute('aria-hidden', 'false');
    renderCart();
});

closeCartBtn.addEventListener('click', () => {
    cartModal.setAttribute('aria-hidden', 'true');
});

cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) cartModal.setAttribute('aria-hidden', 'true');
});

// Delegación dentro del carrito
document.getElementById('cart-items').addEventListener('click', (e) => {
    const dec = e.target.closest('.qty-decrease');
    const inc = e.target.closest('.qty-increase');
    const rem = e.target.closest('.remove-btn');
    if (dec) {
        const parent = dec.closest('.cart-item');
        const key = cart.find(i => i.index == dec.dataset.index && i.presentation == dec.dataset.pres)?.key;
        if (key) changeQtyByKey(key, -1);
    }
    if (inc) {
        const key = cart.find(i => i.index == inc.dataset.index && i.presentation == inc.dataset.pres)?.key;
        if (key) changeQtyByKey(key, 1);
    }
    if (rem) {
        const key = cart.find(i => i.index == rem.dataset.index && i.presentation == rem.dataset.pres)?.key;
        if (key) removeByKey(key);
    }
});

// Checkout por WhatsApp
document.getElementById('checkout-button').addEventListener('click', () => {
    if (cart.length === 0) return alert('El carrito está vacío.');

    let total = 0;
    let message = 'Hola! Quisiera hacer el siguiente pedido:%0A';

    cart.forEach(item => {
        const prod = products[item.index];
        const linePrice = Math.round(item.price);
        total += linePrice * item.qty;
        message += `- ${item.qty} x ${prod.name} (${item.presentation}) — ${formatPriceText(linePrice)}%0A`;
    });

    message += `%0ATotal: ${formatPriceText(Math.round(total))}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
});

// Cargar productos desde products.json
async function init() {
    try {
        const res = await fetch('products.json');
        if (res.ok) products = await res.json();
    } catch (err) {
        console.warn('No se pudo cargar products.json, usando lista vacía.', err);
    }
    renderProducts();

    // Inicializar filtros UI
    const filterBtns = document.querySelectorAll('.catalog-filter .filter-btn');
    filterBtns.forEach(b => {
        b.addEventListener('click', () => {
            setFilter(b.dataset.filter);
        });
    });

    document.getElementById('product-search').addEventListener('input', (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        renderProducts();
    });

    document.getElementById('price-sort').addEventListener('change', (event) => {
        priceSort = event.target.value;
        renderProducts();
    });

    document.getElementById('decant-filter').addEventListener('change', (event) => {
        decantFilter = event.target.value;
        renderProducts();
    });

    // Click en tarjetas de categoría para filtrar
    const catCards = document.querySelectorAll('.category-card');
    catCards.forEach(card => {
        card.addEventListener('click', () => {
            const cat = card.dataset.category || 'all';
            setFilter(cat);
            // scroll to catalog
            document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
        });
    });
    // marcar botón 'Todos' por defecto
    setFilter('all');
    // floating cart
    const floatingBtn = document.getElementById('floating-cart');
    const floatingCount = document.getElementById('floating-count');
    function updateFloatingVisibility() {
        if (!floatingBtn) return;
        const shouldShow = window.scrollY > 50;
        floatingBtn.classList.toggle('show', shouldShow);
    }
    window.addEventListener('scroll', updateFloatingVisibility);
    updateFloatingVisibility();

    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => {
            cartModal.setAttribute('aria-hidden', 'false');
            renderCart();
        });
    }
}

init();

function setFilter(filter) {
    currentFilter = filter;
    // actualizar estado visual
    document.querySelectorAll('.catalog-filter .filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
    });
    renderProducts();
}