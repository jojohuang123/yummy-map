# 打卡功能测试清单

## 测试命令

```bash
cd server

# 运行所有测试
npm run test:all

# 单独运行各测试
npm run test          # server 单元测试
npm run test:api      # API 集成测试
npm run test:checkin  # 打卡功能测试
```

## 测试覆盖范围

### 1. 健康检查 ✅
- [x] GET /health 返回 200
- [x] 返回正确的服务状态

### 2. 打卡创建 ✅
- [x] 基本字段（poiId, shopName, rating）
- [x] 带分类和评论
- [x] 所有段位验证（1-5）
- [x] 所有分类验证（8种）
- [x] 评论字数限制（140字截断）
- [x] 必填字段校验
- [x] rating 范围校验（1-5）

### 3. 打卡查询 ✅
- [x] 列表分页（page, limit）
- [x] 按城市筛选
- [x] 按分类筛选
- [x] 获取单条记录
- [x] 按 POI ID 获取记录
- [x] 按时间倒序

### 4. 打卡更新 ✅
- [x] PATCH 部分更新（评论）
- [x] PATCH 更新段位
- [x] PUT 完整更新
- [x] updatedAt 自动更新

### 5. 打卡删除 ✅
- [x] 删除记录
- [x] 删除后查询返回 404

### 6. 统计数据 ✅
- [x] totalCount 累计打卡数
- [x] monthCount 本月打卡数
- [x] cities 城市分布
- [x] categories 分类分布

### 7. 图片上传 ✅
- [x] POST /api/uploads 上传成功
- [x] GET /api/uploads/:id/raw 访问图片
- [x] 打卡时使用图片 URL

### 8. 错误处理 ✅
- [x] 缺少必填字段返回 400
- [x] rating 越界返回 400
- [x] 不存在记录返回 404
- [x] CORS 预检正确处理
- [x] 404 处理正确

### 9. 段位系统验证 ✅
| Rating | Label | Emoji | Color | 测试 |
|--------|-------|-------|-------|------|
| 1 | 拉完了 | 😫 | #9E9E9E | ✅ |
| 2 | NPC | 😐 | #78909C | ✅ |
| 3 | 人上人 | 😊 | #66BB6A | ✅ |
| 4 | 顶级 | 😍 | #FF7043 | ✅ |
| 5 | 夯 | 🤩 | #FFCA28 | ✅ |

### 10. 分类系统验证 ✅
| Category | Label | 测试 |
|----------|-------|------|
| western | 西餐 | ✅ |
| seasia | 东南亚菜 | ✅ |
| japanese | 日料 | ✅ |
| bbq | 烧烤 | ✅ |
| hotpot | 火锅 | ✅ |
| local | 本地菜 | ✅ |
| dessert | 甜品蛋糕 | ✅ |
| cafe | 奶茶咖啡 | ✅ |

## 测试通过标准

所有测试通过需满足：

1. **HTTP 状态码正确**
   - 成功操作返回 200
   - 参数错误返回 400
   - 资源不存在返回 404
   - CORS 预检返回 204

2. **响应数据结构正确**
   - code = 0 表示成功
   - data 字段包含实际数据
   - 分页信息完整

3. **业务逻辑正确**
   - rating 在 1-5 范围内
   - comment 被截断到 140 字
   - images 最多 3 张
   - 时间按倒序排列
   - updatedAt 在更新时自动设置

4. **错误处理正确**
   - 必填字段缺失时返回明确的错误码
   - 错误信息清晰易懂

## 测试数据清理

测试完成后自动清理测试数据：
- 删除所有 POI ID 以 B00/POI_ 开头的测试打卡
- 保留非测试数据

## 测试输出示例

```
==================================================
📋 CHECKIN-2: 创建打卡 - 基本字段
==================================================
  ✅ 创建打卡应返回 200，实际: 200
  ✅ code 应为 0
  ✅ 应有打卡 ID
  ✅ poiId 应匹配
  ✅ shopName 应匹配
  ✅ rating 应为 5
  ✅ ratingLabel 应为 夯
  ✅ ratingEmoji 应为 🤩
  ✅ ratingColor 应为 #FFCA28
  ✅ city 应为 上海
  ✅ 应有 createdAt
    📝 打卡 ID: chk_xxx

打卡功能测试结果: ✅ 0 通过, ❌ 0 失败

🎉 所有打卡功能测试通过！
```

## 验证计划

### Phase 1 验证（服务端）✅
- [x] curl 测试 POST /api/checkins 创建打卡
- [x] curl 测试 GET /api/checkins 分页
- [x] curl 测试 GET /api/checkins/stats 返回正确
- [x] curl 测试图片上传：POST /api/uploads + 访问 URL
- [x] curl 测试 PATCH /api/checkins/:id 更新评论
- [x] curl 测试 DELETE /api/checkins/:id 删除

### Phase 2 验证（地图页）
- [ ] 打开地图页，点击商家卡片
- [ ] 看到"打卡"按钮
- [ ] 已打卡的店显示段位标签（如"🤩夯"）

### Phase 3 验证（打卡抽屉）
- [ ] 点击"打卡"按钮，抽屉从下往上滑出
- [ ] 选择段位，背景高亮
- [ ] 选择分类
- [ ] 输入评论（超过140字无法输入）
- [ ] 上传图片（最多3张）
- [ ] 点击提交，显示 loading
- [ ] 提交成功，toast 提示，抽屉关闭
- [ ] 卡片更新显示段位标签

### Phase 4 验证（个人面板）
- [ ] TabBar 切换到"我的"
- [ ] 显示统计数据正确
- [ ] 显示城市标签云
- [ ] 点击城市标签，列表筛选
- [ ] 点击分类标签，列表筛选
- [ ] 无打卡时显示空状态引导
