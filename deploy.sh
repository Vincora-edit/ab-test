#!/bin/bash
# Скрипт для автоматического деплоя на Timeweb
# Использование: ./deploy.sh

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  Деплой генератора A/B тестов${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Проверка наличия файла
if [ ! -f "ab-test-generator.html" ]; then
    echo -e "${RED}✗ Файл ab-test-generator.html не найден!${NC}"
    exit 1
fi

# Загружаем переменные окружения из .env если есть
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Проверяем наличие необходимых переменных
if [ -z "$TIMEWEB_HOST" ] || [ -z "$TIMEWEB_USER" ] || [ -z "$TIMEWEB_PATH" ]; then
    echo -e "${RED}✗ Не найдены переменные окружения!${NC}"
    echo "Создайте файл .env со следующими переменными:"
    echo "TIMEWEB_HOST=ваш-домен.ru"
    echo "TIMEWEB_USER=ваш-логин"
    echo "TIMEWEB_PATH=/public_html"
    echo "TIMEWEB_PORT=22"
    exit 1
fi

echo -e "${GREEN}✓ Файл найден${NC}"
echo -e "${BLUE}Host: $TIMEWEB_HOST${NC}"
echo -e "${BLUE}User: $TIMEWEB_USER${NC}"
echo -e "${BLUE}Path: $TIMEWEB_PATH${NC}"

# Метод деплоя можно выбрать через переменную DEPLOY_METHOD
DEPLOY_METHOD=${DEPLOY_METHOD:-"scp"}

if [ "$DEPLOY_METHOD" = "scp" ]; then
    echo -e "${BLUE}Загрузка через SCP...${NC}"
    scp -P ${TIMEWEB_PORT:-22} ab-test-generator.html ${TIMEWEB_USER}@${TIMEWEB_HOST}:${TIMEWEB_PATH}/ab-test-generator.html

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Файл успешно загружен!${NC}"
        echo -e "${GREEN}Доступен по адресу: https://${TIMEWEB_HOST}/ab-test-generator.html${NC}"
    else
        echo -e "${RED}✗ Ошибка при загрузке${NC}"
        exit 1
    fi

elif [ "$DEPLOY_METHOD" = "ftp" ]; then
    echo -e "${BLUE}Загрузка через FTP...${NC}"

    if [ -z "$TIMEWEB_PASSWORD" ]; then
        echo -e "${RED}✗ Для FTP требуется TIMEWEB_PASSWORD в .env${NC}"
        exit 1
    fi

    # Используем curl для FTP загрузки
    curl -T ab-test-generator.html \
         ftp://${TIMEWEB_HOST}${TIMEWEB_PATH}/ab-test-generator.html \
         --user ${TIMEWEB_USER}:${TIMEWEB_PASSWORD}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Файл успешно загружен через FTP!${NC}"
        echo -e "${GREEN}Доступен по адресу: https://${TIMEWEB_HOST}/ab-test-generator.html${NC}"
    else
        echo -e "${RED}✗ Ошибка при загрузке${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}Деплой завершен!${NC}"
