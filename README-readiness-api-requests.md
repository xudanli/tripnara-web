# 准备度数据 - API 请求说明

## 主要请求接口（按优先级）

### 1. 主要接口（首选）⭐
**接口**: `GET /api/readiness/trip/:tripId?lang=zh`
- **调用位置**: `src/pages/readiness/index.tsx` 第 166 行
- **函数**: `readinessApi.getTripReadiness(tripId, getLangCode())`
- **参数**: 
  - `tripId`: 行程ID
  - `lang`: 语言代码（'zh' 或 'en'），根据当前选择的语言自动传递
- **返回**: `ReadinessCheckResult` 格式
- **Network 标签中的请求名**: `readiness/trip/{tripId}?lang=zh` (或 `?lang=en`)

### 2. 备用方案1（如果主要接口失败）
**接口**: `POST /api/readiness/check`
- **调用位置**: `src/pages/readiness/index.tsx` 第 200 行
- **函数**: `readinessApi.check(checkDto)`
- **返回**: `ReadinessCheckResult` 格式
- **Network 标签中的请求名**: `readiness/check`

### 3. 备用方案2（如果备用方案1也失败）
**接口1**: `GET /api/readiness/personalized-checklist?tripId=xxx&lang=zh`
- **调用位置**: `src/pages/readiness/index.tsx` 第 214 行
- **函数**: `readinessApi.getPersonalizedChecklist(tripId, getLangCode())`
- **Network 标签中的请求名**: `readiness/personalized-checklist?tripId=xxx&lang=zh`

**接口2**: `GET /api/readiness/risk-warnings?tripId=xxx&lang=zh`
- **调用位置**: `src/pages/readiness/index.tsx` 第 218 行
- **函数**: `readinessApi.getRiskWarnings(tripId, getLangCode())`
- **Network 标签中的请求名**: `readiness/risk-warnings?tripId=xxx&lang=zh`

## 在浏览器中查看请求

### 步骤：
1. 打开准备度页面（例如：`/dashboard/readiness?tripId=b0e5ab97-743d-428d-9b8e-b91f552deb2f`）
2. 打开浏览器开发者工具（F12）
3. 切换到 **Network（网络）** 标签
4. 刷新页面
5. 在 Network 标签中查找以下请求（按优先级）：

### 主要请求（最有可能看到的）：
- **请求名**: `readiness/trip/b0e5ab97-743d-428d-9b8e-b91f552deb2f?lang=zh`
- **方法**: GET
- **状态码**: 200（成功）或 404（未实现，会使用备用方案）

### 如果主要接口失败，会看到：
- `readiness/check` (POST 请求)
- 或 `readiness/personalized-checklist` 和 `readiness/risk-warnings` (GET 请求)

## 当前实现的语言参数支持

所有相关接口都支持 `lang` 参数：
- 当用户选择中文时：`?lang=zh`
- 当用户选择英文时：`?lang=en` 或没有参数（默认英文）

