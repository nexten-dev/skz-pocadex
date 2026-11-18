@echo off
chcp 65001 >nul
title SKZ Pocadex
cd /d "%~dp0"
rem Abre o SKZ Pocadex sem precisar instalar nada (usa o PowerShell do Windows).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if errorlevel 1 (
    echo.
    echo Pressione qualquer tecla para fechar.
    pause >nul
)
