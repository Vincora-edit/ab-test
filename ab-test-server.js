#!/usr/bin/env node
/**
 * AB Test API Server
 * Простой сервер для управления A/B тестами
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const DATA_FILE = path.join(__dirname, 'ab-tests-data.json');

// Загрузка данных
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
    return { tests: [] };
}

// Сохранение данных
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving data:', e);
        return false;
    }
}

// CORS headers
function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Парсинг JSON из request
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Создание сервера
const server = http.createServer(async (req, res) => {
    setCORS(res);

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url;
    console.log(`${req.method} ${url}`);

    // Serve static files
    if (req.method === 'GET' && !url.startsWith('/api/')) {
        let filePath = path.join(__dirname, url);

        if (url === '/') {
            filePath = path.join(__dirname, 'ab-test-admin.html');
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json'
            };

            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            fs.createReadStream(filePath).pipe(res);
            return;
        }
    }

    // API Routes
    if (url === '/api/tests' && req.method === 'GET') {
        // Получить все тесты
        const data = loadData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.tests));

    } else if (url === '/api/tests' && req.method === 'POST') {
        // Создать/обновить тест
        try {
            const test = await parseBody(req);
            const data = loadData();

            const index = data.tests.findIndex(t => t.id === test.id);
            if (index >= 0) {
                data.tests[index] = test;
            } else {
                data.tests.push(test);
            }

            saveData(data);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, test }));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }

    } else if (url.match(/^\/api\/tests\/[^\/]+$/) && req.method === 'PATCH') {
        // Обновить поле теста
        try {
            const id = url.split('/').pop();
            const updates = await parseBody(req);
            const data = loadData();

            const test = data.tests.find(t => t.id === id);
            if (test) {
                Object.assign(test, updates);
                saveData(data);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, test }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Test not found' }));
            }
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }

    } else if (url.match(/^\/api\/tests\/[^\/]+$/) && req.method === 'DELETE') {
        // Удалить тест
        const id = url.split('/').pop();
        const data = loadData();

        data.tests = data.tests.filter(t => t.id !== id);
        saveData(data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));

    } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 AB Test Server running on http://localhost:${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/ab-test-admin.html`);
    console.log(`📁 Client script: http://localhost:${PORT}/ab-test-client.js`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/tests`);
});
