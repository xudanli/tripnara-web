# 证据接口对接显示位置说明

**最后更新**：2026-01-29

---

## 📍 证据接口显示位置

### ✅ 1. ReadinessPage（准备度页面）- 已完整集成

**页面路径**：`/readiness?tripId=xxx`

**文件位置**：`src/pages/readiness/index.tsx`

**显示位置**：在"证据链"（Evidence Chain）标签页中

**已集成的功能**：

#### ✅ 证据列表显示
- 使用 `EvidenceListItem` 组件显示每个证据项
- 显示证据的详细信息（类别、来源、时间戳、适用范围等）
- 支持点击打开证据来源链接

#### ✅ 状态更新操作
- **状态切换**：下拉选择器切换证据状态（new/acknowledged/resolved/dismissed）
- **用户备注**：可以添加/编辑用户备注（最大500字符）
- **状态显示**：显示当前状态和更新时间

#### ✅ 批量操作
- **批量选择**：全选/取消全选功能
- **批量状态更新**：可以批量更新多个证据的状态
- **批量限制**：最多支持100个证据项批量更新

#### ✅ 权限控制
- 根据用户角色（OWNER/EDITOR/VIEWER）显示/隐藏编辑功能
- VIEWER 只能查看，不能编辑
- OWNER 和 EDITOR 可以编辑

**代码位置**：
```tsx
// 行 2132-2196
{/* Evidence Section - 使用真实 API 数据 */}
<div className="space-y-3">
  {/* 批量操作组件 */}
  <EvidenceBatchActions
    evidenceList={adaptTripEvidenceListToReadiness(evidenceData)}
    tripId={tripId}
    userRole={userRole}
    onUpdate={() => loadEvidenceData(tripId)}
  />
  
  {/* 证据列表 */}
  {evidenceData.map((item) => (
    <EvidenceListItem
      key={item.id}
      evidence={readinessEvidence}
      tripId={tripId}
      userRole={userRole}
      onStatusChange={(id, status, note) => {
        loadEvidenceData(tripId);
      }}
    />
  ))}
</div>
```

**API 调用**：
- `GET /trips/:id/evidence` - 加载证据列表（行 544-564）
- `PATCH /trips/:id/evidence/:evidenceId` - 更新单个证据状态（在 EvidenceListItem 组件中）
- `PUT /trips/:id/evidence/batch-update` - 批量更新证据状态（在 EvidenceBatchActions 组件中）

---

### ⚠️ 2. ReadinessDrawer（准备度抽屉）- 未集成

**组件位置**：`src/components/readiness/ReadinessDrawer.tsx`

**当前状态**：❌ **未集成证据状态更新功能**

**说明**：
- ReadinessDrawer 主要用于显示准备度检查结果（blockers、must、should、optional）
- 目前不显示证据列表
- 如果需要，可以添加证据列表显示和操作功能

**建议**：
- 如果需要在抽屉中也显示证据，可以添加一个新的 section
- 复用 `EvidenceListItem` 和 `EvidenceBatchActions` 组件

---

### 📋 3. TripDetailPage（行程详情页）- 仅显示

**页面路径**：`/trips/:id`

**文件位置**：`src/pages/trips/[id].tsx`

**当前状态**：✅ **已调用 API，但仅显示，无操作功能**

**代码位置**：
```tsx
// 行 627-632
const data = await tripsApi.getEvidence(id, { limit: 3, offset: 0 });
setEvidence(data);
```

**功能**：
- ✅ 调用 `GET /trips/:id/evidence` 获取证据
- ✅ 显示证据列表（限制3条）
- ❌ **无状态更新操作**
- ❌ **无批量操作**

**建议**：
- 如果需要在此页面也支持状态更新，可以集成 `EvidenceListItem` 组件

---

### 📋 4. EvidenceDrawer（证据抽屉）- 仅显示

**组件位置**：`src/components/layout/EvidenceDrawer.tsx`

**当前状态**：✅ **已调用 API，但仅显示，无操作功能**

**功能**：
- ✅ 显示证据列表
- ❌ **无状态更新操作**
- ❌ **无批量操作**

**建议**：
- 如果需要在此组件中也支持状态更新，可以集成 `EvidenceListItem` 组件

---

## 🎯 相关操作功能清单

### ✅ 已添加的操作（ReadinessPage）

#### 1. 单个证据操作
- ✅ **状态切换**：下拉选择器切换状态
  - new → acknowledged/resolved/dismissed
  - acknowledged → resolved/dismissed
  - resolved → （不能回退）
  - dismissed → acknowledged
- ✅ **用户备注**：添加/编辑备注（最大500字符）
- ✅ **查看来源**：点击打开证据来源链接
- ✅ **状态显示**：显示当前状态和更新时间

#### 2. 批量操作
- ✅ **全选/取消全选**：一键选择所有证据
- ✅ **批量状态更新**：批量更新多个证据的状态
- ✅ **批量限制验证**：最多100个证据项
- ✅ **操作反馈**：显示更新成功/失败统计

#### 3. 权限控制
- ✅ **编辑权限**：OWNER 和 EDITOR 可以编辑
- ✅ **查看权限**：所有角色都可以查看
- ✅ **权限检查**：根据用户角色显示/隐藏编辑功能

---

## 📊 功能对比表

| 页面/组件 | 证据列表显示 | 状态更新 | 批量操作 | 备注功能 | 权限控制 |
|----------|------------|---------|---------|---------|---------|
| **ReadinessPage** | ✅ | ✅ | ✅ | ✅ | ✅ |
| ReadinessDrawer | ❌ | ❌ | ❌ | ❌ | ❌ |
| TripDetailPage | ✅ | ❌ | ❌ | ❌ | ❌ |
| EvidenceDrawer | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔗 API 接口对接情况

### ✅ 已对接的接口

1. **GET /trips/:id/evidence**
   - ✅ ReadinessPage - 完整使用
   - ✅ TripDetailPage - 仅显示（limit: 3）
   - ✅ EvidenceDrawer - 仅显示

2. **PATCH /trips/:id/evidence/:evidenceId**
   - ✅ ReadinessPage - 完整使用（在 EvidenceListItem 组件中）

3. **PUT /trips/:id/evidence/batch-update**
   - ✅ ReadinessPage - 完整使用（在 EvidenceBatchActions 组件中）

---

## 📝 总结

### ✅ 已完成的集成

1. **ReadinessPage（准备度页面）**
   - ✅ 证据列表显示
   - ✅ 状态更新操作
   - ✅ 批量操作
   - ✅ 用户备注
   - ✅ 权限控制

### ⚠️ 未集成的页面

1. **ReadinessDrawer（准备度抽屉）**
   - ❌ 未显示证据列表
   - ❌ 未集成操作功能

2. **TripDetailPage（行程详情页）**
   - ✅ 显示证据列表（仅3条）
   - ❌ 未集成操作功能

3. **EvidenceDrawer（证据抽屉）**
   - ✅ 显示证据列表
   - ❌ 未集成操作功能

---

## 🎯 建议

### 如果需要在其他页面也支持证据操作：

1. **ReadinessDrawer**
   - 可以添加一个新的 section 显示证据列表
   - 复用 `EvidenceListItem` 和 `EvidenceBatchActions` 组件

2. **TripDetailPage**
   - 将简单的证据显示替换为 `EvidenceListItem` 组件
   - 添加权限检查

3. **EvidenceDrawer**
   - 将简单的证据显示替换为 `EvidenceListItem` 组件
   - 添加批量操作功能

---

**文档创建时间**：2026-01-29  
**状态**：✅ 已完成
