# 本地运行说明

## 1. 启动后端服务

在终端里执行：

```bash
cd "/Users/lotterian/Desktop/yummy map/server"
AMAP_WEB_API_KEY="你的高德 Web 服务 Key" node src/index.js
```

启动成功后，浏览器打开下面任一地址检查：

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/health`

如果 `/health` 返回 `ok: true`，说明后端已经起来了。

## 2. 用微信开发者工具打开小程序

在微信开发者工具中：

1. 选择“导入项目”
2. 项目目录选择：`/Users/lotterian/Desktop/yummy map`
3. AppID 可先使用测试号或当前项目配置
4. 打开后直接编译

当前默认接口地址是：

```text
http://127.0.0.1:3000
```

这个地址适合微信开发者工具本机调试。

## 3. 真机调试怎么改接口地址

真机不能直接访问手机自己的 `127.0.0.1`，需要改成你电脑的局域网 IP。

先在 Mac 上查本机 IP：

```bash
ipconfig getifaddr en0
```

如果你当前不是走 `en0`，可以再试：

```bash
ipconfig getifaddr en1
```

拿到 IP 后，编辑这个文件：

- `/Users/lotterian/Desktop/yummy map/miniprogram/config/env.js`

把它改成这样：

```js
const localBaseUrl = "http://127.0.0.1:3000";
const lanBaseUrl = "http://你的局域网IP:3000";
const useLanBaseUrl = true;
```

然后重新编译小程序。

## 4. 微信开发者工具建议设置

如果本地请求被拦住，在开发者工具里勾上：

- “不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”

## 5. 当前调试链路

现在这条链路已经支持：

- 文本粘贴导入
- 最多 3 张截图 OCR
- 导入预览
- 确认导入
- 收藏地图查看
- 地图页取消收藏

## 6. 常见问题

### 浏览器打开 `127.0.0.1:3000` 不是前端页面

这是正常的。这里是后端 API 服务，不是网页前端。

真正的前端入口是微信开发者工具里的小程序页面。

### 小程序提示请求失败

先检查：

1. 后端服务是否还在运行
2. 当前接口地址是否正确
3. 如果是真机，是否已经切到局域网 IP
4. 电脑和手机是否在同一个局域网
