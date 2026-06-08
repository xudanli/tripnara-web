# 3.1.3 身份资产授信与隐私保护规范

Decision OS · Asset Verification & Privacy Rules

> 产品规则见本文；**生产网关 HTTP 契约**见 [credential-verification-gateway.md](./credential-verification-gateway.md)

---

## 1. 学历认证：学信网在线授信

- **入口**：Identity Hub「学信网一键认证」
- **前端请求**：`POST /odyssey-intake/credentials/education/verify`  
  `{ "verificationCode": "CHSI_ONLINE_CODE" }`
- **禁止**：截图上传毕业证、手动填写校名
- **外显**：`🎓 985/211(已认证)` + `VerifiedAssetBadge`

## 2. 工作资历：多通道

| 通道 | 前端步骤 |
|------|----------|
| **企业邮箱** | `email/send-code` → 用户输入 6 位 → `email/verify` |
| **工牌 OCR** | `badge/upload` → `badge/verify`（原图服务端销毁） |
| **OAuth** | SDK 拿 code → `oauth/verify` `{ provider, authToken }` |

## 3. 隐私底线

- 只展示学历级别 + 院校档次 + 行业圈层（`privacy-labels.ts`）
- 未授信不可自定义社会背景
- 标签渲染：`VerifiedAssetBadge`（矢量 + 水印）

## 4. 广场同步

- `credentials-loader.ts` — live + localStorage 合并
- 本人招募帖：`applyViewerCredentialsToOwnPost`
- 他人视图：`GET /match-square/users/:userId/credentials`

## 5. 前端文件索引

| 文件 | 职责 |
|------|------|
| `api/odyssey-intake.ts` | 分通道 API |
| `hooks/useOdysseyCredentials.ts` | mutations |
| `IdentityHubSection.tsx` | 授信 UI |
| `VerifiedAssetBadge.tsx` | 已认证标签 |
