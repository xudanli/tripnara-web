# 用户偏好 API 对接说明

本文档说明如何在项目中使用用户偏好 API。

## 文件结构

```
src/
├── api/
│   └── user.ts              # 用户偏好 API 接口和类型定义
└── hooks/
    └── useUserPreferences.ts # 用户偏好 Hook
```

## 快速开始

### 1. 基本使用

```tsx
import { useUserPreferences } from '@/hooks/useUserPreferences';

function PreferencesPage() {
  const {
    preferences,
    loading,
    error,
    updateProfile,
    updating,
  } = useUserPreferences();

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  const handleUpdate = async () => {
    try {
      await updateProfile({
        preferredAttractionTypes: ['ATTRACTION', 'NATURE'],
        dietaryRestrictions: ['VEGETARIAN'],
        preferOffbeatAttractions: false,
        travelPreferences: {
          pace: 'LEISURE',
          budget: 'MEDIUM',
          accommodation: 'COMFORTABLE',
        },
      });
      alert('更新成功！');
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  return (
    <div>
      {preferences ? (
        <div>
          <h2>您的偏好</h2>
          <pre>{JSON.stringify(preferences, null, 2)}</pre>
          <button onClick={handleUpdate} disabled={updating}>
            {updating ? '更新中...' : '更新偏好'}
          </button>
        </div>
      ) : (
        <div>
          <p>您还没有设置偏好</p>
          <button onClick={handleUpdate}>设置偏好</button>
        </div>
      )}
    </div>
  );
}
```

### 2. Hook API

`useUserPreferences` Hook 提供以下功能：

```typescript
const {
  profile,          // 完整的用户画像数据 (UserProfile | null)
  preferences,      // 用户偏好配置 (UserPreferences | null)
  loading,          // 加载状态 (boolean)
  updating,         // 更新状态 (boolean)
  error,            // 获取错误信息 (string | null)
  updateError,      // 更新错误信息 (string | null)
  fetchProfile,     // 手动获取用户偏好 (function)
  updateProfile,    // 更新用户偏好 (function)
  clearError,       // 清除错误状态 (function)
  hasPreferences,   // 是否有偏好设置 (boolean)
} = useUserPreferences(autoFetch?: boolean);
```

**参数**:
- `autoFetch` (可选, 默认: `true`): 是否在组件挂载时自动获取用户偏好

### 3. 直接使用 API

如果不使用 Hook，也可以直接调用 API：

```typescript
import { userApi } from '@/api/user';

// 获取用户偏好
try {
  const profile = await userApi.getProfile();
  console.log('用户偏好:', profile.preferences);
} catch (error) {
  console.error('获取失败:', error);
}

// 更新用户偏好
try {
  const updated = await userApi.updateProfile({
    preferredAttractionTypes: ['ATTRACTION'],
    preferOffbeatAttractions: true,
  });
  console.log('更新成功:', updated);
} catch (error) {
  console.error('更新失败:', error);
}
```

## 类型定义

### UserPreferences

```typescript
interface UserPreferences {
  preferredAttractionTypes?: string[];
  dietaryRestrictions?: string[];
  preferOffbeatAttractions?: boolean;
  travelPreferences?: {
    pace?: 'LEISURE' | 'MODERATE' | 'FAST';
    budget?: 'LOW' | 'MEDIUM' | 'HIGH';
    accommodation?: 'BUDGET' | 'COMFORTABLE' | 'LUXURY';
  };
  other?: Record<string, any>;
}
```

### UserProfile

```typescript
interface UserProfile {
  userId: string;
  preferences: UserPreferences | null;
  createdAt: string;
  updatedAt: string;
}
```

## 错误处理

API 会抛出 `UserProfileApiError` 错误，包含错误码和错误消息：

```typescript
import { UserProfileApiError } from '@/api/user';

try {
  await userApi.getProfile();
} catch (error) {
  if (error instanceof UserProfileApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        // 未认证，需要重新登录
        console.error('需要登录');
        break;
      case 'VALIDATION_ERROR':
        // 验证错误
        console.error('参数错误:', error.message);
        break;
      default:
        console.error('其他错误:', error.message);
    }
  }
}
```

## 常见场景

### 场景 1: 显示用户偏好设置页面

```tsx
function PreferencesSettings() {
  const { preferences, loading, updateProfile, updating } = useUserPreferences();

  const handleSave = async (newPreferences: UserPreferences) => {
    await updateProfile(newPreferences);
  };

  // ... 渲染表单
}
```

### 场景 2: 在行程规划中使用偏好

```tsx
function TripPlanning() {
  const { preferences, loading } = useUserPreferences();

  useEffect(() => {
    if (preferences) {
      // 使用用户偏好来推荐行程
      console.log('根据偏好推荐:', preferences);
    }
  }, [preferences]);

  // ... 其他逻辑
}
```

### 场景 3: 部分更新偏好

```tsx
function UpdatePaceOnly() {
  const { preferences, updateProfile } = useUserPreferences();

  const handleChangePace = async (pace: 'LEISURE' | 'MODERATE' | 'FAST') => {
    // 只更新节奏偏好，其他保持不变
    await updateProfile({
      travelPreferences: {
        ...preferences?.travelPreferences,
        pace,
      },
    });
  };

  // ... 渲染 UI
}
```

## 注意事项

1. **认证要求**: 所有 API 都需要用户登录，Token 会自动从 `sessionStorage` 获取
2. **自动刷新 Token**: 如果 Token 过期，API 客户端会自动尝试刷新
3. **部分更新**: 更新接口支持部分更新，只需传入需要修改的字段
4. **空值处理**: 如果用户未设置偏好，`preferences` 为 `null`

## 相关文件

- API 接口: `src/api/user.ts`
- Hook: `src/hooks/useUserPreferences.ts`
- API 客户端: `src/api/client.ts` (处理认证和错误)

