# 身份资产授信 — 生产网关对接（前端）

PRD 3.1.3 · `CredentialVerificationGateway` · 前端对接摘要

---

## API 路径（TripNARA 后端 BFF）

| 通道 | Method | Path | Body |
|------|--------|------|------|
| 学信网 | POST | `/odyssey-intake/credentials/education/verify` | `{ verificationCode }` |
| 邮箱发码 | POST | `/odyssey-intake/credentials/profession/email/send-code` | `{ workEmail }` |
| 邮箱验码 | POST | `/odyssey-intake/credentials/profession/email/verify` | `{ workEmail, code }` |
| 工牌上传 | POST | `/odyssey-intake/credentials/profession/badge/upload` | `multipart file` |
| 工牌认证 | POST | `/odyssey-intake/credentials/profession/badge/verify` | `{ imageToken }` |
| OAuth | POST | `/odyssey-intake/credentials/profession/oauth/verify` | `{ provider, authToken }` |
| 本人读取 | GET | `/odyssey-intake/credentials/me` | — |
| 他人只读 | GET | `/match-square/users/:userId/credentials` | `?postId=` |

## hybrid 开发

`send-code` 响应可能含 `devCode`（无 MAIL 网关时）；前端自动填入 OTP 并 toast 提示。

## 前端 hooks

```typescript
useVerifyOdysseyEducation()      // verificationCode
useSendWorkEmailCode()           // → { sent, devCode? }
useVerifyWorkEmail()             // { workEmail, code }
useUploadProfessionBadge(file)
useVerifyProfessionBadge(token)
useVerifyProfessionOAuth({ provider, authToken })
```

## 验收清单

- [ ] 请求体字段与上表一致（勿传校名/公司名）
- [ ] 响应归一化走 `normalizeOdysseyCredentialsMe`
- [ ] 认证成功后广场 `PlazaSelfStateBar` / Card 背书行更新
- [ ] 标签仅 via `VerifiedAssetBadge`（水印防爬）

相关：[decision-os-identity-verification-prd-3.1.3.md](./decision-os-identity-verification-prd-3.1.3.md)
