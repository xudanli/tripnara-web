# What-If Tab 与决策评估 Tab 功能对比分析

## 功能对比

### What-If Tab
- **API**: `planningPolicyApi.whatIfEvaluate`
- **功能**:
  - 生成多个候选方案（基于不同策略参数）
  - 对比方案的指标（完成率、准时率、风险等级、缓冲时间）
  - 展示方案卡片，显示各项指标
  - 可以应用选中的方案到行程
- **特点**: 多策略方案对比（不同参数下的方案）

### 决策评估 Tab (PlanningWorkbenchTab)
- **API**: `planningWorkbenchApi.execute`
- **功能**:
  - 生成规划方案（Should-Exist Gate 评估）
  - 展示三人格评估结果（Abu/Dr.Dre/Neptune）
  - 展示综合决策
  - 支持方案对比（userAction: 'compare'，但功能未完全实现）
  - 支持方案调整（userAction: 'adjust'）
  - 支持提交方案（commitPlan）
- **特点**: Should-Exist Gate 评估，三人格评估

## 功能重叠分析

### 重叠点
1. **都有方案对比功能**
   - What-If Tab: 对比多个候选方案
   - 决策评估 Tab: 有"对比方案"按钮（但未完全实现）

2. **都涉及方案评估**
   - What-If Tab: 评估方案的完成率、准时率、风险
   - 决策评估 Tab: 评估方案的安全性、节奏、可行性

3. **都可以应用方案**
   - What-If Tab: 应用选中的方案
   - 决策评估 Tab: 提交方案到行程

### 差异点
1. **评估维度不同**
   - What-If Tab: 基于策略参数（robust/experienceFirst/extremeChallenge）
   - 决策评估 Tab: 基于三人格（Abu/Dr.Dre/Neptune）

2. **API 不同**
   - What-If Tab: `planningPolicyApi.whatIfEvaluate`
   - 决策评估 Tab: `planningWorkbenchApi.execute`

3. **展示方式不同**
   - What-If Tab: 展示方案卡片和指标
   - 决策评估 Tab: 展示三人格评估和综合决策

## 用户视角

从用户角度看：
- **"多方案对比"** 和 **"决策评估"** 确实都是关于**评估和选择方案**
- 用户可能不清楚两者的区别
- 两个 Tab 的存在可能造成困惑

## 建议方案

### 方案 1: 删除 What-If Tab（推荐）

**理由**:
1. ✅ **决策评估 Tab 更符合产品哲学**
   - 三人格评估是 TripNARA 的核心特色
   - Should-Exist Gate 评估是产品核心价值

2. ✅ **功能可以整合**
   - What-If Tab 的多方案对比功能可以整合到决策评估 Tab
   - 决策评估 Tab 已经有"对比方案"功能（虽然未完全实现）

3. ✅ **简化界面**
   - 减少 Tab 数量
   - 减少用户选择成本

4. ✅ **避免功能重复**
   - 消除功能重叠
   - 统一方案评估入口

**实施**:
- 移除 What-If Tab
- 将 What-If 的多方案对比功能整合到决策评估 Tab（如果需要）
- 或者完全依赖决策评估 Tab 的对比功能

### 方案 2: 删除决策评估 Tab（不推荐）

**理由**:
- ❌ 不符合产品哲学（三人格评估是核心）
- ❌ 失去 Should-Exist Gate 评估功能
- ❌ What-If Tab 的功能相对简单，不如决策评估 Tab 完整

### 方案 3: 合并两个 Tab（可选）

**实施**:
- 将 What-If Tab 的功能整合到决策评估 Tab
- 在决策评估 Tab 中添加多策略对比功能
- 统一方案评估和对比的入口

## 推荐方案：删除 What-If Tab

### 优势
1. ✅ 保留核心功能（三人格评估）
2. ✅ 简化界面
3. ✅ 避免功能重复
4. ✅ 统一方案评估入口

### 需要做的
1. 移除 What-If Tab
2. 从 Plan Studio 页面移除 What-If Tab
3. 更新翻译文件
4. 如果用户需要多方案对比，可以通过决策评估 Tab 的"对比方案"功能实现

## 结论

**What-If Tab 可以删除**，因为：
1. 功能与决策评估 Tab 重叠
2. 决策评估 Tab 更符合产品哲学
3. 简化界面，减少用户困惑

删除后，Plan Studio 将只保留：
- **Schedule（时间轴）** - 编辑和优化
- **Workbench（决策评估）** - 方案评估和决策
- **Bookings（预订）** - 预订管理
