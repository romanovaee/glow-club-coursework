// 1. Сначала объявляем функции для работы с localStorage
const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';

const get = key => {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
};

const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// 2. Теперь безопасно используем их для переменных
let products = [];
let cart = get('glow-cart'), fav = get('glow-fav');

// --- ЗАГРУЗКА ТОВАРОВ ИЗ БАЗЫ ДАННЫХ ---
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        const dataFromDB = await response.json();
        
        // Преобразуем поле image_url из БД в img, которое ждет твой сайт
        products = dataFromDB.map(p => ({ ...p, img: p.image_url }));

        // После загрузки данных запускаем отрисовку интерфейса
        updateCounts();
        renderAllProducts();
        renderProduct();
        renderCart();
        
        if (typeof renderCheckout === 'function') renderCheckout();
    } catch (error) {
        console.error("Ошибка загрузки товаров:", error);
    }
}

// Запускаем загрузку
fetchProducts();

// --- ОСТАЛЬНАЯ ЛОГИКА САЙТА ---

function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2300);
}

function updateCounts() {
    document.querySelectorAll('#cart-count').forEach(x => x.textContent = cart.reduce((s, i) => s + i.qty, 0));
    document.querySelectorAll('#fav-count').forEach(x => x.textContent = fav.length);
}

function addCart(id) {
    const item = cart.find(x => x.id === id);
    if (item) item.qty++;
    else cart.push({id, qty: 1});
    set('glow-cart', cart);
    updateCounts();
    renderCart();
    toast('Добавлено в сумку ✳');
}

function toggleFav(id) {
    fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id];
    set('glow-fav', fav);
    updateCounts();
    renderAllProducts();
    toast(fav.includes(id) ? 'Сохранили в избранное ♡' : 'Удалили из избранного');
}

function card(p) {
    return `<article class="product-card"><a class="product-image" href="product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}" loading="lazy"><span class="product-tag">${p.tag}</span></a><button class="heart ${fav.includes(p.id) ? 'active' : ''}" onclick="toggleFav(${p.id})" aria-label="В избранное">${fav.includes(p.id) ? '♥' : '♡'}</button><div class="product-info"><div class="product-category">${p.type}</div><a href="product.html?id=${p.id}" class="product-name">${p.name}</a><div class="product-bottom"><span class="product-price">${money(p.price)}</span><button class="add-btn" onclick="addCart(${p.id})">+ В СУМКУ</button></div></div></article>`;
}

function renderAllProducts() {
    const home = document.getElementById('home-products');
    if (home) home.innerHTML = products.slice(0, 4).map(card).join('');

    const cat = document.getElementById('catalog-products');
    if (cat) renderCatalog();

    const favorites = document.getElementById('favorites-products');
    if (favorites) {
        const list = products.filter(p => fav.includes(p.id));
        favorites.innerHTML = list.length
            ? list.map(card).join('')
            : `<div class="empty-state" style="grid-column:1/-1"><h2>Пока здесь пусто ♡</h2><p>Сохраняй продукты, которые понравились, и возвращайся к ним позже.</p><a class="btn btn-dark" href="catalog.html">В каталог ↗</a></div>`;
    }
}

let activeCategory = 'Все';

function renderCatalog() {
    const cat = document.getElementById('catalog-products');
    if (!cat) return;
    
    // Сравниваем ID категории из базы данных с выбранной кнопкой
    let list = products.filter(p => activeCategory === 'Все' || String(p.category_id) === String(activeCategory));
    
    const sort = document.getElementById('sort-products')?.value;
    if (sort === 'low') list.sort((a, b) => a.price - b.price);
    if (sort === 'high') list.sort((a, b) => b.price - a.price);
    cat.innerHTML = list.map(card).join('');
}

function renderProduct() {
    const box = document.getElementById('product-detail');
    if (!box) return;
    const id = Number(new URLSearchParams(location.search).get('id')) || 1;
    const p = products.find(x => x.id === id) || products[0];
    if (!p) return; 
    
    document.title = p.name + ' — GLOW CLUB';
    box.innerHTML = `<div class="detail-image"><img src="${p.img}" alt="${p.name}"></div><div class="detail-copy"><p class="eyebrow">${p.category ? p.category.toUpperCase() : 'УХОД'} / ${p.type}</p><span class="product-tag">${p.tag}</span><h1>${p.name}</h1><div class="detail-price">${money(p.price)}</div><p>${p.description}</p><div class="detail-meta"><b>КАК ИСПОЛЬЗОВАТЬ</b><br>Нанеси небольшое количество средства согласно его назначению. Перед первым применением проверь индивидуальную переносимость.</div><div class="detail-actions"><button class="btn btn-dark" onclick="addCart(${p.id})">Добавить в сумку ↗</button><button class="detail-heart" onclick="toggleFav(${p.id});this.textContent=fav.includes(${p.id})?'♥':'♡'">${fav.includes(p.id) ? '♥' : '♡'}</button></div></div>`;
    
    const related = document.getElementById('related-products');
    if (related) related.innerHTML = products.filter(x => x.id !== p.id).slice(0, 4).map(card).join('');
}

