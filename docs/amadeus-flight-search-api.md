# 航班查询接口

## 1. 搜索航班

### 请求

```
POST /api/amadeus/search/flights
Content-Type: application/json
```

### 请求体

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| originLocationCode | string | ✅ | 出发地 IATA 代码（如 SYD、PEK、PVG） |
| destinationLocationCode | string | ✅ | 目的地 IATA 代码（如 BKK、HKG） |
| departureDate | string | ✅ | 出发日期，YYYY-MM-DD |
| adults | number | ✅ | 成人数（1–9） |
| returnDate | string | 否 | 返程日期（往返） |
| children | number | 否 | 儿童数 |
| infants | number | 否 | 婴儿数 |
| travelClass | string | 否 | ECONOMY / PREMIUM_ECONOMY / BUSINESS / FIRST |
| includedAirlineCodes | string | 否 | 包含的航司代码，逗号分隔 |
| excludedAirlineCodes | string | 否 | 排除的航司代码，逗号分隔 |
| nonStop | boolean | 否 | 是否仅直飞 |
| currencyCode | string | 否 | 货币代码（如 EUR、USD） |
| maxPrice | number | 否 | 每人最高价格 |
| max | number | 否 | 返回航班数量上限 |

### 请求示例

```bash
curl -X POST http://localhost:3000/api/amadeus/search/flights \
  -H "Content-Type: application/json" \
  -d '{
    "originLocationCode": "SYD",
    "destinationLocationCode": "BKK",
    "departureDate": "2026-05-02",
    "adults": 1,
    "max": 5
  }'
```

### 响应

每个航班需包含以下扩展字段（前端展示用）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookingUrl` | string | Google Flights 比价/预订链接 |
| `actions` | array | 操作列表，与铁路一致 |

**bookingUrl 格式**（Google Flights）：
```
https://www.google.com/travel/flights?q=Flights%20from%20{origin}%20to%20{destination}%20on%20{date}
```
示例：`https://www.google.com/travel/flights?q=Flights%20from%20HGH%20to%20KEF%20on%202026-02-22`

**actions 结构**：
```json
[
  { "action": "view_flight_detail", "label": "View Details", "labelCN": "查看详情", "params": { "flightIndex": 0 } },
  { "action": "add_flight_to_itinerary", "label": "Add to Trip", "labelCN": "加入行程", "params": { "flightIndex": 0 } },
  { "action": "book_flight", "label": "Book", "labelCN": "预订", "params": { "flightIndex": 0, "bookingUrl": "..." } }
]
```

**原始响应示例**：
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "type": "flight-offer",
        "id": "...",
        "price": { "currency": "EUR", "total": "190.49" },
        "itineraries": [
          {
            "segments": [
              {
                "departure": { "iataCode": "SYD", "at": "2026-05-02T..." },
                "arrival": { "iataCode": "BKK", "at": "2026-05-02T..." },
                "carrierCode": "TG",
                "number": "476"
              }
            ]
          }
        ],
        "bookingUrl": "https://www.google.com/travel/flights?q=Flights%20from%20SYD%20to%20BKK%20on%202026-05-02",
        "actions": [
          { "action": "view_flight_detail", "label": "View Details", "labelCN": "查看详情", "params": { "flightIndex": 0 } },
          { "action": "add_flight_to_itinerary", "label": "Add to Trip", "labelCN": "加入行程", "params": { "flightIndex": 0 } },
          { "action": "book_flight", "label": "Book", "labelCN": "预订", "params": { "flightIndex": 0, "bookingUrl": "..." } }
        ]
      }
    ]
  }
}
```
