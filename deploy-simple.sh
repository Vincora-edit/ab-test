#!/bin/bash
# Простой деплой на Timeweb (аналогично вашему Docker примеру)

# Конфигурация - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
SSH_USER="ваш-логин"
SSH_HOST="ваш-домен.ru"  # или IP как 91.222.239.217
SSH_PORT="22"
REMOTE_PATH="/public_html"

LOCAL_FILE="ab-test-generator.html"
REMOTE_FILE="$REMOTE_PATH/ab-test-generator.html"

echo "═══════════════════════════════════════"
echo "  Деплой ab-test-generator.html"
echo "═══════════════════════════════════════"

# Проверка наличия файла
echo ""
echo "Проверка файла..."
if [ ! -f "$LOCAL_FILE" ]; then
    echo "✗ Файл $LOCAL_FILE не найден!"
    exit 1
fi
echo "✓ Файл найден: $LOCAL_FILE"

# Копирование на сервер через SCP
echo ""
echo "Копирование на production сервер..."
echo "Сервер: $SSH_USER@$SSH_HOST"

scp -P $SSH_PORT "$LOCAL_FILE" "$SSH_USER@$SSH_HOST:$REMOTE_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Файл успешно загружен!"

    # Проверка на сервере
    echo ""
    echo "Проверка файла на сервере..."
    ssh -p $SSH_PORT "$SSH_USER@$SSH_HOST" "ls -lh $REMOTE_FILE"

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Проверка успешна!"
        echo ""
        echo "═══════════════════════════════════════"
        echo "  ДЕПЛОЙ ЗАВЕРШЕН!"
        echo "═══════════════════════════════════════"
        echo ""
        echo "Файл доступен по адресу:"
        echo "https://$SSH_HOST/ab-test-generator.html"
    fi
else
    echo ""
    echo "✗ Ошибка при копировании"
    exit 1
fi
