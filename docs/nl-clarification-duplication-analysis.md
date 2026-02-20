# 重复澄清问题 - 根因分析与修复

**日期**: 2026-02-19  
**现象**: 用户选择澄清选项后，出现重复的用户消息或重复的「已识别/已收集」确认

---

## 一、问题分类

| 类型 | 现象 | 可能原因 |
|------|------|----------|
| 用户消息重复 | 同一条用户消息出现两次 | 前端 sendMessage 被调用两次 |
| 确认消息冗余 | 「✔ 已识别」「✅ 已收集所有答案」与后端回复重复 | 前端 + 后端都生成确认文案 |

---

## 二、根因分析

### 2.1 用户消息重复（前端）

**位置**: `NLChatInterface.tsx` - `sendMessage` 与 `onAnswersChange`

**根因**:
1. **防重复使用 state**：`lastSubmittedMessageId` 为 state，更新异步。若 2 秒内连续两次调用 `sendMessage`，第二次可能仍读到 `null`，无法拦截。
2. **自动提交防重使用 state**：`autoSubmittingMessageId` 为 state。若 `onAnswersChange` 在极短时间内触发两次（如多题同时更新），两次都可能看到 `autoSubmittingMessageId === null`，导致：
   - 添加两次「✅ 已收集所有答案」
   - 启动两个 1.5 秒定时器
   - 1.5 秒后 `sendMessage` 被调用两次

### 2.2 确认消息冗余（前端 + 后端）

**前端**:
- 自动提交时添加「✅ 已收集所有答案：${answerSummary}」
- 从文本提取答案时添加「✅ 已识别到 X 个答案：${answerPreview}」

**后端**:
- plannerReply 中可能包含「✔ 已识别: 是的,时间准确」等确认文案

**结果**: 用户看到多段语义相近的确认，体验冗余。

---

## 三、修复建议

### 3.1 前端：用 ref 做同步防重（P0）

- 将 `lastSubmittedMessageId` 改为 `useRef`，在 `sendMessage` 内同步读写
- 将 `autoSubmittingMessageId` 改为 `useRef`，在 `onAnswersChange` 内同步读写
- 保证同一逻辑在极短时间内只会执行一次

### 3.2 前端：弱化或移除「已识别」反馈（P1）

- 方案 A：移除「✅ 已识别到 X 个答案」反馈，仅保留「✅ 已收集所有答案」
- 方案 B：将「已识别」改为更轻量的提示（如仅图标或短文案），避免与后端重复

### 3.3 后端：统一确认文案（P2）

- 后端在 plannerReply 中避免重复输出「✔ 已识别: xxx」
- 或通过字段（如 `skipConfirmationEcho`）告知前端不要展示本地确认

---

## 四、已实施修复（2026-02-19）

1. **sendMessage 防重**：`lastSubmittedContentRef` 用 `useRef` 替代 state，同步检查避免重复提交
2. **自动提交防重**：`autoSubmittingMessageIdRef` 用 `useRef`，在 `onAnswersChange` 内同步设置，避免两次进入
3. **移除「已识别」反馈**：用户输入框输入答案时不再添加「✅ 已识别到 X 个答案」，避免与后端 plannerReply 重复

## 五、验收标准

- [x] 快速连续选择多个选项时，仅触发一次自动提交
- [x] 用户消息在对话中仅出现一次
- [x] 「已收集/已识别」类确认不重复
