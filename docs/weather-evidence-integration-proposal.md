# 天气数据与证据系统集成方案

## 📋 问题分析

### 当前状况
1. **天气显示系统**（UI层）
   - 使用 `WeatherCard` / `WeatherMini` 组件
   - 实时调用天气 API（`useWeather` hook）
   - 仅用于 UI 展示，不存储
   - 用户看到"5°预"等天气信息

2. **准备度证据系统**（数据层）
   - 需要调用 `fetch-evidence` API
   - 将天气数据存储为"证据"
   - 用于准备度评分和检查
   - 用户看到"天气数据缺失"

### 问题根源
- **两套独立系统**：UI 展示和证据存储分离
- **用户困惑**：明明看到天气了，为什么还显示缺失？
- **手动操作**：需要用户主动点击"获取证据"按钮

---

## 🎯 产品经理视角：用户体验优化

### 核心原则（参考产品经理指导）
1. **决策优先**：用户应该看到准确的准备度状态
2. **自动化优先**：减少用户手动操作
3. **可执行优先**：系统应该主动获取必要数据
4. **信任优先**：避免显示矛盾信息

### 推荐方案：**智能自动获取 + 渐进式提示**

#### 方案A：完全自动化（推荐 ⭐⭐⭐⭐⭐）
**时机**：行程加载时自动检查并获取证据

**流程**：
1. 用户打开行程页面
2. 系统检测到缺少证据数据
3. **静默后台获取**：自动调用 `fetch-evidence` API
4. 获取完成后更新准备度评分
5. 用户无需任何操作

**优点**：
- ✅ 用户体验最佳，零操作
- ✅ 符合"自动化优先"原则
- ✅ 避免显示矛盾信息

**缺点**：
- ⚠️ 可能增加 API 调用（可通过缓存优化）
- ⚠️ 首次加载可能稍慢（可异步处理）

**实现建议**：
```typescript
// 在 ReadinessDrawer 或 ScheduleTab 加载时
useEffect(() => {
  if (tripId && trip) {
    // 检查证据状态
    checkEvidenceStatus().then(status => {
      if (status.missingCount > 0) {
        // 静默获取证据（不显示加载状态）
        fetchEvidenceSilently(tripId);
      }
    });
  }
}, [tripId, trip]);
```

---

#### 方案B：智能提示 + 一键获取（备选 ⭐⭐⭐⭐）
**时机**：检测到矛盾时提示用户

**流程**：
1. 用户打开行程页面
2. 系统检测到：天气已显示 BUT 证据缺失
3. **智能提示**：显示"检测到天气数据，正在同步到准备度系统..."
4. 自动调用 `fetch-evidence` API
5. 完成后提示"已同步完成"

**优点**：
- ✅ 用户知道系统在做什么
- ✅ 减少困惑
- ✅ 保持用户控制感

**缺点**：
- ⚠️ 需要额外的 UI 提示组件
- ⚠️ 可能打断用户操作流程

---

#### 方案C：统一数据源（长期优化 ⭐⭐⭐）
**时机**：重构天气显示系统

**流程**：
1. 天气显示组件优先使用证据数据
2. 如果证据数据不存在，再调用实时 API
3. 获取实时数据后，自动存储为证据

**优点**：
- ✅ 统一数据源，避免重复
- ✅ 减少 API 调用
- ✅ 数据一致性最好

**缺点**：
- ⚠️ 需要较大重构
- ⚠️ 可能影响现有功能

---

## 💻 前端工程师视角：技术实现

### 核心原则（参考前端工程师指导）
1. **组件可复用**：避免重复代码
2. **类型安全**：完整的 TypeScript 类型
3. **用户体验优先**：流畅的交互
4. **性能优化**：避免不必要的 API 调用

### 推荐实现：**方案A + 优化**

#### 1. 创建证据状态检查 Hook
```typescript
// src/hooks/useEvidenceStatus.ts
export function useEvidenceStatus(tripId: string | null) {
  const [status, setStatus] = useState<EvidenceStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!tripId) return;
    setChecking(true);
    try {
      const coverageData = await readinessApi.getCoverageMapData(tripId);
      const missingCount = coverageData?.summary?.missing || 0;
      setStatus({
        missingCount,
        hasWeather: coverageData?.evidenceStatus?.weather === 'fetched',
        // ... 其他状态
      });
    } finally {
      setChecking(false);
    }
  }, [tripId]);

  return { status, checking, checkStatus };
}
```

