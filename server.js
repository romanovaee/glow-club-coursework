const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'glowclub_db',
    password: 'melk2008.r',
    port: 5432,
});

pool.connect()
    .then(() => console.log('✅ БАЗА ДАННЫХ ПОДКЛЮЧЕНА!'))
    .catch(err => console.error('❌ ОШИБКА БАЗЫ:', err.message));

app.use(cors());
app.use(express.json());

// Указываем, где лежат файлы стилей и картинок (внутри вложенной папки)
app.use(express.static(__dirname));

// Отдаем главную страницу из вложенной папки
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'index.html'));
});

// API товаров
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен! Открой в браузере: http://localhost:${PORT}`);
});