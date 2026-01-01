# 徒步（Hiking/Trail）全链路页面系统架构

## 概述

本系统实现了完整的徒步用户旅程，从发现路线到执行复盘的全链路管理。所有页面已创建并集成到路由系统中。

## 用户旅程

```
发现路线 → 评估详情 → Readiness 评估 → 准备清单 → 执行徒步 → 复盘沉淀
```

## 信息架构

### 主导航入口
- **Trails Hub** (`/dashboard/trails`) - 徒步中心入口页面
  - 发现路线
  - 收藏/下载
  - 我的徒步
  - 安全中心

## 页面结构

### 1. Trails Hub（徒步中心）
**路径**: `/dashboard/trails`  
**文件**: `src/pages/trails/index.tsx`

**功能**:
- 提供四个主要功能入口
- 快捷操作链接
- 用户旅程提示

### 2. Trails Explore（发现页）
**路径**: `/dashboard/trails/explore`  
**文件**: `src/pages/trails/explore.tsx`

**功能**:
- 顶部搜索与定位
- 快捷筛选 Chips（1-day, 2-3 days, waterfall, ridge, glacier, hot spring）
- 筛选面板（抽屉）：
  - 难度、距离、爬升、耗时
  - 路线类型、风险标签、季节可行性
- 结果列表（卡片）：
  - 名称、国家/区域
  - 核心指标（距离、爬升、耗时、难度）
  - 可走指数（0-100）
  - 关键风险标签
  - CTA：查看详情、收藏、离线下载
- 地图模式（可切换，待实现）

### 3. Trail Detail（路线详情页）
**路径**: `/dashboard/trails/:id`  
**文件**: `src/pages/trails/[id].tsx`

**功能**:
- **Hero 区域**：
  - 标题、地点、季节徽章
  - 核心指标一行（距离、爬升、耗时、最高点、难度）
  - CTA：做 Readiness、保存、分享
  - 预览图占位（路线线条 + 海拔剖面缩略图）

- **Route Intelligence（路线结构）**：
  - 路线类型
  - 分段列表（可折叠）
  - 海拔剖面（交互式，待实现）

- **Safety & Constraints（风险与约束）**：
  - 风险矩阵（天气敏感度、暴露路段、涉水、高反、封路、信号盲区）
  - 不可走条件（硬门控）：风速阈值、降水、温度
  - 备案与救援信息

- **Logistics（后勤与补给）**：
  - 起点到达方式（自驾/公交）
  - 补给（水源、补给点、厕所）
  - 营地/避难所
  - 时间窗口

- **Alternatives & Repair（替代与修复）**：
  - Plan B：短线替代
  - 退出点/折返点
  - 最小改动修复建议

### 4. Readiness（可执行性评估）
**路径**: `/dashboard/readiness`  
**文件**: `src/pages/readiness/index.tsx`（已存在，可扩展为徒步专用版本）

**功能**（徒步专用版本）:
- Readiness 总结条（结论先行）
- 三层证据（环境、路线、人）
- Abu：硬门控
- Dr.Dre：节奏与时间表
- Neptune：修复与替代

### 5. Prep Center（准备页）
**路径**: `/dashboard/trails/prep/:hikePlanId`  
**文件**: `src/pages/trails/prep/[hikePlanId].tsx`

**功能**:
- **Checklist（装备清单）**：
  - 自动生成（根据温度、风、路线风险）
  - 用户勾选 + 缺失提示
  - 关键装备缺失 → 触发 Abu 的风险提示

- **Permits & Booking（许可/预约）**：
  - 需要预约、费用、链接
  - 容量与截止时间
  - 失败时：Neptune 给替代建议

- **Transport（到达与返程）**：
  - 自驾：停车点、预计车程
  - 公交/班车：班次窗口

- **Offline Pack（离线包）**：
  - 离线地图/轨迹
  - 紧急联系卡
  - 关键撤退点列表

- **Start Hike CTA**：开始徒步（进入执行页）

### 6. On-trail Live（执行页）
**路径**: `/dashboard/trails/on-trail/:hikePlanId`  
**文件**: `src/pages/trails/on-trail/[hikePlanId].tsx`

**功能**:
- **地图主视图**（离线优先）：
  - 当前点、路线线条、下一关键节点
  - 偏航提示 + 回到路线指引

- **状态条**（始终可见）：
  - 距离/爬升进度
  - 预计到达终点时间
  - 日落倒计时

- **风险卡（Abu）**：
  - 实时天气变化/风速
  - 触发阈值提醒
  - 一键：建议撤退/改短线

- **节奏卡（Dr.Dre）**：
  - 当前配速 vs 计划
  - 缓冲剩余
  - 最晚折返时间动态更新

- **修复卡（Neptune）**：
  - 延误/体能下降 → 给 2~3 个最小改动方案

- **事件记录**：
  - 一键打点：到达/离开/休息/跳过/替换/风险
  - 语音备注（可选）

### 7. Hike Review（复盘页）
**路径**: `/dashboard/trails/review/:hikePlanId`  
**文件**: `src/pages/trails/review/[hikePlanId].tsx`

**功能**:
- **执行摘要**：
  - 实际距离、耗时、爬升、完成日期

