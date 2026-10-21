@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  app-api-elabore - teste local
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)

if not exist ".env.local" (
  if exist ".env.example" (
    echo [INFO] .env.local nao encontrado. Criando a partir de .env.example...
    copy /y ".env.example" ".env.local" >nul
  ) else (
    echo [ERRO] .env.local e .env.example nao encontrados.
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo [INFO] Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha no npm install.
    pause
    exit /b 1
  )
)

echo.
echo [INFO] Iniciando em http://localhost:3000  (Ctrl+C para parar)
start "" "http://localhost:3000"
call npm run dev

pause
endlocal
