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
