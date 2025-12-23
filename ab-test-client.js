/**
 * AB Test Client Script
 * Вставьте этот код в <head> вашего сайта ПЕРЕД Метрикой
 *
 * <script src="http://91.222.239.217:9999/ab-test-client.js"></script>
 */

(function() {
    'use strict';

    // Конфигурация
    var API_URL = 'http://91.222.239.217:9999/ab-tests-data.json';
    var COOKIE_PREFIX = 'ab_test_';
    var DEBUG = true;

    function log() {
        if (DEBUG && console && console.log) {
            console.log.apply(console, ['[AB Test]'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    // Cookie helpers
    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/';
    }

    function getCookie(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Hash function для распределения трафика
    function hashCode(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    function getUserId() {
        var userId = getCookie('ab_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            setCookie('ab_user_id', userId, 365);
        }
        return userId;
    }

    // Проверка UTM параметров
    function checkUTMConditions(conditions) {
        var params = new URLSearchParams(window.location.search);

        for (var i = 0; i < conditions.length; i++) {
            var condition = conditions[i];
            var value = params.get(condition.param);

            if (!value) return false;

            if (condition.operator === 'contains') {
                if (value.indexOf(condition.value) === -1) return false;
            } else if (condition.operator === 'equals') {
                if (value !== condition.value) return false;
            } else if (condition.operator === 'exists') {
                // Параметр должен существовать
                continue;
            }
        }

        return true;
    }

    // Выбор варианта теста
    function selectVariant(test, userId) {
        var cookieName = COOKIE_PREFIX + test.id;
        var savedVariant = getCookie(cookieName);

        if (savedVariant) {
            log('Variant from cookie:', savedVariant);
            return savedVariant;
        }

        // Распределение трафика
        var hash = hashCode(userId + test.id);
        var percentage = (hash % 100) + 1;

        var variant = percentage <= test.traffic_percent ? 'test' : 'original';

        setCookie(cookieName, variant, test.cookie_days || 30);
        log('New variant assigned:', variant, 'percentage:', percentage);

        return variant;
    }

    // Редирект
    function performRedirect(url) {
        log('Redirecting to:', url);
        window.location.replace(url);
    }

    // Отправка в аналитику
    function sendAnalytics(testId, variant) {
        // Ждем загрузки Метрики
        var attempts = 0;
        var maxAttempts = 50;

        var interval = setInterval(function() {
            attempts++;

            // Яндекс.Метрика
            if (window.ym) {
                try {
                    // Найдем ID счетчика
                    for (var key in window) {
                        if (key.match(/^yaCounter\d+$/)) {
                            var counterId = key.replace('yaCounter', '');
                            window.ym(counterId, 'params', {
                                ab_test_id: testId,
                                ab_variant: variant
                            });
                            log('✓ Sent to Yandex.Metrika:', testId, variant);
                            break;
                        }
                    }
                } catch (e) {
                    log('⚠ Metrika error:', e);
                }
                clearInterval(interval);
            }

            // Roistat
            if (window.roistat && window.roistat.event) {
                try {
                    window.roistat.event.send('ab_test', {
                        test_id: testId,
                        variant: variant
                    });
                    log('✓ Sent to Roistat');
                } catch (e) {
                    log('⚠ Roistat error:', e);
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 100);
    }

    // Загрузка активных тестов с сервера
    function loadTests() {
        log('Loading tests from:', API_URL);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', API_URL, true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var tests = data.tests || data;
                    log('Loaded tests:', tests);
                    processTests(tests);
                } catch (e) {
                    log('Error parsing tests:', e);
                }
            } else {
                log('Error loading tests:', xhr.status);
            }
        };

        xhr.onerror = function() {
            log('Network error loading tests');
        };

        xhr.send();
    }

    // Нормализация URL (убираем trailing slash, пустой путь = "/")
    function normalizePath(path) {
        if (!path || path === '') return '/';
        if (path !== '/' && path.charAt(path.length - 1) === '/') {
            return path.slice(0, -1);
        }
        return path;
    }

    // Обработка тестов
    function processTests(tests) {
        var currentPath = normalizePath(window.location.pathname);
        var userId = getUserId();

        log('Current page:', currentPath);
        log('User ID:', userId);

        // Находим активный тест для текущей страницы
        for (var i = 0; i < tests.length; i++) {
            var test = tests[i];

            if (!test.active) continue;

            // Нормализуем URL тестов
            var originalUrl = normalizePath(test.original_url);
            var testUrl = normalizePath(test.test_url);

            // Проверяем URL (точное совпадение или contains)
            var isOriginal = false;
            var isTest = false;

            if (test.url_match === 'exact') {
                isOriginal = currentPath === originalUrl;
                isTest = currentPath === testUrl;
            } else {
                isOriginal = currentPath.indexOf(originalUrl) !== -1;
                isTest = currentPath.indexOf(testUrl) !== -1;
            }

            if (!isOriginal && !isTest) continue;

            log('Found matching test:', test.name);

            // Проверяем UTM условия
            if (test.utm_conditions && test.utm_conditions.length > 0) {
                if (!checkUTMConditions(test.utm_conditions)) {
                    log('UTM conditions not met, skipping test');
                    continue;
                }
            }

            // Выбираем вариант
            var variant = selectVariant(test, userId);

            // Определяем нужен ли редирект
            var needRedirect = false;
            var redirectUrl = '';

            if (variant === 'test' && isOriginal) {
                needRedirect = true;
                redirectUrl = testUrl;
            } else if (variant === 'original' && isTest) {
                needRedirect = true;
                redirectUrl = originalUrl;
            }

            if (needRedirect) {
                performRedirect(redirectUrl);
                return; // Редирект произойдет, дальше код не выполнится
            } else {
                // Пользователь уже на правильной странице
                sendAnalytics(test.id, variant);
            }

            break; // Обрабатываем только первый подходящий тест
        }
    }

    // Запуск при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTests);
    } else {
        loadTests();
    }

})();
