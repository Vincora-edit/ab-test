# Прямой деплой на Timeweb через SSH (аналогично вашему Docker деплою)
# Использование: .\deploy-timeweb-direct.ps1

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Деплой ab-test-generator.html" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

# Конфигурация - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
$SSH_USER = "ваш-логин"           # ваш SSH логин
$SSH_HOST = "ваш-домен.ru"        # ваш домен или IP (как 91.222.239.217 в примере)
$SSH_PORT = "22"                   # порт SSH
$REMOTE_PATH = "/public_html"      # путь на сервере

$LOCAL_FILE = "ab-test-generator.html"
$REMOTE_FILE = "$REMOTE_PATH/ab-test-generator.html"

# Проверка наличия файла
Write-Host "`nПроверка файла..." -ForegroundColor Yellow
if (-not (Test-Path $LOCAL_FILE)) {
    Write-Host "✗ Файл $LOCAL_FILE не найден!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Файл найден: $LOCAL_FILE" -ForegroundColor Green

# Копирование на сервер через SCP
Write-Host "`nКопирование на production сервер..." -ForegroundColor Yellow
Write-Host "Сервер: $SSH_USER@$SSH_HOST" -ForegroundColor Gray

$scpCommand = "scp -P $SSH_PORT `"$LOCAL_FILE`" ${SSH_USER}@${SSH_HOST}:${REMOTE_FILE}"
Write-Host "Команда: $scpCommand" -ForegroundColor Gray

try {
    & scp -P $SSH_PORT "$LOCAL_FILE" "${SSH_USER}@${SSH_HOST}:${REMOTE_FILE}"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Файл успешно загружен!" -ForegroundColor Green

        # Проверка на сервере
        Write-Host "`nПроверка файла на сервере..." -ForegroundColor Yellow
        & ssh -p $SSH_PORT "${SSH_USER}@${SSH_HOST}" "ls -lh $REMOTE_FILE"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✓ Проверка успешна!" -ForegroundColor Green
            Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
            Write-Host "  ДЕПЛОЙ ЗАВЕРШЕН!" -ForegroundColor Green
            Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
            Write-Host "`nФайл доступен по адресу:" -ForegroundColor White
            Write-Host "https://${SSH_HOST}/ab-test-generator.html" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "`n✗ Ошибка при копировании: $_" -ForegroundColor Red
    exit 1
}
