# PowerShell скрипт для деплоя на Timeweb (Windows)
# Использование: .\deploy.ps1

Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
Write-Host "  Деплой генератора A/B тестов" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════" -ForegroundColor Blue

# Проверка наличия файла
if (-not (Test-Path "ab-test-generator.html")) {
    Write-Host "✗ Файл ab-test-generator.html не найден!" -ForegroundColor Red
    exit 1
}

# Загрузка переменных из .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
} else {
    Write-Host "✗ Файл .env не найден!" -ForegroundColor Red
    Write-Host "Создайте файл .env на основе .env.example" -ForegroundColor Yellow
    exit 1
}

# Проверка наличия необходимых переменных
if (-not $TIMEWEB_HOST -or -not $TIMEWEB_USER -or -not $TIMEWEB_PATH) {
    Write-Host "✗ Не найдены переменные окружения!" -ForegroundColor Red
    Write-Host "Проверьте файл .env" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Файл найден" -ForegroundColor Green
Write-Host "Host: $TIMEWEB_HOST" -ForegroundColor Blue
Write-Host "User: $TIMEWEB_USER" -ForegroundColor Blue
Write-Host "Path: $TIMEWEB_PATH" -ForegroundColor Blue

$DEPLOY_METHOD = if ($env:DEPLOY_METHOD) { $env:DEPLOY_METHOD } else { "scp" }

if ($DEPLOY_METHOD -eq "scp") {
    Write-Host "Загрузка через SCP..." -ForegroundColor Blue

    $port = if ($TIMEWEB_PORT) { $TIMEWEB_PORT } else { 22 }
    $destination = "${TIMEWEB_USER}@${TIMEWEB_HOST}:${TIMEWEB_PATH}/ab-test-generator.html"

    # Используем scp (должен быть установлен OpenSSH на Windows)
    scp -P $port ab-test-generator.html $destination

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Файл успешно загружен!" -ForegroundColor Green
        Write-Host "Доступен по адресу: https://${TIMEWEB_HOST}/ab-test-generator.html" -ForegroundColor Green
    } else {
        Write-Host "✗ Ошибка при загрузке" -ForegroundColor Red
        exit 1
    }

} elseif ($DEPLOY_METHOD -eq "ftp") {
    Write-Host "Загрузка через FTP..." -ForegroundColor Blue

    if (-not $TIMEWEB_PASSWORD) {
        Write-Host "✗ Для FTP требуется TIMEWEB_PASSWORD в .env" -ForegroundColor Red
        exit 1
    }

    # WinSCP или встроенный FTP клиент
    $ftpUri = "ftp://${TIMEWEB_HOST}${TIMEWEB_PATH}/ab-test-generator.html"
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($TIMEWEB_USER, $TIMEWEB_PASSWORD)

    try {
        $webclient.UploadFile($ftpUri, "ab-test-generator.html")
        Write-Host "✓ Файл успешно загружен через FTP!" -ForegroundColor Green
        Write-Host "Доступен по адресу: https://${TIMEWEB_HOST}/ab-test-generator.html" -ForegroundColor Green
    } catch {
        Write-Host "✗ Ошибка при загрузке: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
Write-Host "Деплой завершен!" -ForegroundColor Green
