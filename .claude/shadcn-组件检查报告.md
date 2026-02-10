# Shadcn UI 组件使用情况检查报告

## 📋 检查范围
- 检查时间：2026-02-10
- 检查目标：找出所有未使用 shadcn/ui 组件的组件文件
- 检查方法：查找所有组件文件，检查是否从 `@/components/ui/` 导入组件

---

## ❌ 未使用 Shadcn 的组件列表

### 1. **布局组件 (Layout Components)**

#### `src/components/layout/WebsiteNavbar.tsx`
**问题：**
- ❌ 使用原生 `<button>` 元素而不是 `Button` 组件
- ❌ 使用内联样式 (`style={}`) 而不是 Tailwind 类名
- ❌ 自定义下拉菜单实现，未使用 `DropdownMenu` 组件
- ❌ 导航链接使用原生 `<Link>` + 内联样式

**建议修改：**
```tsx
// 当前代码（第138行）
<button onClick={() => handleDropdownToggle(item.key)} className={...}>

// 应改为
import { Button } from '@/components/ui/button';
<Button variant="ghost" onClick={() => handleDropdownToggle(item.key)}>

// 当前代码（第152-211行）- 自定义下拉菜单
<div style={{ position: 'absolute', ... }}>

// 应改为
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
```

#### `src/components/layout/Footer.tsx`
**问题：**
- ❌ 使用原生 `<button>` 元素（第66行）
- ✅ 其他部分使用 Tailwind 类名，相对较好

**建议修改：**
```tsx
// 当前代码（第66行）
<button onClick={() => setContactUsOpen(true)} className="...">

// 应改为
import { Button } from '@/components/ui/button';
<Button variant="ghost" onClick={() => setContactUsOpen(true)}>
```

#### `src/components/layout/Layout.tsx`
**状态：** 需要检查

#### `src/components/layout/WebsiteLayout.tsx`
**状态：** 需要检查

---

### 2. **通用组件 (Common Components)**

#### `src/components/common/LanguageSwitcher.tsx`
**问题：**
- ❌ 使用原生 `<button>` 元素而不是 `Button` 组件
- ❌ 自定义按钮样式，未使用 shadcn 的 Button variants

**建议修改：**
```tsx
// 当前代码（第17-27行，第28-38行）
<button onClick={() => changeLanguage('en')} className={cn(...)}>

// 应改为
import { Button } from '@/components/ui/button';
<Button 
  variant={isActive('en') ? 'default' : 'outline'}
  size="sm"
  onClick={() => changeLanguage('en')}
>
```

#### `src/components/common/Logo.tsx`
**状态：** ✅ 正常（纯展示组件，使用图片和文本，无需 shadcn）

#### `src/components/common/UnsplashAttribution.tsx`
**状态：** 需要检查

#### `src/components/common/ErrorBoundary.tsx`
**状态：** 需要检查

---

### 3. **其他需要检查的组件**

以下组件文件未从 `@/components/ui/` 导入任何组件，需要进一步检查：

1. `src/components/layout/WebsiteLayout.tsx`
2. `src/components/layout/Layout.tsx`
3. `src/components/common/UnsplashAttribution.tsx`
4. `src/components/common/ErrorBoundary.tsx`

---

## ✅ 已正确使用 Shadcn 的组件示例

### 良好实践示例：

#### `src/components/common/PersonaModeToggle.tsx`
- ✅ 使用 `Button` 组件
- ✅ 使用 `DropdownMenu` 系列组件
- ✅ 使用 `cn()` 工具函数

#### `src/components/common/ContactUsDialog.tsx`
- ✅ 使用 `Dialog` 组件
- ✅ 使用 `Button` 组件
- ✅ 使用 `Textarea` 组件
- ✅ 使用 `Label` 组件
- ⚠️ 但仍有一些原生 `<button>` 和 `<input>` 元素（图片上传部分）

---

## 🔧 修复优先级

### 🔴 高优先级（影响用户体验和设计一致性）

1. **`WebsiteNavbar.tsx`**
   - 影响：网站主导航栏，用户第一印象
   - 问题：大量内联样式，自定义下拉菜单
   - 建议：全面重构使用 shadcn 组件

2. **`LanguageSwitcher.tsx`**
   - 影响：语言切换功能，使用频率高
   - 问题：按钮样式不一致
   - 建议：使用 `Button` 组件的 variants

### 🟡 中优先级

3. **`Footer.tsx`**
   - 影响：页面底部，相对次要
   - 问题：单个按钮未使用 shadcn
   - 建议：快速修复

### 🟢 低优先级

4. **其他需要检查的文件**
   - 建议：逐个检查，确认是否需要使用 shadcn

---

## 📝 修复建议

### 通用修复模式：

1. **替换原生按钮**
   ```tsx
   // ❌ 错误
   <button className="px-3 py-1 rounded border">点击</button>
   
   // ✅ 正确
   import { Button } from '@/components/ui/button';
   <Button variant="outline" size="sm">点击</Button>
   ```

2. **替换自定义下拉菜单**
   ```tsx
   // ❌ 错误
   <div style={{ position: 'absolute', ... }}>
     {items.map(item => <Link>...</Link>)}
   </div>
   
   // ✅ 正确
   import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button>菜单</Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent>
       {items.map(item => (
         <DropdownMenuItem asChild>
           <Link to={item.path}>...</Link>
         </DropdownMenuItem>
       ))}
     </DropdownMenuContent>
   </DropdownMenu>
   ```

3. **移除内联样式**
   ```tsx
   // ❌ 错误
   <div style={{ backgroundColor: '#fff', border: '2px solid ...' }}>
   
   // ✅ 正确
   <div className="bg-white border-2 border-gray-200">
   ```

---

## 🎯 下一步行动

1. **立即修复：**
   - [ ] `WebsiteNavbar.tsx` - 重构导航栏使用 shadcn 组件
   - [ ] `LanguageSwitcher.tsx` - 使用 Button 组件

2. **检查并修复：**
   - [ ] `Footer.tsx` - 替换按钮组件
   - [ ] `ContactUsDialog.tsx` - 检查图片上传部分的按钮和输入框

3. **进一步检查：**
   - [ ] `Layout.tsx`
   - [ ] `WebsiteLayout.tsx`
   - [ ] `UnsplashAttribution.tsx`
   - [ ] `ErrorBoundary.tsx`

---

## 📚 参考资源

- Shadcn UI 文档：https://ui.shadcn.com/
- 项目中的 shadcn 组件：`src/components/ui/`
- 组件测试页：`src/pages/UiTest.tsx`（可参考正确用法）

---

**报告生成时间：** 2026-02-10
**检查人员：** AI Assistant
**建议审核人员：** 视觉设计师、前端工程师
