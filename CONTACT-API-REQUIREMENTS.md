# 联系我们功能 API 接口需求文档

## 概述

本文档描述了"联系我们"功能的 API 接口需求。用户可以通过该功能向系统发送反馈消息和图片。

## 接口规范

### 1. 发送联系消息

**接口路径：** `POST /contact/message`

**请求方式：** `POST`

**Content-Type：** `multipart/form-data`

**认证要求：** 可选（建议支持匿名用户提交，但如有认证信息则记录用户ID）

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| message | string | 否 | 用户输入的文本消息内容 |
| images | File[] | 否 | 图片文件数组，支持多图上传 |

**注意事项：**
- `message` 和 `images` 至少需要提供其中一项
- 图片格式限制：建议支持常见图片格式（jpg, jpeg, png, gif, webp）
- 单张图片大小限制：建议 5MB 以内
- 最多上传图片数量：建议 5 张
- 图片文件名应保留原始文件名（可选）

#### 请求示例

```http
POST /contact/message HTTP/1.1
Content-Type: multipart/form-data
Authorization: Bearer {access_token}  # 可选

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="message"

发现了错误或有好的想法要分享......
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="images"; filename="screenshot1.png"
Content-Type: image/png

[图片二进制数据]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="images"; filename="screenshot2.jpg"
Content-Type: image/jpeg

[图片二进制数据]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

#### 响应格式

**成功响应 (200 OK)**

```json
{
  "success": true,
  "message": "消息发送成功",
  "id": "contact_msg_1234567890"  // 可选：消息ID
}
```

**错误响应 (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "消息和图片不能同时为空"
  }
}
```

**错误响应 (413 Payload Too Large)**

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "图片文件过大，单个文件不能超过 5MB"
  }
}
```

**错误响应 (415 Unsupported Media Type)**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "不支持的图片格式，仅支持 jpg, jpeg, png, gif, webp"
  }
}
```

**错误响应 (429 Too Many Requests)**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "发送消息过于频繁，请稍后再试"
  }
}
```

#### 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| INVALID_REQUEST | 400 | 请求参数无效（如消息和图片都为空） |
| FILE_TOO_LARGE | 413 | 文件大小超过限制 |
| INVALID_FILE_TYPE | 415 | 不支持的文件类型 |
| TOO_MANY_FILES | 400 | 上传的图片数量超过限制（如超过5张） |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率过高，触发限流 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 数据库设计建议

### 联系消息表 (contact_messages)

```sql
CREATE TABLE contact_messages (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NULL,  -- 可为空，支持匿名提交
  message TEXT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, read, replied, resolved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);
```

### 联系消息图片表 (contact_message_images)

```sql
CREATE TABLE contact_message_images (
  id VARCHAR(255) PRIMARY KEY,
  contact_message_id VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,  -- 存储路径
  file_name VARCHAR(255) NOT NULL,  -- 原始文件名
  file_size BIGINT NOT NULL,  -- 文件大小（字节）
  mime_type VARCHAR(100) NOT NULL,  -- MIME类型
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id) ON DELETE CASCADE,
  INDEX idx_contact_message_id (contact_message_id)
);
```

## 业务逻辑建议

1. **文件存储：**
   - 建议将图片存储在对象存储服务（如 AWS S3、阿里云 OSS）或本地文件系统
   - 文件命名建议使用 UUID 或其他唯一标识符，避免文件名冲突
   - 考虑图片压缩和缩略图生成（可选）

2. **验证逻辑：**
   - 验证 message 和 images 至少有一个不为空
   - 验证图片文件类型
   - 验证图片文件大小
   - 验证图片数量不超过限制

3. **限流策略：**
   - 建议对匿名用户实施更严格的限流（如每小时 3 次）
   - 对已认证用户可放宽限制（如每小时 10 次）
   - 使用 IP 地址或用户 ID 作为限流标识

4. **通知机制：**
   - 建议在收到消息后发送邮件通知到客服邮箱（contact@tripnara.com）
   - 邮件内容应包含消息内容、用户信息（如有）、图片链接等

5. **安全性：**
   - 验证上传文件的 MIME 类型，防止恶意文件上传
   - 对上传的图片进行病毒扫描（可选）
   - 实施文件大小和数量限制，防止 DOS 攻击

## 前端实现说明

前端已实现的功能：

1. **组件位置：** `src/components/common/ContactUsDialog.tsx`
2. **API 客户端：** `src/api/contact.ts`
3. **功能特性：**
   - 支持文本消息输入
   - 支持拖拽上传图片
   - 支持剪贴板粘贴图片
   - 支持多图上传（最多5张）
   - 支持图片预览和删除
   - 支持表单验证
   - 支持加载状态和错误提示

4. **入口位置：**
   - Footer 导航栏中的"联系我们"链接

## 测试建议

1. **功能测试：**
   - 仅发送文本消息
   - 仅上传图片
   - 同时发送文本和图片
   - 上传多张图片（边界值：1张、5张、6张）
   - 上传超大文件（超过限制）
   - 上传非图片文件
   - 匿名用户提交
   - 已认证用户提交

2. **边界测试：**
   - 空消息和空图片
   - 超长文本消息
   - 特殊字符和 emoji

3. **性能测试：**
   - 并发上传测试
   - 大文件上传测试

4. **安全测试：**
   - 文件类型绕过测试
   - 恶意文件上传测试
   - XSS 攻击测试（文本消息）

## 后续扩展建议

1. **消息管理后台：**
   - 创建管理员后台查看和回复消息
   - 支持消息状态管理（待处理、已读、已回复、已解决）

2. **用户反馈：**
   - 在用户提交后显示确认页面
   - 支持用户查看自己提交的历史消息

3. **邮件回复：**
   - 支持通过邮件直接回复用户
   - 回复内容自动关联到原始消息

4. **统计分析：**
   - 统计消息提交数量
   - 分析常见问题类型
   - 跟踪问题解决率

