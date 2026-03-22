# 美食地图助手 技术实现文档

## 1. 文档目标

本文件用于定义 V1 技术实现方案，包括系统架构、数据模型、接口设计、第三方能力接入和关键流程，供开发实施使用。

## 2. 技术目标

- 打通文本导入、OCR 导入、POI 检索、导入确认、收藏地图展示主流程
- 将敏感密钥放在服务端管理
- 提供足够简单但可扩展的服务端结构，支撑后续增加更多数据源或后台管理能力

## 3. 建议技术栈

### 客户端

- 微信小程序原生开发
- TypeScript

### 服务端

- Node.js
- TypeScript
- Express 或 Fastify

### 数据库

- V1 开发期：SQLite
- 可升级：PostgreSQL

### 第三方服务

- 高德 Web 服务 API
- OCR 服务供应商，优先接通用 OCR 能力

## 4. 系统架构

```text
微信小程序
  -> 后端 API 服务
      -> OCR 服务
      -> 高德 POI 查询
      -> SQLite / PostgreSQL
```

## 5. 模块划分

### 5.1 小程序端模块

- 导入页模块
- 导入预览页模块
- 收藏地图页模块
- 收藏列表页模块
- 请求层
- 本地状态管理

### 5.2 服务端模块

- 导入任务模块
- OCR 模块
- 文本清洗模块
- 高德查询模块
- 收藏管理模块
- 错误处理模块

## 6. 数据模型

### 6.1 imports 导入任务表

用于记录一次导入任务的元信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 导入任务 ID |
| source_type | string | `text` / `ocr` / `mixed` |
| city_name | string | 城市名称 |
| city_adcode | string | 城市 adcode |
| raw_text | text | 原始文本 |
| image_count | integer | 上传图片数量 |
| status | string | 任务状态 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 6.2 import_items 导入结果表

用于记录导入任务中的每一条门店识别结果。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 结果 ID |
| import_id | string | 导入任务 ID |
| input_name | string | 原始店名 |
| normalized_name | string | 清洗后店名 |
| match_status | string | `matched` / `unmatched` / `partial_matched` |
| selected | boolean | 是否选中导入 |
| poi_id | string | 高德 POI ID |
| poi_name | string | 高德门店名称 |
| rating | decimal | 评分 |
| cost | integer | 人均价格 |
| tag_raw | string | 原始 tag 字段 |
| top_tags | json | 特色菜数组，最多 3 项 |
| latitude | decimal | 纬度 |
| longitude | decimal | 经度 |
| address | string | 地址 |
| business_area | string | 商圈 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 6.3 favorites 收藏表

用于记录用户确认导入后的收藏门店。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 收藏 ID |
| poi_id | string | 高德 POI ID，唯一 |
| name | string | 门店名称 |
| rating | decimal | 评分 |
| cost | integer | 人均价格 |
| top_tags | json | 特色菜数组 |
| latitude | decimal | 纬度 |
| longitude | decimal | 经度 |
| address | string | 详细地址 |
| business_area | string | 商圈 |
| source_type | string | 导入来源 |
| import_id | string | 来源导入任务 |
| created_at | datetime | 收藏时间 |
| updated_at | datetime | 更新时间 |

## 7. API 设计

### 7.1 创建导入任务

`POST /api/imports`

#### 请求体

```json
{
  "cityName": "上海",
  "cityAdcode": "310000",
  "text": "阿娘面馆\n老吉士酒家",
  "images": []
}
```

#### 说明

- `text` 和 `images` 至少存在一个
- `images` 最多 3 张
- 服务端创建任务后开始 OCR、清洗、POI 查询流程
- 接口返回后前端应立即进入处理中状态并显示阶段文案

#### 响应体

```json
{
  "importId": "imp_001",
  "status": "submitted"
}
```

### 7.2 查询导入任务结果

`GET /api/imports/:importId`

#### 响应体