function renderCart() {
    const box = document.getElementById('cart-items');
    if (!box) return;
    cart = cart.filter(i => products.some(p => p.id === i.id));

    if (!cart.length) {
        box.innerHTML = `<div class="empty-state"><h2>Сумка пока пустая ✳</h2><p>Самое время найти что-нибудь для своего настроения.</p><a class="btn btn-dark" href="catalog.html">Перейти в каталог ↗</a></div>`;
    } else {
        box.innerHTML = cart.map(i => {
            const p = products.find(x => x.id === i.id);
            return `<div class="cart-row"><img src="${p.img}" alt="${p.name}"><div><div class="product-category">${p.type}</div><h3>${p.name}</h3><p>${money(p.price)}</p><div class="quantity"><button onclick="changeQty(${p.id},-1)">−</button><b>${i.qty}</b><button onclick="changeQty(${p.id},1)">+</button></div></div><div><div class="cart-row-price">${money(p.price * i.qty)}</div><button class="remove-item" onclick="removeCart(${p.id})">×</button></div></div>`;
        }).join('');
    }

    const total = cart.reduce((s, i) => s + products.find(p => p.id === i.id).price * i.qty, 0);
    const subtotalEl = document.getElementById('subtotal');
    if (subtotalEl) {
        subtotalEl.textContent = money(total);
        document.getElementById('total').textContent = money(total);
        document.getElementById('shipping').textContent = total >= 4000 ? 'Бесплатно' : 'от 250 ₽';
    }
    set('glow-cart', cart);
    updateCounts();
}

function changeQty(id, d) {
    const i = cart.find(x => x.id === id);
    if (i) {
        i.qty += d;
        if (i.qty < 1) cart = cart.filter(x => x.id !== id);
        set('glow-cart', cart);
        renderCart();
    }
}

function removeCart(id) {
    cart = cart.filter(x => x.id !== id);
    set('glow-cart', cart);
    renderCart();
    toast('Удалено из сумки');
}

function setupQuiz() {
    const q = document.getElementById('routine-quiz');
    if (!q) return;

    const questions = [
        {title: 'Как ощущает себя твоя кожа?', opts: ['Сухая / стянутая', 'Комбинированная', 'Жирная / блестит', 'Нормальная / всё ок']},
        {title: 'Что хочется добавить в уход?', opts: ['Больше увлажнения', 'Свежесть и баланс', 'Сияние и ровный тон', 'Просто базовый уход']},
        {title: 'Какой у тебя ритм?', opts: ['Люблю 3–4 шага', 'Только самое нужное', 'Обожаю бьюти-ритуалы', 'Пока только начинаю']}
    ];

    let step = 0, answers = [];
    const title = document.getElementById('quiz-question'),
        opts = document.getElementById('quiz-options'),
        next = document.getElementById('quiz-next'),
        label = document.getElementById('quiz-step-label'),
        bar = document.getElementById('quiz-progress'),
        result = document.getElementById('quiz-result');

    function draw() {
        title.textContent = questions[step].title;
        label.textContent = `ШАГ 0${step + 1} / 03`;
        bar.style.width = ((step + 1) / 3 * 100) + '%';
        opts.innerHTML = questions[step].opts.map(x => `<button data-value="${x}">${x}</button>`).join('');
        next.disabled = true;
        opts.querySelectorAll('button').forEach(b => b.onclick = () => {
            opts.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            answers[step] = b.dataset.value;
            next.disabled = false;
        });
    }

    next.onclick = () => {
        if (step < 2) {
            step++;
            draw();
        } else {
            opts.hidden = true;
            next.hidden = true;
            title.hidden = true;
            result.hidden = false;
            result.innerHTML = `<h3>Твой glow-настрой найден ✳</h3><p>Начни с мягкого очищения, добавь увлажняющую сыворотку и не забывай о SPF днём. Выбирай комфортные текстуры и вводи новые продукты постепенно.</p><a href="catalog.html">Подобрать продукты в каталоге ↗</a>`;
        }
    };

    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    setupQuiz();

    document.querySelectorAll('#category-filters .filter').forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('#category-filters .filter').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        
        // Если нажали "Все продукты", передаем 'Все'. Иначе передаем ID категории (1, 2 или 3)
        const filterValue = b.dataset.filter;
        if (filterValue === 'Уход') activeCategory = 1;
        else if (filterValue === 'Макияж') activeCategory = 2;
        else if (filterValue === 'Тело') activeCategory = 3;
        else activeCategory = 'Все';
        
        renderCatalog();
    }));

    document.getElementById('sort-products')?.addEventListener('change', renderCatalog);

    document.querySelector('.menu-toggle')?.addEventListener('click', () => document.querySelector('.nav')?.classList.toggle('open'));

    document.getElementById('contact-form')?.addEventListener('submit', e => {
        e.preventDefault();
        e.target.reset();
        toast('Спасибо! Сообщение принято в демо-режиме ✳');
    });

    document.getElementById('newsletter-form')?.addEventListener('submit', e => {
        e.preventDefault();
        e.target.reset();
        toast('Ты теперь в клубе! ✳');
    });
});

