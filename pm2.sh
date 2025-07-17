#!/bin/bash

APP_NAME="nextjs-ai-chatbot"

echo "1. 安装依赖..."
pnpm install

echo "2. 构建生产版本..."
pnpm run build

echo "3. 停用已有的同名应用（如果存在）..."
pm2 delete $APP_NAME || true

echo "4. 通过 pm2 启动应用..."
pm2 start ecosystem.config.js --only $APP_NAME

echo "5. 查看 pm2 状态..."
pm2 status
