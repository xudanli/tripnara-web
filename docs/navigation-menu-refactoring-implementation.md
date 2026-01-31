# 导航菜单重构实施计划

**实施日期：** 2026-01-30  
**实施角色：** 资深前端架构师、资深前端工程师

---

## 📋 实施清单

### **阶段 1：删除徒步和复盘模块**

#### **1.1 删除徒步模块文件**

**页面文件：**
- ✅ `src/pages/trails/index.tsx`
- ✅ `src/pages/trails/explore.tsx`
- ✅ `src/pages/trails/[id].tsx`
- ✅ `src/pages/trails/prep/[hikePlanId].tsx`
- ✅ `src/pages/trails/on-trail/[hikePlanId].tsx`
- ✅ `src/pages/trails/review/[hikePlanId].tsx`

**组件文件：**
- ✅ `src/components/trails/TrailCard.tsx`
- ✅ `src/components/trails/TrailFilterPanel.tsx`
- ✅ `src/components/trails/ElevationProfile.tsx`
- ✅ `src/components/trails/index.ts`

**类型文件：**
- ✅ `src/types/trail.ts`

**文档文件：**
- ✅ `HIKING-SYSTEM-ARCHITECTURE.md`

#### **1.2 删除复盘模块文件**

**页面文件：**
- ✅ `src/pages/insights/index.tsx`

**组件文件：**
- ⚠️ 检查是否有 `src/components/insights/` 目录

#### **1.3 更新路由配置**

**文件：** `src/App.tsx`
- ✅ 删除所有 `/dashboard/trails/*` 路由
- ✅ 删除 `/dashboard/insights` 路由

#### **1.4 更新导航组件**

**文件：** `src/components/layout/SidebarNavigation.tsx`
- ✅ 删除徒步菜单项
- ✅ 删除复盘菜单项

---

### **阶段 2：迁移设置页面**

#### **2.1 更新 DashboardTopBar**

**文件：** `src/components/layout/DashboardTopBar.tsx`
- ✅ 添加"设置"菜单项到用户头像下拉菜单（已存在，需要完善）
- ✅ 添加"个人资料"菜单项
- ✅ 添加"账户设置"菜单项
- ✅ 添加"通知设置"菜单项

#### **2.2 更新 SidebarNavigation**

**文件：** `src/components/layout/SidebarNavigation.tsx`
- ✅ 删除设置菜单项

---

### **阶段 3：简化导航菜单**

#### **3.1 简化 SidebarNavigation**

**方案：完全删除或只保留核心入口**

**选项 A：完全删除（推荐）**
- ✅ 删除 `SidebarNavigation` 组件
- ✅ 更新 `DashboardLayout` 移除侧边栏渲染

**选项 B：保留极简菜单**
- ✅ 只保留 2-3 个核心入口：
  - 对话界面（Dashboard）
  - 行程库（查看已有行程）
  - 规划工作台（继续规划）

#### **3.2 更新 DashboardLayout**

**文件：** `src/components/layout/DashboardLayout.tsx`
- ✅ 移除或简化侧边栏渲染逻辑
- ✅ 更新布局结构

#### **3.3 更新移动端导航**

**文件：** `src/components/layout/MobileBottomNav.tsx`
- ✅ 移除徒步和复盘菜单项
- ✅ 移除设置菜单项
- ✅ 保留核心入口（对话、行程、执行）

---

### **阶段 4：添加引导用户继续规划的逻辑**

#### **4.1 创建引导组件**

**新建文件：** `src/components/dashboard/ContinuePlanningCard.tsx`
- ✅ 显示未完成行程信息
- ✅ 提供"继续规划"和"查看详情"按钮

**新建文件：** `src/components/dashboard/StartPlanningCard.tsx`
- ✅ 显示开始规划引导
- ✅ 提供示例命令和"开始规划"按钮

#### **4.2 更新 Dashboard 页面**

**文件：** `src/pages/Dashboard.tsx`
- ✅ 添加引导逻辑
- ✅ 根据用户状态显示不同的引导卡片
- ✅ 集成到 `NLChatInterface` 组件