```json
{
  "id": "imp_001",
  "status": "preview_ready",
  "summary": {
    "total": 10,
    "matched": 8,
    "selected": 8,
    "unmatched": 2
  },
  "items": [
    {
      "id": "item_001",
      "inputName": "老吉士酒家",
      "normalizedName": "老吉士酒家",
      "matchStatus": "matched",
      "selected": true,
      "poiId": "B00123",
      "poiName": "老吉士酒家(天平路店)",
      "rating": 4.6,
      "cost": 168,
      "topTags": ["红烧肉", "葱烤大排", "蟹粉豆腐"],
      "location": {
        "latitude": 31.206,
        "longitude": 121.437
      },
      "address": "天平路41号",
      "businessArea": "徐家汇"
    }
  ]
}
```

### 7.3 更新导入项勾选状态

`PATCH /api/imports/:importId/items`

#### 请求体

```json
{
  "selectedItemIds": ["item_001", "item_002", "item_003"]
}
```

#### 说明

- 用于导入预览页调整最终导入项
- 服务端同步更新 `selected` 状态

### 7.4 确认导入收藏

`POST /api/imports/:importId/confirm`

#### 响应体

```json
{
  "importId": "imp_001",
  "importedCount": 7,
  "duplicateCount": 1,
  "favoritesCount": 24
}
```

#### 说明

- 仅导入 `selected = true` 且 `match_status != unmatched` 的记录
- 若 `poi_id` 已存在，则记为重复，不重复插入

### 7.5 获取收藏地图数据

`GET /api/favorites/map`

#### 响应体

```json
{
  "total": 24,
  "items": [
    {
      "id": "fav_001",
      "poiId": "B00123",
      "name": "老吉士酒家(天平路店)",
      "rating": 4.6,
      "cost": 168,
      "topTags": ["红烧肉", "葱烤大排", "蟹粉豆腐"],
      "latitude": 31.206,
      "longitude": 121.437,
      "address": "天平路41号",
      "businessArea": "徐家汇"
    }
  ]
}
```

### 7.6 获取收藏列表

`GET /api/favorites`

支持按导入时间倒序返回。

### 7.7 删除收藏

`DELETE /api/favorites/:favoriteId`

#### 响应体

```json
{
  "success": true
}
```

## 8. 第三方服务接入

### 8.1 OCR 调用链

```text
客户端上传图片
-> 服务端接收图片
-> 服务端调用 OCR 服务
-> 得到原始文本
-> 进入文本清洗模块
```

#### OCR 处理要求

- 支持 1 到 3 张图片
- 汇总所有图片识别结果
- 保留 OCR 原始文本，用于排查识别误差
- 目标处理时间控制在 8 秒内
- 超过 8 秒前端继续展示处理中状态
- 超过 15 秒直接返回失败结果或超时错误，不允许无限等待

### 8.2 高德调用链

```text
清洗后的每个店名
-> /v3/place/text
-> 返回候选 POI
-> 选择第一结果作为 V1 主匹配
-> 写入导入项结果
```

必要时补充：

```text
已获得 poi_id
-> /v3/place/detail
-> 补充详情字段
```

#### 建议参数

- `keywords`
- `city`
- `citylimit=true`
- `extensions=all`

#### 目标字段映射

| 高德字段 | 业务字段 |
| --- | --- |
| `id` | `poi_id` |
| `name` | `poi_name` |
| `location` | `latitude` / `longitude` |
| `address` | `address` |
| `business_area` | `business_area` |
| `biz_ext.rating` | `rating` |
| `biz_ext.cost` | `cost` |
| `tag` | `top_tags` |

## 9. 文本清洗规则

### 9.1 输入来源

- 文本框输入
- OCR 输出

### 9.2 清洗步骤

1. 统一换行符
2. 按换行、顿号、逗号、分号切分
3. 去掉序号前缀
4. 去掉空白字符
5. 去掉明显无意义短词
6. 去重

### 9.3 干扰词示例

- 推荐
- 必吃
- 人均
- 地址
- 评分
- 收藏

### 9.4 输出结构

```json
[
  {
    "inputName": "1. 老吉士酒家",
    "normalizedName": "老吉士酒家"
  }
]
```

## 10. 任务处理流程

### 10.1 导入任务时序

```text
小程序
-> POST /api/imports
-> 服务端创建导入任务
-> OCR 处理
-> 文本清洗
-> 并发高德查询
-> 写入 import_items
-> 导入任务状态改为 preview_ready
-> 小程序轮询或主动查询结果
```

### 10.2 导入确认时序

