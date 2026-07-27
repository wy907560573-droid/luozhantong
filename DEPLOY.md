# 落站通 - 长期部署指南

---

## 方式一：Render.com 免费部署 ⭐（强烈推荐）

**完全免费，无需信用卡，支持 Node.js，永久可用。**

### 免费额度

| 资源 | 限额 | 是否够用 |
|------|------|----------|
| 运行时间 | 750小时/月 | ✅ 够 24/7 全天运行 |
| 内存 | 512 MB | ✅ 落站通仅需 ~100MB |
| 带宽 | 100 GB/月 | ✅ 充足 |
| 构建时间 | 500分钟/月 | ✅ 充足 |
| 自定义域名 | 2个 | ✅ 免费 |
| HTTPS | 自动 | ✅ 免费 |

### 唯一限制

- **15分钟无访问自动休眠**，下次访问需等待 30~60 秒唤醒
- **重新部署时数据库会重置**（Git push 后），建议部署前备份 `data.db`

---

### 部署步骤（5分钟）

#### 1. 推送到 GitHub

在项目目录打开终端：

```bash
cd 落站通/
git init
git add .
git commit -m "落站通 - 首次部署"

# 在 GitHub 创建新仓库后：
git remote add origin https://github.com/你的用户名/luozhantong.git
git branch -M main
git push -u origin main
```

#### 2. 连接 Render

1. 打开 [render.com](https://render.com) → 点击 **Sign Up**
2. 选择 **GitHub** 登录授权
3. 点击 **New +** → **Blueprint**
4. 选择 `luozhantong` 仓库
5. 输入 Blueprint Name（如 `luozhantong`）
6. 点击 **Apply** — Render 自动读取 `render.yaml` 开始部署

#### 3. 等待部署

构建完成后，Render 会生成一个公开 URL（格式：`https://luozhantong.onrender.com`）。

#### 4. 访问

浏览器打开 Render 提供的 URL：
- 默认管理员：**admin** / **admin123**
- 首次登录后立即修改密码

---

### 保持服务不休眠（可选）

使用 [UptimeRobot](https://uptimerobot.com)（免费）每 10 分钟 ping 一次：

1. 注册 UptimeRobot → Add New Monitor
2. Monitor Type: **HTTP(s)**
3. URL: `https://你的域名.onrender.com/api/health`
4. Monitoring Interval: **10 minutes**
5. 这样服务就不会休眠，始终在线

---

### 数据备份

```bash
# Render 重新部署前，通过 API 导出数据
curl https://你的域名.onrender.com/api/stats \
  -H "x-user-phone: admin" \
  -H "x-auth-token: 你的token"

# 或者在管理页面"设置"中手动导出
```

---

## 方式二：Docker 部署

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sudo bash
```

### 2. 部署

```bash
cd 落站通/
docker compose up -d
```

### 3. 验证

```bash
curl http://localhost:3000/api/health
```

---

## 方式三：VPS 一键部署

```bash
scp -r 落站通/ user@your-server:/opt/
ssh user@your-server
cd /opt/落站通
chmod +x start.sh && ./start.sh
```

---

## 方式四：国内云平台

### 腾讯云轻量应用服务器

1. 购买轻量应用服务器（Ubuntu 22.04）
2. 防火墙开放 3000 端口
3. 按「方式二」或「方式三」部署

### 阿里云 ECS

1. 购买 ECS 实例（Ubuntu 22.04）
2. 安全组开放 3000 端口
3. 按「方式二」或「方式三」部署

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `DB_PATH` | `./data.db` | SQLite 数据库路径 |
| `UPLOAD_DIR` | `./uploads` | 上传文件存储路径 |
| `NODE_ENV` | `production` | 运行环境 |

---

## 项目文件结构

```
落站通/
├── server.js           # 后端入口（Express + SQLite）
├── render.yaml         # Render 一键���署配置
├── package.json        # 依赖配置
├── Dockerfile          # Docker 构建
├── docker-compose.yml  # Docker Compose
├── ecosystem.config.js # PM2 进程管理
├── start.sh            # VPS 一键部署脚本
├── .gitignore          # Git 忽略规则
├── index.html          # 前端主页
├── about.html          # 关于页面
├── css/                # 样式
├── js/                 # 前端逻辑
│   ├── api.js          # API 封装
│   ├── store.js        # 数据层（双模式）
│   ├── app.js          # 主应用
│   └── face.js         # 人脸识别
└── images/             # 图片资源（培训PPT等）
```