#### **4.3 更新 NLChatInterface**

**文件：** `src/components/trips/NLChatInterface.tsx`
- ✅ 集成引导卡片
- ✅ 根据用户状态显示引导

---

### **阶段 5：国家数据库次要入口**

#### **5.1 更新 ConversationGuide**

**文件：** `src/components/trips/ConversationGuide.tsx`
- ✅ 添加"查看国家数据库"快捷命令
- ✅ 点击后跳转到 `/dashboard/countries`

#### **5.2 更新 SidebarNavigation**

**文件：** `src/components/layout/SidebarNavigation.tsx`
- ✅ 删除国家菜单项（如果简化菜单）

---

## 🏗️ 技术实施细节

### **路由结构变更**

**删除的路由：**
```typescript
// 徒步相关路由
<Route path="trails" element={<TrailsPage />} />
<Route path="trails/explore" element={<TrailsExplorePage />} />
<Route path="trails/:id" element={<TrailDetailPage />} />
<Route path="trails/prep/:hikePlanId" element={<PrepCenterPage />} />
<Route path="trails/on-trail/:hikePlanId" element={<OnTrailLivePage />} />
<Route path="trails/review/:hikePlanId" element={<HikeReviewPage />} />

// 复盘路由
<Route path="insights" element={<InsightsPage />} />
```

**保留的路由：**
```typescript
<Route index element={<DashboardPage />} />
<Route path="trips" element={<TripsPage />} />
<Route path="plan-studio" element={<PlanStudioPage />} />
<Route path="execute" element={<ExecutePage />} />
<Route path="readiness" element={<ReadinessPage />} />
<Route path="countries/*" element={<CountriesPage />} /> // 次要入口
<Route path="settings" element={<SettingsPage />} /> // 通过头像下拉菜单访问
```

### **组件结构变更**

**删除的组件：**
- `src/components/trails/*` - 所有徒步相关组件
- `src/components/insights/*` - 复盘相关组件（如果有）

**新建的组件：**
- `src/components/dashboard/ContinuePlanningCard.tsx` - 继续规划卡片
- `src/components/dashboard/StartPlanningCard.tsx` - 开始规划卡片

**修改的组件：**
- `src/components/layout/SidebarNavigation.tsx` - 简化或删除
- `src/components/layout/DashboardTopBar.tsx` - 完善用户菜单
- `src/components/layout/DashboardLayout.tsx` - 更新布局
- `src/components/layout/MobileBottomNav.tsx` - 更新移动端导航
- `src/components/trips/ConversationGuide.tsx` - 添加国家数据库入口
- `src/pages/Dashboard.tsx` - 添加引导逻辑

---

## ✅ 验收标准

### **功能验收**

1. ✅ 徒步和复盘模块已完全删除，无残留代码
2. ✅ 设置页面可通过用户头像下拉菜单访问
3. ✅ 导航菜单已简化或删除，布局正常
4. ✅ 引导用户继续规划的逻辑正常工作
5. ✅ 国家数据库可通过次要入口访问

### **技术验收**

1. ✅ 代码编译通过，无 TypeScript 错误
2. ✅ 路由配置正确，无 404 错误
3. ✅ 组件导入正确，无运行时错误
4. ✅ 移动端布局正常
5. ✅ 无障碍功能正常

### **用户体验验收**

1. ✅ 界面简洁，符合"对话优先"的产品哲学
2. ✅ 引导逻辑清晰，用户能够快速理解如何继续规划
3. ✅ 功能发现性良好，用户能够找到需要的功能
4. ✅ 移动端体验良好

---

## 📝 实施顺序

1. **第一步：删除徒步和复盘模块**（风险最低，影响最小）
2. **第二步：迁移设置页面**（影响较小）
3. **第三步：简化导航菜单**（影响较大，需要测试）
4. **第四步：添加引导逻辑**（新增功能）
5. **第五步：国家数据库次要入口**（功能调整）

---

**文档创建时间：** 2026-01-30  
**最后更新时间：** 2026-01-30
