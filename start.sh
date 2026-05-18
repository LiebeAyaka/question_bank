#!/bin/bash
# 西班牙语题库系统 - 一键启动脚本
# 检查 Node.js 和 Python 环境，安装依赖，启动前后端服务

set -e

cd "$(dirname "$0")"

echo "检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js 未安装或不在 PATH 中"
    echo "请从 https://nodejs.org/ 安装 Node.js"
    exit 1
fi

echo "检查 Node.js 依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装 Node.js 依赖..."
    npm install
fi

echo "检查 Python..."
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "[ERROR] Python 未安装或不在 PATH 中"
    echo "请从 https://www.python.org/ 安装 Python"
    exit 1
fi

cd server

echo "检查 Python 虚拟环境..."
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    $PYTHON_CMD -m venv venv
fi

echo "安装 Python 依赖..."
venv/bin/pip install -r requirements.txt

cd ..

echo "启动开发服务器..."
npx concurrently --kill-others "cd server && venv/bin/python app.py" "npm run dev"