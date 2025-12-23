# Быстрый деплой на production сервер
# Использование: .\deploy-prod.ps1

$ErrorActionPreference = "Stop"

$SSH_KEY = "~/.ssh/neurodirectolog_deploy"
$SSH_HOST = "root@91.222.239.217"
$REMOTE_PATH = "/root/neurodirectolog/client/src/pages"
$FILE = "ab-test-generator.html"

Write-Host "🚀 Deploying $FILE to production..." -ForegroundColor Cyan

# Копирование файла
scp -i $SSH_KEY -o StrictHostKeyChecking=no $FILE "${SSH_HOST}:${REMOTE_PATH}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy successful!" -ForegroundColor Green

    # Проверка
    ssh -i $SSH_KEY $SSH_HOST "ls -lh ${REMOTE_PATH}/${FILE}"

    Write-Host "`n🌐 File deployed to server!" -ForegroundColor Green
} else {
    Write-Host "❌ Deploy failed!" -ForegroundColor Red
    exit 1
}
