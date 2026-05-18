@echo off
:: 西班牙语题库系统 - 一键启动脚本
:: 检查 Node.js 和 Python 环境，安装依赖，启动前后端服务
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

echo Checking Node.js dependencies...
if not exist "node_modules\" (
    echo Installing Node dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node dependencies.
        pause
        exit /b 1
    )
)

echo Checking Python...
where python >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python"
    goto :python_found
)
where py >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=py"
    goto :python_found
)
echo [ERROR] Python is not installed or not in PATH.
echo Please install Python from https://www.python.org/ and try again.
pause
exit /b 1

:python_found

cd server

set "NEED_VENV=0"
set "NEED_PIP=0"

if not exist "venv\Scripts\python.exe" (
    set "NEED_VENV=1"
    set "NEED_PIP=1"
)

if "!NEED_PIP!"=="0" (
    if not exist ".venv_requirements_snapshot" (
        set "NEED_PIP=1"
    ) else (
        fc /b requirements.txt .venv_requirements_snapshot >nul 2>&1
        if errorlevel 1 set "NEED_PIP=1"
    )
)

if "!NEED_VENV!"=="0" if "!NEED_PIP!"=="0" (
    echo Virtual environment is ready.
    goto :start_servers
)

if "!NEED_VENV!"=="1" (
    if exist "venv\" (
        echo Removing incompatible virtual environment...
        rmdir /s /q venv
    )
    echo Creating virtual environment...
    !PYCMD! -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo Installing Python dependencies...
venv\Scripts\python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

copy /y requirements.txt .venv_requirements_snapshot >nul

:start_servers

cd ..

echo Starting development servers...
call npx concurrently --kill-others "cd server && start_backend.bat" "npm run dev"

pause
