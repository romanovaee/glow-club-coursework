const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Подключение к базе
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'glowclub_db',
    password: 'melk2008.r', // Твой пароль
    port: 5432,
});

pool.connect()
    .then(() => console.log('✅ БАЗА ДАННЫХ ПОДКЛЮЧЕНА!'))
    .catch(err => console.error('❌ ОШИБКА БАЗЫ:', err.message));

app.use(cors());
app.use(express.json());

// Раздаем файлы из текущей папки (где лежат index.html и папка assets)
app.use(express.static(__dirname));

// Отдаем главную страницу
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API ДЛЯ ТОВАРОВ ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

// --- API ДЛЯ СОХРАНЕНИЯ ЗАКАЗОВ ---
app.post('/api/orders', async (req, res) => {
    const { customer, phone, email, city, address, postcode, delivery, payment, items, total } = req.body;
    
    // Начинаем транзакцию (чтобы заказ и его товары сохранились вместе)
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Создаем сам заказ в таблице orders
        const orderNumber = 'GC-' + Date.now().toString().slice(-8);
        const orderQuery = `
            INSERT INTO orders (order_number, customer_name, phone, email, city, address, postcode, delivery_method, payment_method, total_amount, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Принят') 
            RETURNING id`;
        const orderValues = [orderNumber, customer, phone, email, city, address, postcode, delivery, payment, total];
        const orderResult = await client.query(orderQuery, orderValues);
        const orderId = orderResult.rows[0].id;

        // 2. Сохраняем каждый товар из заказа в таблицу order_items
        for (let item of items) {
            const itemQuery = `
                INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                VALUES ($1, $2, $3, $4)`;
            await client.query(itemQuery, [orderId, item.id, item.qty, item.price]);
        }

        await client.query('COMMIT'); // Подтверждаем транзакцию
        res.json({ success: true, orderNumber });
    } catch (err) {
        await client.query('ROLLBACK'); // Откатываем, если что-то пошло не так
        console.error(err);
        res.status(500).json({ error: 'Ошибка при сохранении заказа' });
    } finally {
        client.release();
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен! Открой в браузере: http://localhost:${PORT}`);
});