@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title SKZ Pocadex
cd /d "%~dp0"

rem ==========================================================
rem  SKZ Pocadex - inicializador para Windows
rem  1. Verifica/instala o Node.js (LTS) via winget
rem  2. Instala as dependencias do projeto (npm install)
rem  3. Gera o build e abre o app no navegador
rem
rem  Uso:  iniciar.bat           -> modo normal (build + servidor)
rem        iniciar.bat dev       -> modo desenvolvimento (recarrega ao editar)
rem ==========================================================

set "MIN_NODE_MAJOR=20"
set "PORT=4173"
set "MODE=%~1"

echo.
echo  =========================================
echo     SKZ Pocadex - verificando requisitos
echo  =========================================
echo.

rem ---------- 1. Node.js ----------
call :find_node
if not defined NODE_OK (
    echo [ERRO] Node.js %MIN_NODE_MAJOR%+ nao encontrado.
    call :install_node || goto :fail
    call :refresh_path
    call :find_node
    if not defined NODE_OK (
        echo.
        echo [ERRO] O Node.js foi instalado, mas este terminal ainda nao o enxerga.
        echo     Feche esta janela e execute o iniciar.bat novamente.
        goto :fail
    )
)
echo [ok] Node.js !NODE_VERSION!

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm nao encontrado. Reinstale o Node.js em https://nodejs.org
    goto :fail
)
for /f "delims=" %%v in ('npm -v') do set "NPM_VERSION=%%v"
echo [ok] npm !NPM_VERSION!

rem ---------- 2. Dependencias ----------
set "NEED_INSTALL="
if not exist "node_modules\" set "NEED_INSTALL=1"
if exist "package-lock.json" if exist "node_modules\.package-lock.json" (
    rem Reinstala se o package-lock for mais novo que a instalacao atual
    for /f %%r in ('powershell -NoProfile -Command "if ((Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item 'node_modules\.package-lock.json').LastWriteTime) { 'yes' } else { 'no' }"') do (
        if "%%r"=="yes" set "NEED_INSTALL=1"
    )
)
if defined NEED_INSTALL (
    echo.
    echo [..] Instalando dependencias do projeto - so na primeira vez ou apos atualizacoes...
    if exist "package-lock.json" (
        call npm ci --no-audit --no-fund
    ) else (
        call npm install --no-audit --no-fund
    )
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao com a internet.
        goto :fail
    )
)
echo [ok] Dependencias instaladas

rem ---------- 3. Executar ----------
echo.
if /i "%MODE%"=="dev" (
    echo [..] Iniciando em modo desenvolvimento...
    echo      O navegador abrira sozinho. Para encerrar, feche esta janela ou pressione Ctrl+C.
    echo.
    call npm run dev -- --open
    goto :end
)

echo [..] Gerando a versao de producao...
call npm run build
if errorlevel 1 (
    echo [ERRO] O build falhou. Veja as mensagens acima.
    goto :fail
)
echo.
echo  =========================================
echo    App rodando em http://localhost:%PORT%
echo    Para encerrar, feche esta janela.
echo  =========================================
echo.
call npx vite preview --port %PORT% --strictPort --open
goto :end


rem ==========================================================
rem  Funcoes
rem ==========================================================

:find_node
set "NODE_OK="
set "NODE_VERSION="
where node >nul 2>&1 || exit /b 0
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
if not defined NODE_VERSION exit /b 0
set "NV=!NODE_VERSION:v=!"
for /f "tokens=1 delims=." %%m in ("!NV!") do set "NODE_MAJOR=%%m"
if !NODE_MAJOR! GEQ %MIN_NODE_MAJOR% (
    set "NODE_OK=1"
) else (
    echo [AVISO] Node.js !NODE_VERSION! e antigo demais - minimo: v%MIN_NODE_MAJOR%.
)
exit /b 0

:install_node
where winget >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERRO] O instalador automatico winget nao esta disponivel neste Windows.
    echo     Baixe e instale o Node.js LTS manualmente:  https://nodejs.org
    echo     Depois execute o iniciar.bat novamente.
    start "" "https://nodejs.org/pt-br/download"
    exit /b 1
)
echo.
choice /c SN /m "Deseja instalar o Node.js LTS agora - pode pedir permissao de administrador"
if errorlevel 2 (
    echo Instalacao cancelada. Instale manualmente em https://nodejs.org
    exit /b 1
)
echo [..] Instalando Node.js LTS via winget...
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
    rem winget retorna erro quando ja esta instalado - tenta atualizar
    winget upgrade --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
)
exit /b 0

:refresh_path
rem Recarrega o PATH do registro para enxergar o Node recem-instalado sem reabrir o terminal
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
exit /b 0

:fail
echo.
echo Ocorreu um problema. Pressione qualquer tecla para fechar.
pause >nul
exit /b 1

:end
endlocal
exit /b 0