function deliveryFee(method, subtotal) {
    return subtotal >= 4000 ? 0 : (method === 'Пункт выдачи' ? 250 : 350);
}

function renderCheckout() {
    const box = document.getElementById('order-items');
    if (!box) return;

    const subtotal = cart.reduce((s, i) => s + products.find(p => p.id === i.id).price * i.qty, 0);
    const method = document.querySelector('[name="delivery"]:checked')?.value || 'Курьер до двери';
    const fee = deliveryFee(method, subtotal);

    box.innerHTML = cart.length
        ? cart.map(i => {
            const p = products.find(x => x.id === i.id);
            return `<div class="order-item"><img src="${p.img}" alt="${p.name}"><span><b>${p.name}</b><small>${i.qty} × ${money(p.price)}</small></span><strong>${money(p.price * i.qty)}</strong></div>`;
        }).join('')
        : '<p class="checkout-disclaimer">Сумка пуста — добавь товары в каталог.</p>';

    const orderSubEl = document.getElementById('order-subtotal');
    if(orderSubEl) {
        orderSubEl.textContent = money(subtotal);
        document.getElementById('order-shipping').textContent = fee ? money(fee) : 'Бесплатно';
        document.getElementById('order-total').textContent = money(subtotal + fee);
    }

    const date = document.querySelector('[name="date"]');
    if (date) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        date.min = d.toISOString().slice(0, 10);
        if (!date.value) date.value = date.min;
    }
}

function setupCheckout() {
    const form = document.getElementById('order-form');
    if (!form) return;

    if (!cart.length) {
        form.innerHTML = '<div class="empty-state"><h2>Сумка пока пустая ✳</h2><p>Добавь продукты перед оформлением заказа.</p><a class="btn btn-dark" href="catalog.html">В каталог ↗</a></div>';
        renderCheckout();
        return;
    }

    document.querySelectorAll('[name="delivery"]').forEach(x => x.addEventListener('change', renderCheckout));

    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.reportValidity()) return;

        const fd = new FormData(form),
            items = cart.map(i => {
                const p = products.find(x => x.id === i.id);
                return {id: p.id, name: p.name, price: p.price, qty: i.qty, img: p.img};
            }),
            subtotal = items.reduce((s, i) => s + i.price * i.qty, 0),
            delivery = fd.get('delivery'),
            shipping = deliveryFee(delivery, subtotal),
            user = getCurrentUser(),
            orders = get('glow-orders');

        const order = {
            number: 'GC-' + Date.now().toString().slice(-8),
            createdAt: new Date().toLocaleString('ru-RU'),
            customer: fd.get('customer'),
            phone: fd.get('phone'),
            email: fd.get('email'),
            city: fd.get('city'),
            postcode: fd.get('postcode'),
            address: fd.get('address'),
            date: fd.get('date'),
            time: fd.get('time'),
            comment: fd.get('comment'),
            delivery,
            payment: fd.get('payment'),
            items,
            subtotal,
            shipping,
            total: subtotal + shipping,
            status: 'Принят (демо)',
            userEmail: (user?.email || fd.get('email')).toLowerCase()
        };

        orders.unshift(order);
        set('glow-orders', orders);
        cart = [];
        set('glow-cart', cart);
        updateCounts();

        form.hidden = true;
        document.querySelector('.order-summary').hidden = true;
        document.querySelector('.checkout-steps').hidden = true;

        const success = document.getElementById('order-success');
        success.hidden = false;
        success.innerHTML = `<p class="eyebrow">ORDER PLACED / THANK YOU</p><h2>ТВОЙ GLOW УЖЕ<br>СОБИРАЕТСЯ ✳</h2><p>Заказ <b>${order.number}</b> оформлен!<br>Получатель: ${escapeHtml(order.customer)} · ${escapeHtml(order.phone)}<br>Адрес: ${escapeHtml(order.city)}, ${escapeHtml(order.address)}<br>Доставка: ${escapeHtml(order.delivery)} · ${escapeHtml(order.date)}, ${escapeHtml(order.time)}<br>Оплата: ${escapeHtml(order.payment)}<br><b>К оплате: ${money(order.total)}</b></p><p>Заказ сохранён в этом браузере. В личном кабинете он появится при входе с тем же e-mail.</p><a class="btn btn-dark" href="account.html">В личный кабинет ↗</a> <a class="text-link" href="catalog.html">Продолжить покупки</a>`;

        window.scrollTo({top: 0, behavior: 'smooth'});
    });

    renderCheckout();
}