```text
小程序
-> PATCH /api/imports/:id/items
-> POST /api/imports/:id/confirm
-> 服务端过滤 selected 项
-> 去重写入 favorites
-> 返回导入结果
-> 小程序跳转地图页
```

## 11. 小程序端实现建议

### 11.1 页面数据结构

#### 导入页

- `textInput`
- `images`
- `cityName`
- `cityAdcode`
- `isSubmitting`

#### 导入预览页

- `importId`
- `status`
- `summary`
- `items`
- `ocrStageText`

#### 地图页

- `markers`
- `selectedFavorite`
- `favoritesCount`
- `isRemovingFavorite`

#### 列表页

- `favorites`
- `isLoading`

### 11.2 地图组件使用建议

- 使用 `markers` 展示收藏门店
- 使用 `include-points` 自动包含所有点位
- 点击 marker 后更新底部卡片
- 使用 `gcj02` 坐标系

## 12. 服务端实现建议

### 12.1 模块边界

- `importService`：创建导入任务、编排 OCR 和 POI 查询
- `ocrService`：封装 OCR 调用
- `textNormalizeService`：文本清洗与去重
- `amapService`：封装高德接口
- `favoriteService`：收藏写入、查询、删除

### 12.2 错误处理

- 第三方接口失败统一包装为业务错误码
- OCR、POI 查询失败不直接崩整个任务，允许部分成功
- 所有外部请求记录错误日志
- OCR 调用需设置明确超时，超时后返回业务错误而不是一直挂起

## 13. 错误码建议

| 错误码 | 含义 |
| --- | --- |
| `IMPORT_INVALID_INPUT` | 导入输入为空 |
| `IMPORT_CITY_REQUIRED` | 未选择城市 |
| `IMPORT_TOO_MANY_IMAGES` | 图片超过 3 张 |
| `OCR_FAILED` | OCR 识别失败 |
| `OCR_TIMEOUT` | OCR 处理超时 |
| `POI_SEARCH_FAILED` | 高德查询失败 |
| `IMPORT_NOT_FOUND` | 导入任务不存在 |
| `FAVORITE_NOT_FOUND` | 收藏不存在 |

## 14. 安全与配置

### 14.1 环境变量

| 变量 | 说明 |
| --- | --- |
| `AMAP_WEB_API_KEY` | 高德 Web 服务 Key |
| `OCR_SECRET_ID` | OCR 服务账号 ID |
| `OCR_SECRET_KEY` | OCR 服务密钥 |
| `DATABASE_URL` | 数据库连接地址 |

### 14.2 安全原则

- 小程序端不保存高德 Key 和 OCR 密钥
- 所有第三方调用由服务端完成
- 上传图片应限制类型和大小

## 15. 性能建议

### 15.1 查询并发

- 门店查询建议使用受控并发
- 避免一次性无限并发触发高德限流

### 15.2 OCR 可用性

- 图片上传后应立即进入可感知的处理中状态
- 1 到 3 张图片识别目标时长为 8 秒内
- 超过 15 秒直接失败返回，允许用户重试

### 15.3 结果缓存

- 可按 `城市 + 店名` 做短期缓存
- 减少重复导入时的外部请求消耗

## 16. 测试建议

### 16.1 单元测试

- 文本清洗规则
- tag 拆分逻辑
- 空字段容错逻辑
- 重复收藏去重逻辑

### 16.2 集成测试

- 文本导入到预览生成
- OCR 导入到预览生成
- 导入确认到 favorites 写入
- favorites 地图数据返回

### 16.3 手动验收

- 上传 1 张、2 张、3 张截图
- 仅文本导入
- OCR 和文本混合导入
- 部分匹配失败
- 无评分、无人均、无特色菜门店展示

## 17. 开发顺序建议

### 阶段一

- 数据表
- 文本清洗
- 高德查询
- 文本导入预览

### 阶段二

- OCR 接入
- 导入确认
- favorites 存储

### 阶段三

- 地图页
- 列表页
- 删除收藏

## 18. V1 技术边界

- 不抓取评论正文
- 不做推荐 / 避雷算法
- 不做路线规划
- 不做账号体系

V1 只解决“批量导入门店并在地图查看分布”这一件事。
