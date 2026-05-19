---
name: AI_Workflow_Enhancements
overview: Implement unified parameter modification, enhance Extractor to use cropped images, and add AI process traceability panel.
todos:
  - id: stage1-update-params
    content: 在 App.tsx 中定义 updateSheetMetalParams，并实现严格的数据校验逻辑
    status: completed
  - id: stage1-send-message
    content: 修改 CopilotChat 暴露 sendMessage 给 App.tsx，以便在 AI 数据校验失败时回复用户
    status: completed
  - id: stage1-refactor-onchange
    content: 更新各个组件 (ParameterControls, FlatPatternViewer) 使用统一的参数更新入口
    status: completed
  - id: stage1-robustness
    content: 在 ThreeDViewer 和 FlatPatternViewer 中增加数据鲁棒性校验 (防止渲染崩溃)
    status: completed
  - id: stage2-extractor-loop
    content: 修改 workflow.ts 的 extractorPhase，使其遍历处理 context.files 中的所有裁剪视图
    status: completed
  - id: stage4-sse-metadata
    content: 更新 sseManager.ts 和 types.ts，支持在 sendMessage 中传递 metadata (rawPrompt, rawResponse)
    status: completed
  - id: stage4-workflow-metadata
    content: 在 workflow.ts 中捕获并传递大模型的 Prompt 和 Response 到 metadata
    status: completed
  - id: stage4-ui-traceability
    content: 在 ChatMessage.tsx 中实现可折叠的 Traceability 面板，展示 AI 思考过程
    status: completed
isProject: false
---

# AI Workflow Enhancements Plan

## 1. 阶段一：统一数据修改入口 (Single Source of Truth)
**目标**：中央化参数更新逻辑，确保所有对 `SheetMetalParams` 的修改都经过统一的严格校验，防止前端渲染因脏数据崩溃。

- **`App.tsx`**:
  - 定义 `updateSheetMetalParams(updates: Partial<SheetMetalParams>, source: 'ai' | 'ui' = 'ui')` 函数。
  - 在函数内部增加严格的数据校验（如：`holeArray.count` 必须是正整数，`spacing` 必须大于0等）。
  - 如果 `source === 'ai'` 且校验失败，拦截更新并调用 `sendMessage('AI 生成的参数格式有误，请重试。')`。
  - 将 `handleCopilotParamsUpdate` 重构为调用 `updateSheetMetalParams(extractedParams, 'ai')`。
- **`components/CopilotChat/index.tsx`**:
  - 增加 `onSendMessageReady` prop，将 `sendMessage` 函数传递给 `App.tsx`，以便 `App.tsx` 在校验失败时发送提示消息。
- **`components/ParameterControls.tsx` & `components/FlatPatternViewer.tsx`**:
  - 将 `onChange` 回调重构为调用统一的 `updateSheetMetalParams(updates, 'ui')`。
- **鲁棒性增强 (`FlatPatternViewer.tsx` & `ThreeDViewer.tsx`)**:
  - 在 `expandHoleArray` 和 `PanelWithHoles` 中增加对 `hole.x` 和 `hole.y` 的非空和类型校验，防止渲染崩溃。

## 2. 阶段二：让提取员 (Extractor) 真正使用拆解员 (Splitter) 的成果
**目标**：修改后端 `extractorPhase`，使其不再使用原始大图，而是处理前端裁剪并确认后的独立视图图片，从而提高参数提取的准确性。

- **`server/src/agents/workflow.ts`**:
  - 修改 `extractorPhase` 方法，使其遍历 `this.context.files`（这些文件将是前端 `ViewCropper` 裁剪后发送的独立图片）。
  - 为每个视图文件构建独立的 Prompt，分别调用 `callVisionModel` 进行局部参数提取。
  - 将各个视图提取出的参数合并到 `combinedParams` 中，并最终更新到 Session 和前端。
- **`App.tsx`**:
  - 确保 `handleCropConfirm` 正确调用 `confirmViewsRef.current(files)`，将裁剪后的图片发送到后端的 `/api/agent/confirm-views` 接口。（当前已部分实现，需确保连通性）

## 3. 阶段四：增加“思考过程”的可视化 (Traceability)
**目标**：在前端聊天界面中提供一个可折叠的面板，显示每次 AI 决策或生成内容的原始 Prompt 和 Raw Response，便于调试。

- **`server/src/types.ts` & `server/src/sseManager.ts`**:
  - 扩展 `SSEEvent` 的 `metadata` 字段，支持 `rawPrompt` 和 `rawResponse`。
  - 更新 `sseManager.sendMessage` 方法，允许传入 `metadata` 参数。
- **`server/src/agents/workflow.ts`**:
  - 在调用 `callTextModel` 和 `callVisionModel` 时，捕获 Prompt 和返回的原始字符串。
  - 在发送 SSE 消息时，将这些信息附加到 `metadata` 中。
- **`components/CopilotChat/types.ts`**:
  - 扩展 `ChatMessage` 的 `metadata` 接口，增加 `rawPrompt` 和 `rawResponse`。
- **`components/CopilotChat/ChatMessage.tsx`**:
  - 在渲染消息气泡时，如果 `metadata` 包含 `rawPrompt` 和 `rawResponse`，则渲染一个 HTML `<details>` 和 `<summary>` 组成的折叠面板，展示 AI 的思考过程。