# 设置页 Airbnb 集成 API

设置页 IntegrationCard 通过 `integrationsApi` 调用的接口。

**Base URL**: `/api/integrations/airbnb`

## 授权流程说明

是的，授权会打开 Airbnb 账号页面并完成绑定：

1. **用户点击「连接 Airbnb」** → 前端调用 `GET /auth/url` 获取 `authUrl`
2. **打开 authUrl**（新窗口/标签页）→ 跳转到 Smithery 授权页 → 再跳转到 **Airbnb 登录/授权页**
3. **用户在 Airbnb 登录**（若未登录）并点击「允许」授权应用
4. **授权完成** → Smithery 处理回调，后端通过 `connectionId` 建立绑定
5. **前端调用 `POST /auth/verify`**（传入 `state`）→ 确认绑定成功，更新 UI 为「已连接」

绑定信息（connectionId/token）由 Smithery 托管，后端仅保存 connectionId 用于后续调用 Airbnb API。

## 测试

确保 `npm run dev` 已启动，然后运行：

```bash
npm run test:integrations:airbnb
```

或手动 curl：

```bash
# 1. 查询授权状态
curl -s http://localhost:3000/api/integrations/airbnb/auth/status

# 2. 获取授权 URL
curl -s http://localhost:3000/api/integrations/airbnb/auth/url

# 3. 验证授权 (需替换 state 为 auth/url 返回的 state)
curl -s -X POST http://localhost:3000/api/integrations/airbnb/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"state":"meadowlark-xxx"}'

# 4. 撤销授权
curl -s -X DELETE http://localhost:3000/api/integrations/airbnb/auth
```

## 接口列表

| 接口 | 方法 | 用途 |
|------|------|------|
| `/auth/url` | GET | 获取 Airbnb 授权 URL，用于跳转授权 |
| `/auth/status` | GET | 查询当前授权状态 |
| `/auth/verify` | POST | 授权回调后，用 code/state 换取 token |
| `/auth` | DELETE | 撤销授权 |

---

## 1. GET /auth/url

获取授权 URL。前端应在新窗口打开此 URL，用户将跳转到 Airbnb 登录页完成授权并绑定账号。

**响应**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://auth.smithery.ai/...",
    "state": "meadowlark-bEDi"
  }
}
```

- `authUrl`: 用户需访问的授权 URL
- `state`: connectionId，verify 时需回传

---

## 2. GET /auth/status

查询授权状态。

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "authorized",
    "connectionId": "meadowlark-bEDi"
  }
}
```

`status` 取值:
- `authorized`: 已授权
- `unauthorized`: 未授权
- `pending`: 有 connectionId 但尚未完成 OAuth

---

## 3. POST /auth/verify

授权完成后验证。Smithery 流程使用 `state`（即 connectionId）。

**请求体**:
```json
{
  "state": "meadowlark-bEDi"
}
```

或（标准 OAuth）:
```json
{
  "code": "xxx",
  "state": "meadowlark-bEDi"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "authorized",
    "message": "授权成功"
  }
}
```

---

## 4. DELETE /auth

撤销授权，清除本地保存的 connectionId。

**响应**:
```json
{
  "success": true,
  "data": {
    "message": "授权已撤销"
  }
}
```

---

## 与 /api/airbnb/* 的差异

| 字段 | /api/airbnb/* | /api/integrations/airbnb/* |
|------|---------------|---------------------------|
| 授权 URL | `authorizationUrl` | `authUrl` |
| 状态标识 | `connectionId` | `state` |
| 状态检查 | `isAuthorized` | `status: 'authorized' \| 'unauthorized' \| 'pending'` |