- **海拔剖面上的事件钉子**：
  - 延误、体能崩、风大、涉水、折返点全部钉在剖面上
  - 一眼看出"崩在哪段坡"

- **洞察**：
  - 高光、摩擦点、节奏、安全、决策
  - 用户反馈（同意/不同意/编辑）

- **锚点规则**：
  - 例："风速 > 12m/s 的暴露山脊不走"
  - "每日爬升 > 900m 会明显疲劳，改 2 天"
  - "日落前 90 分钟必须在下撤段"

## 类型定义

**文件**: `src/types/trail.ts`

**主要类型**:
- `TrailDetail` - 徒步路线详情
- `TrailSegment` - 路线分段
- `TrailKeyNode` - 关键节点（水源、避难所等）
- `HikePlan` - 徒步计划
- `PrepChecklist`, `PrepPermit`, `PrepTransport`, `OfflinePack` - 准备相关
- `OnTrailState` - 执行状态
- `TrailRiskAlert`, `TrailRepairSuggestion`, `TrailEvent` - 执行相关
- `HikeReview`, `ElevationEvent`, `HikeInsight`, `AnchorRule` - 复盘相关

## API 集成

所有页面已集成 `routeDirectionsApi`，使用 `tag=徒步` 筛选徒步路线。

**主要接口**:
- `GET /route-directions?tag=徒步` - 查询徒步路线
- `GET /route-directions/:id` - 获取路线详情
- `GET /route-directions/cards` - 获取路线卡片
- `GET /route-directions/interactions` - 获取交互列表

## 路由配置

所有路由已添加到 `src/App.tsx`:

```typescript
<Route path="trails" element={<TrailsPage />} />
<Route path="trails/explore" element={<TrailsExplorePage />} />
<Route path="trails/:id" element={<TrailDetailPage />} />
<Route path="trails/prep/:hikePlanId" element={<PrepCenterPage />} />
<Route path="trails/on-trail/:hikePlanId" element={<OnTrailLivePage />} />
<Route path="trails/review/:hikePlanId" element={<HikeReviewPage />} />
```

## 关键字段（待补齐）

根据接口文档，以下字段需要后端支持：

### Trail 基础
- `trailId`, `name`, `region`, `startPoint`, `endPoint`, `loopType`
- `distanceKm`, `elevationGainM`, `elevationLossM`, `maxElevationM`, `minElevationM`
- `estimatedTimeMin`（建议分季节）
- `difficulty`（可映射到 `trailDifficulty`）
- `geometryPolyline`（路线线条）
- `segments[]`（分段坡度、暴露度、涉水点）

### 风险与后勤
- `riskTags[]`（exposure, river_crossing, snow, rockfall, signal_blackout）
- `waterSources[]`（位置、季节性）
- `shelters/camps[]`（容量、预约）
- `exitPoints[]`（撤退点）
- `seasonality`（月份推荐度）
- `opening/closure`（封路/季节关闭）

## 可复用组件

### 1. TrailCard
**文件**: `src/components/trails/TrailCard.tsx`

**功能**:
- 显示路线卡片（名称、位置、指标）
- 可走指数可视化
- 风险标签展示
- 收藏和下载功能

**使用**:
```tsx
<TrailCard
  trail={trail}
  readinessScore={85}
  onBookmark={(id) => handleBookmark(id)}
  onDownload={(id) => handleDownload(id)}
/>
```

### 2. ElevationProfile
**文件**: `src/components/trails/ElevationProfile.tsx`

**功能**:
- 交互式海拔剖面图（SVG）
- 事件钉子标注
- 鼠标悬停显示详细信息
- 支持事件标记（延误、疲劳、折返等）

**使用**:
```tsx
<ElevationProfile
  elevationPoints={elevationPoints}
  events={events}
  totalDistanceKm={15.2}
  maxElevationM={2000}
  onPointHover={(point) => console.log(point)}
/>
```

### 3. TrailFilterPanel
**文件**: `src/components/trails/TrailFilterPanel.tsx`

**功能**:
- 完整的筛选面板
- 难度、距离、爬升、耗时筛选
- 路线类型和风险标签筛选
- 重置和应用功能

**使用**:
```tsx
<TrailFilterPanel
  filters={filters}
  onFiltersChange={setFilters}
  onReset={handleReset}
  onApply={handleApply}
/>
```

## 待实现功能

1. **地图视图**：
   - Trails Explore 的地图模式
   - Trail Detail 的海拔剖面交互（已提供 ElevationProfile 组件）
   - On-trail Live 的实时地图

2. **Readiness 徒步专用版本**：
   - 扩展现有 Readiness 页面，添加徒步特定评估逻辑

3. **数据集成**：
   - 连接后端 API 获取真实数据
   - 实现离线地图下载
   - 实现 GPS 轨迹记录

## 设计原则

1. **Abu 视角**：硬门控、风险透明、必须遵守
2. **Dr.Dre 视角**：节奏控制、时间表、缓冲管理
3. **Neptune 视角**：修复建议、替代方案、最小改动

## 下一步

1. 后端 API 实现关键字段
2. 地图组件集成（如 Mapbox、Leaflet）
3. GPS 定位和轨迹记录
4. 离线地图下载功能
5. 实时天气数据集成
6. 用户反馈和优化

