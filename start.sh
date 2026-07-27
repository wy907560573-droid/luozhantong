#!/bin/bash
# 落站通 - 一键部署脚本 (适用于 Ubuntu/Debian/CentOS)
# 使用方法: chmod +x start.sh && ./start.sh

set -e

APP_NAME="luozhantong"
APP_DIR="/opt/${APP_NAME}"
PORT="${PORT:-3000}"

echo "========================================"
echo "  落站通 - EHS 承包商入场许可证管理平台"
echo "  一键部署脚本"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[1/5] 安装 Node.js 22.x..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "[1/5] Node.js 已安装: $(node -v)"
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "[2/5] 安装 PM2 进程管理器..."
    sudo npm install -g pm2
else
    echo "[2/5] PM2 已安装: $(pm2 -v)"
fi

# 创建应用目录
echo "[3/5] 准备应用目录..."
sudo mkdir -p ${APP_DIR}/data ${APP_DIR}/uploads ${APP_DIR}/logs
sudo chown -R $USER:$USER ${APP_DIR}

# 复制项目文件
echo "[4/5] 部署应用文件..."
cp -r ./* ${APP_DIR}/
cd ${APP_DIR}

# 安装依赖
npm install --production

# 启动/重启
echo "[5/5] 启动应用..."
pm2 delete ${APP_NAME} 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

echo ""
echo "========================================"
echo "  部署完成！"
echo "  http://localhost:${PORT}"
echo "========================================"
echo ""
echo "PM2 常用命令："
echo "  pm2 status       查看状态"
echo "  pm2 logs         查看日志"
echo "  pm2 restart all  重启所有"
echo "========================================"

pm2 status
