#!/usr/bin/env node
/**
 * API для деплоя через Node.js
 * Можно вызвать из вашего дашборда через HTTP запрос
 *
 * Использование:
 * node deploy-api.js
 *
 * Или как модуль:
 * const deploy = require('./deploy-api.js');
 * await deploy.uploadFile('ab-test-generator.html');
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

// Загрузка конфигурации из .env
require('dotenv').config();

const config = {
    host: process.env.TIMEWEB_HOST,
    port: parseInt(process.env.TIMEWEB_PORT || '22'),
    username: process.env.TIMEWEB_USER,
    password: process.env.TIMEWEB_PASSWORD,
    privateKey: process.env.TIMEWEB_SSH_KEY ? fs.readFileSync(process.env.TIMEWEB_SSH_KEY) : undefined,
    remotePath: process.env.TIMEWEB_PATH || '/public_html'
};

/**
 * Загрузка файла на сервер через SFTP
 */
async function uploadFile(localFile, remoteFileName = null) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        if (!remoteFileName) {
            remoteFileName = path.basename(localFile);
        }

        const remotePath = `${config.remotePath}/${remoteFileName}`;

        console.log('🚀 Начинаем деплой...');
        console.log(`📁 Локальный файл: ${localFile}`);
        console.log(`🌐 Сервер: ${config.host}`);
        console.log(`📂 Путь на сервере: ${remotePath}`);

        conn.on('ready', () => {
            console.log('✓ SSH соединение установлено');

            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }

                console.log('✓ SFTP сессия открыта');

                const readStream = fs.createReadStream(localFile);
                const writeStream = sftp.createWriteStream(remotePath);

                writeStream.on('close', () => {
                    console.log('✓ Файл успешно загружен!');
                    console.log(`🌍 Доступен по адресу: https://${config.host}/${remoteFileName}`);
                    conn.end();
                    resolve(remotePath);
                });

                writeStream.on('error', (err) => {
                    console.error('✗ Ошибка при загрузке:', err.message);
                    conn.end();
                    reject(err);
                });

                readStream.pipe(writeStream);
            });
        });

        conn.on('error', (err) => {
            console.error('✗ Ошибка SSH соединения:', err.message);
            reject(err);
        });

        // Подключение
        const authMethod = config.privateKey ?
            { privateKey: config.privateKey } :
            { password: config.password };

        conn.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            ...authMethod
        });
    });
}

/**
 * HTTP сервер для деплоя (можно вызвать из дашборда)
 */
function startServer(port = 3000) {
    const http = require('http');

    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.url === '/deploy' && req.method === 'POST') {
            try {
                const result = await uploadFile('ab-test-generator.html');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Файл успешно загружен',
                    url: `https://${config.host}/ab-test-generator.html`,
                    path: result
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(port, () => {
        console.log(`🚀 Сервер деплоя запущен на порту ${port}`);
        console.log(`📡 Вызов: POST http://localhost:${port}/deploy`);
    });
}

// CLI использование
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === 'server') {
        startServer(args[1] || 3000);
    } else {
        uploadFile('ab-test-generator.html')
            .then(() => process.exit(0))
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
    }
}

module.exports = { uploadFile, startServer };
