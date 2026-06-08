# Vision API - 拍照识别 POI 推荐

## 一、REST API：拍照识别 POI 推荐

**接口：** `POST /vision/poi-recommend`

**作用：** 上传图片，通过 OCR 提取文字，再结合位置搜索附近 POI，返回候选列表和「加入行程」建议。

**适用场景：** 招牌、菜单、路牌、景点介绍牌等。

**请求方式：** `multipart/form-data`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | File | 是 | 图片文件（jpeg/png/heic/webp，最大 6MB） |
| lat | number | 是 | 用户当前纬度 |
| lng | number | 是 | 用户当前经度 |
| locale | string | 否 | 语言，如 zh-CN、ja-JP、en-US |

### 调用示例

```bash
curl -X POST http://localhost:3000/api/vision/poi-recommend \
  -F "image=@/path/to/menu.jpg" \
  -F "lat=35.6762" \
  -F "lng=139.6503" \
  -F "locale=zh-CN"
```

### 返回示例

```json
{
  "success": true,
  "data": {
    "ocrResult": {
      "fullText": "东京塔\n营业时间：9:00-22:00\n地址：港区芝公园4-2-8",
      "lines": ["东京塔", "营业时间：9:00-22:00", "地址：港区芝公园4-2-8"]
    },
    "candidates": [
      {
        "id": "poi_xxx",
        "name": "东京塔",
        "lat": 35.6586,
        "lng": 139.7454,
        "distanceM": 500,
        "rating": 4.5,
        "isOpenNow": true
      }
    ],
    "suggestions": [
      {
        "id": "vision:xxx",
        "title": "东京塔",
        "confidence": "HIGH",
        "action": { "type": "ADD_POI_TO_SCHEDULE", "poiId": "poi_xxx" }
      }
    ]
  }
}
```

---

## 二、能力查询

**接口：** `GET /vision/capabilities`

用于查询支持的格式、大小等，便于前端在上传前校验。

### 返回示例

```json
{
  "success": true,
  "data": {
    "supportedFormats": ["image/jpeg", "image/png", "image/heic", "image/webp"],
    "maxFileSize": 6291456,
    "maxFileSizeMB": 6,
    "supportsHeic": true,
    "requiresCompression": false,
    "compressionRecommendation": "建议上传前压缩到 2MB 以下以获得更好的性能"
  }
}
```

---

## 三、OCR 能力说明

### 当前实现

| 项目 | 说明 |
|------|------|
| **OCR 提供者** | 默认：MockOcrProvider（返回固定测试文本）<br>可选：GoogleOcrProvider（真实 OCR，需配置 GOOGLE_VISION_API_KEY） |
| **REST 接口** | 目前只通过 `POST /vision/poi-recommend` 暴露 OCR 结果，没有单独的「纯 OCR」接口 |
| **MCP 工具** | `ocr.extractText`：输入 base64 图片，返回 OCR 文本<br>`vision.poiRecommend`：上传图片 + 经纬度，返回 OCR + POI 推荐 |

---

## 四、前端使用

### 4.1 上传入口

- **规划助手**：点击输入框旁的「拍照识别」图标 → 选择图片文件
- **流程**：选图 → 获取定位（需授权）→ 调用 `POST /vision/poi-recommend` → 弹窗展示 OCR 结果 + 附近 POI

### 4.2 代码示例

```typescript
import { visionApi } from '@/api/vision';

// 拍照识别 POI 推荐
const result = await visionApi.poiRecommend(
  imageFile,
  35.6762,
  139.6503,
  'zh-CN'
);

// 获取能力（上传前校验）
const caps = await visionApi.getCapabilities();
```

---

## 五、常见问题：上传不同图片但显示数据都一样

**现象**：无论上传什么图片，OCR 结果和 POI 列表都相同（如始终显示「东京塔」等）。

**原因**：后端默认使用 **MockOcrProvider**，会返回固定的测试数据，不依赖图片内容。

**对应关系**：

| OCR 提供者   | 行为                     | 配置方式 |
|-------------|--------------------------|----------|
| MockOcrProvider | 固定文本，用于联调/演示   | 默认     |
| GoogleOcrProvider | 真实 OCR，按图片内容识别 | 需配置 `GOOGLE_VISION_API_KEY` |

**解决方案**：在后端环境变量中配置 Google Vision API Key，并切换为 GoogleOcrProvider，例如：

```bash
# .env 或部署环境变量
GOOGLE_VISION_API_KEY=your_google_vision_api_key
```

具体切换逻辑请参考后端 Vision 服务的实现（如通过环境变量选择 OCR 提供者）。
