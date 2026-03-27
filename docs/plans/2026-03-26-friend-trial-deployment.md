# 朋友试用 / 面试展示版部署手册

## 目标

这份手册用于把当前项目部署成一个**低成本、可稳定访问**的版本，满足以下目标：

- 你自己真机演示
- `2-5` 个朋友试用
- 不走正式大规模公开发布
- 一台机器同时承担：
  - `Yummy Map` 小程序后端
  - `OpenClaw` 或其他轻量个人服务

推荐部署路线：

- 云厂商：腾讯云
- 产品：轻量应用服务器 Lighthouse
- 地域：中国香港
- 系统：Ubuntu 22.04 LTS
- 反向代理：Nginx
- 进程守护：systemd
- HTTPS：Let’s Encrypt

---

## 第 1 步：购买服务器

### 推荐配置

- 首选：`2核2G`
- 备选：`2核4G`（活动价差距不大时）
- 不建议：`1核1G`

### 购买参数

在腾讯云轻量应用服务器购买页，按下面选择：

1. 地域：**中国香港**
2. 镜像：**Ubuntu 22.04**
3. 套餐：优先活动价 / 首购价
4. 时长：优先 `1 年`
5. 登录方式：**密码登录**

### 买完后记录的信息

- 服务器公网 IP
- 登录用户名
- 登录密码
- 域名
- 域名购买平台

---

## 第 2 步：购买域名

### 购买原则

- 先求便宜、稳定、好记
- 不必执着 `.com`
- 重点是能做 HTTPS 和小程序合法域名

### 建议

- 先在腾讯云域名或阿里云万网搜索一个低价域名
- 购买时优先看首年活动价

---

## 第 3 步：服务器初始化

使用 SSH 登录服务器后，执行这些基础准备动作：

```bash
apt update && apt upgrade -y
apt install -y nginx git curl
```

安装 Node.js（建议使用 Node 22 LTS）：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

创建目录结构：

```bash
mkdir -p /srv/yummy-map
mkdir -p /srv/openclaw
mkdir -p /srv/yummy-map/data
```

---

## 第 4 步：部署 Yummy Map 后端

### 推荐目录约定

- `/srv/yummy-map/server`：小程序后端代码
- `/srv/yummy-map/data`：数据库与持久化文件
- `/srv/openclaw`：OpenClaw 或其他个人服务

### 部署方式

把当前仓库代码拉到服务器后，只运行 `server/`：

```bash
cd /srv/yummy-map
git clone <你的仓库地址> .
cd server
npm install
```

### 环境变量

复制模板：

```bash
cp .env.production.example .env
```

然后填写：

- `AMAP_WEB_API_KEY`
- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`
- `TENCENT_OCR_REGION`
- `PORT`
- `DATABASE_PATH`

---

## 第 5 步：systemd 守护 Node 服务

把 `deploy/systemd/yummy-map.service.example` 拷到：

```bash
/etc/systemd/system/yummy-map.service
```

然后执行：

```bash
systemctl daemon-reload
systemctl enable yummy-map
systemctl start yummy-map
systemctl status yummy-map
```

### 验证

```bash
curl http://127.0.0.1:3000/health
```

如果返回 `ok: true`，说明 Node 服务已运行。

---

## 第 6 步：域名解析与 Nginx

### 1. 先做域名解析

把你的域名 `A` 记录指向服务器公网 IP。

例如：

- `api.your-domain.com -> 服务器公网 IP`

### 2. 配置 Nginx

把 `deploy/nginx/yummy-map.conf.example` 拷到：

```bash
/etc/nginx/conf.d/yummy-map.conf
```

测试配置并重载：

```bash
nginx -t
systemctl reload nginx
```

---

## 第 7 步：配置 HTTPS

安装 certbot：

```bash
apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
certbot --nginx -d api.your-domain.com
```

成功后验证：

```bash
curl https://api.your-domain.com/health
```

---

## 第 8 步：小程序改为生产接口

当前前端默认仍是本地地址：

- `miniprogram/config/env.js`

正式试用版必须改成生产域名，例如：

```js
const localBaseUrl = "https://api.your-domain.com";
const lanBaseUrl = "";
const useLanBaseUrl = false;
```

然后重新编译小程序。

---

## 第 9 步：微信后台配置

在微信公众平台后台配置：

### 合法域名

- `request` 合法域名
- `uploadFile` 合法域名

填写：

- `https://api.your-domain.com`

### 隐私保护指引

因为当前代码使用了：

- 图片选择
- 图片上传
- 定位

所以必须在后台填写对应用途说明。

---

## 第 10 步：真机验证

至少验证下面这些链路：

1. 纯文本导入
2. 1 张图片导入
3. 3 张图片导入
4. OCR 成功
5. OCR 失败提示
6. 预览页筛选
7. 导入后地图默认聚焦
8. 附近商家展开与点击切换
9. 删除收藏
10. 列表页定位与导航

---

## 推荐的最终架构

### 对外服务

- `https://api.your-domain.com` -> Nginx -> Yummy Map Node 服务

### 服务器内部用途

- `/srv/yummy-map`：小程序项目与后端
- `/srv/openclaw`：OpenClaw 或其他个人服务

### 端口建议

- `3000`：Yummy Map Node
- `3001+`：OpenClaw 或其他工具服务

---

## 上线前最低标准

当满足以下条件时，这个“朋友试用版”就算部署完成：

- 你能 SSH 登录服务器
- 域名已解析到服务器
- `/health` 可通过 HTTPS 访问
- 小程序请求正式域名成功
- 朋友扫码后能真正走完整条主链路

---

## 备注

这套方案适合：

- 朋友试用
- 面试展示
- 小范围验证

它不是面向大规模生产流量的最终方案，但足够支撑当前阶段。