// --- АВТОРИЗАЦИЯ ---
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem('glow-users')) || [];
    } catch (e) {
        return [];
    }
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('glow-current-user'));
    } catch (e) {
        return null;
    }
}

function authMessage(msg) {
    toast(msg);
}

function setupAuth() {
    const reg = document.getElementById('register-form');
    if (reg) reg.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(reg),
            name = fd.get('name').trim(),
            email = fd.get('email').trim().toLowerCase(),
            password = fd.get('password'),
            password2 = fd.get('password2');

        if (password !== password2) {
            authMessage('Пароли не совпадают');
            return;
        }

        const users = getUsers();
        if (users.some(u => u.email === email)) {
            authMessage('Аккаунт с таким e-mail уже существует');
            return;
        }

        users.push({name, email, password});
        localStorage.setItem('glow-users', JSON.stringify(users));
        localStorage.setItem('glow-current-user', JSON.stringify({name, email}));
        location.href = 'account.html';
    });

    const login = document.getElementById('login-form');
    if (login) login.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(login),
            email = fd.get('email').trim().toLowerCase(),
            password = fd.get('password'),
            user = getUsers().find(u => u.email === email && u.password === password);

        if (!user) {
            authMessage('Неверный e-mail или пароль');
            return;
        }

        localStorage.setItem('glow-current-user', JSON.stringify({name: user.name, email: user.email}));
        location.href = 'account.html';
    });

    const panel = document.getElementById('account-panel');
    if (panel) {
        const user = getCurrentUser();
        if (!user) {
            panel.innerHTML = `<div class="empty-state"><h2>Сначала войди в клуб ✳</h2><p>Авторизуйся или создай аккаунт, чтобы открыть личный кабинет.</p><a class="btn btn-dark" href="login.html">Войти ↗</a> <a class="text-link" href="register.html">Регистрация</a></div>`;
        } else {
            panel.innerHTML = `<div class="account-top"><div class="account-user"><div class="account-avatar">${user.name.charAt(0).toUpperCase()}</div><div><h2>Привет, ${escapeHtml(user.name)}! ✳</h2><p>${escapeHtml(user.email)}</p></div></div><button class="logout-btn" id="logout-btn">Выйти из аккаунта ↗</button></div><div class="account-shortcuts"><a href="favorites.html"><span>♡</span>Избранное</a><a href="cart.html"><span>＋</span>Моя сумка</a><a href="catalog.html"><span>✳</span>Продолжить покупки</a></div><div class="account-info"><h3>История заказов</h3><div id="account-orders"></div></div><div class="account-info"><h3>Твой GLOW-профиль</h3><p>Аккаунт создан в демонстрационной версии сайта. Здесь можно перейти к избранному и корзине. История заказов и изменение профиля пока не подключены.</p></div>`;

            document.getElementById('logout-btn').onclick = () => {
                localStorage.removeItem('glow-current-user');
                location.href = 'index.html';
            };

            const ob = document.getElementById('account-orders');
            if (ob) {
                const os = get('glow-orders').filter(o => o.userEmail === user.email);
                ob.innerHTML = os.length
                    ? os.map(o => `<div class="saved-order"><div><b>${o.number}</b><small>${o.createdAt} · ${o.status}</small></div><strong>${money(o.total)}</strong><details><summary>Подробнее</summary><p>${o.items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join('<br>')}<br>Доставка: ${escapeHtml(o.delivery)} · ${escapeHtml(o.address)}<br>Оплата: ${escapeHtml(o.payment)}</p></details></div>`).join('')
                    : '<p class="account-order-empty">Пока заказов нет. Самое время выбрать что-нибудь красивое ✳</p>';
            }
        }
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupCheckout();
});