# API 使用说明

## 用户信息接口

### 获取用户偏好

```typescript
import { userApi } from '@/api/user';

// 直接调用 API
const profile = await userApi.getProfile();
console.log('用户偏好:', profile.preferences);

// 使用 Hook（推荐）
import { useUserPreferences } from '@/hooks/useUserPreferences';

function MyComponent() {
  const { profile, preferences, loading, error, fetchProfile } = useUserPreferences();
  
  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  
  return (
    <div>
      {preferences ? (
        <div>用户偏好: {JSON.stringify(preferences)}</div>
      ) : (
        <div>未设置偏好</div>
      )}
    </div>
  );
}
```

### 更新用户偏好

```typescript
import { useUserPreferences } from '@/hooks/useUserPreferences';

function PreferencesForm() {
  const { updateProfile, updating } = useUserPreferences();
  
  const handleSubmit = async (preferences) => {
    try {
      await updateProfile(preferences);
      alert('更新成功');
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };
  
  // ...
}
```

## 系统状态接口

### 获取系统状态

```typescript
import { systemApi } from '@/api/system';

// 直接调用 API
const status = await systemApi.getStatus();
console.log('OCR Provider:', status.ocrProvider);
console.log('LLM Provider:', status.llmProvider);

// 使用 Hook（推荐）
import { useSystemStatus } from '@/hooks/useSystemStatus';

function MyComponent() {
  const {
    status,
    loading,
    isVisionAvailable,
    isLLMAvailable,
    validateVisionFile,
  } = useSystemStatus();
  
  if (loading) return <div>加载系统状态中...</div>;
  
  return (
    <div>
      {isVisionAvailable() && (
        <button>上传图片</button>
      )}
      {!isLLMAvailable() && (
        <div>LLM 功能暂不可用</div>
      )}
    </div>
  );
}
```

### 检查功能可用性

```typescript
const {
  isVisionAvailable,
  isVoiceAvailable,
  isLLMAvailable,
  isPOIAvailable,
  isWhatIfAvailable,
} = useSystemStatus();

// 根据功能可用性显示/隐藏 UI
{isVisionAvailable() && <VisionUploadButton />}
{isVoiceAvailable() && <VoiceInputButton />}
{isLLMAvailable() && <LLMFeatureButton />}
```

### 验证文件上传

```typescript
const { validateVisionFile } = useSystemStatus();

const handleFileSelect = (file: File) => {
  const result = validateVisionFile(file);
  if (!result.valid) {
    alert(result.error);
    return;
  }
  // 继续处理文件
};
```