#### 2. 创建自动获取证据 Hook
```typescript
// src/hooks/useAutoFetchEvidence.ts
export function useAutoFetchEvidence(
  tripId: string | null,
  options: {
    enabled?: boolean;
    silent?: boolean; // 静默模式，不显示加载状态
  } = {}
) {
  const { enabled = true, silent = false } = options;
  const [fetching, setFetching] = useState(false);
  const { status, checkStatus } = useEvidenceStatus(tripId);

  useEffect(() => {
    if (!enabled || !tripId || !status) return;
    
    // 如果缺少证据，自动获取
    if (status.missingCount > 0 && !status.hasWeather) {
      const fetchEvidence = async () => {
        if (!silent) setFetching(true);
        try {
          await planningWorkbenchApi.fetchEvidence(tripId);
          // 刷新状态
          await checkStatus();
        } catch (err) {
          console.error('Auto fetch evidence failed:', err);
          // 静默失败，不打扰用户
        } finally {
          if (!silent) setFetching(false);
        }
      };
      
      // 延迟执行，避免阻塞页面加载
      const timer = setTimeout(fetchEvidence, 1000);
      return () => clearTimeout(timer);
    }
  }, [tripId, status, enabled, silent, checkStatus]);

  return { fetching, status };
}
```

#### 3. 在 ReadinessDrawer 中集成
```typescript
// src/components/readiness/ReadinessDrawer.tsx
export default function ReadinessDrawer({ tripId, ... }) {
  // 自动获取证据（静默模式）
  useAutoFetchEvidence(tripId, {
    enabled: true,
    silent: true, // 不显示加载状态，后台静默获取
  });

  // ... 其他代码
}
```

#### 4. 优化：避免重复调用
```typescript
// 使用 sessionStorage 记录已获取的证据
const EVIDENCE_FETCH_KEY = `evidence-fetched-${tripId}`;

useEffect(() => {
  const alreadyFetched = sessionStorage.getItem(EVIDENCE_FETCH_KEY);
  if (alreadyFetched) return; // 本次会话已获取，跳过

  // 获取证据
  fetchEvidence().then(() => {
    sessionStorage.setItem(EVIDENCE_FETCH_KEY, 'true');
  });
}, [tripId]);
```

---

## 📊 方案对比

| 方案 | 用户体验 | 实现复杂度 | 性能影响 | 推荐度 |
|------|---------|-----------|---------|--------|
| **方案A：完全自动化** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | **⭐⭐⭐⭐⭐** |
| 方案B：智能提示 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 方案C：统一数据源 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐（长期） |

---

## ✅ 推荐实施步骤

### Phase 1：快速优化（1-2天）
1. ✅ 实现 `useEvidenceStatus` Hook
2. ✅ 实现 `useAutoFetchEvidence` Hook（静默模式）
3. ✅ 在 `ReadinessDrawer` 中集成自动获取
4. ✅ 添加 sessionStorage 缓存，避免重复调用

### Phase 2：用户体验优化（3-5天）
1. ✅ 添加"正在同步证据数据..."的轻量提示（可选）
2. ✅ 优化错误处理（静默失败，不打扰用户）
3. ✅ 添加证据获取进度显示（如果需要）

### Phase 3：长期优化（未来）
1. ✅ 考虑统一数据源方案
2. ✅ 优化 API 调用频率（智能缓存）
3. ✅ 考虑离线支持

---

## 🎯 验收标准

### 产品验收
- [ ] 用户打开行程页面后，无需手动操作即可看到准确的准备度评分
- [ ] 不再出现"天气已显示但证据缺失"的矛盾情况
- [ ] 系统自动获取证据的过程不打断用户操作

### 技术验收
- [ ] 代码类型安全（TypeScript）
- [ ] 组件可复用（Hook 化）
- [ ] 性能优化（避免重复调用）
- [ ] 错误处理完善（静默失败）

---

## 📝 注意事项

1. **API 调用频率**：避免过于频繁的调用，使用缓存和防抖
2. **错误处理**：静默失败，不打扰用户，但记录日志
3. **性能影响**：异步执行，不阻塞页面加载
4. **用户体验**：保持流畅，避免闪烁和加载状态

---

## 🔗 相关文件

- `src/components/readiness/ReadinessDrawer.tsx` - 准备度抽屉
- `src/api/planning-workbench.ts` - 证据获取 API
- `src/hooks/useWeather.ts` - 天气数据 Hook
- `src/components/weather/WeatherCard.tsx` - 天气显示组件
