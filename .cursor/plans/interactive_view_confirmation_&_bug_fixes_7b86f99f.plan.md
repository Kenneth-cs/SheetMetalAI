---
name: Interactive View Confirmation & Bug Fixes
overview: 修复 3D 渲染崩溃和 React 死循环问题，重构意图识别逻辑以支持自然语言确认，并引入交互式的视图裁剪确认卡片。
todos:
  - id: fix-infinite-loop
    content: 在 App.tsx 中使用 useCallback 修复 handleCopilotParamsUpdate 死循环
    status: pending
  - id: fix-3d-crash
    content: 在 ThreeDViewer.tsx 中增加 hole.x 和 hole.y 的非空校验，防止渲染崩溃
    status: pending
  - id: update-prompts
    content: 修改 prompts.ts，在意图识别中增加 ConfirmView 和 ModifyView，在拆解中要求输出坐标
    status: pending
  - id: refactor-workflow
    content: 重构 workflow.ts，移除硬编码的 handleConfirmation，由 controllerPhase 统一处理状态路由
    status: pending
  - id: update-types
    content: 在 types.ts 中扩展 ChatMessage 接口，支持 uiType 和视图元数据
    status: pending
  - id: implement-interactive-card
    content: 在 ChatMessage.tsx 中实现 view_confirmation 交互式卡片（带缩略图和标注框）
    status: pending
  - id: connect-cropper-logic
    content: 连接交互式卡片的按钮逻辑，支持一键确认或唤起 ViewCropper 进行手动调整
    status: pending
isProject: false
---

# Interactive View Confirmation & Bug Fixes Implementation Plan

## 1. 修复核心 Bug (Bug Fixes)
*   **修复 3D 渲染崩溃 (`components/ThreeDViewer.tsx`)**:
    *   在 `PanelWithHoles` 组件的 `geometry` 生成逻辑中，增加对 `hole.x` 和 `hole.y` 的非空校验。如果缺失坐标，则跳过该孔位的渲染，防止 Three.js 抛出 `Cannot read properties of undefined (reading 'next')` 错误。
*   **修复 React 死循环 (`App.tsx`)**:
    *   使用 `useCallback` 包裹 `handleCopilotParamsUpdate` 函数，防止每次 `App` 重新渲染时生成新的函数引用，从而避免触发 `CopilotChat` 内部 `useEffect` 的无限循环更新。

## 2. 重构意图识别与状态机 (Intent & State Machine Refactoring)
*   **移除硬编码确认 (`server/src/agents/workflow.ts`)**:
    *   删除 `handleConfirmation` 方法中基于 `confirmWords` 的硬编码判断。
    *   修改 `execute` 方法，让所有请求（包括在 `waiting_confirmation` 状态下的请求）都先进入 `controllerPhase`，由大模型统一进行意图识别。
*   **扩展意图类型 (`server/src/agents/prompts.ts`)**:
    *   在 `INTENT_RECOGNITION_PROMPT` 中新增意图类型：`ConfirmView` (确认视图并继续) 和 `ModifyView` (用户对视图拆解提出修改意见)。
    *   在 `controllerPhase` 的 `switch-case` 中处理这两种新意图：
        *   `ConfirmView`: 将状态设为 `extracting`，继续执行 `extractorPhase` 和 `inspectorPhase`。
        *   `ModifyView`: 提示用户可以手动调整框选区域，或者重新触发 `splitterPhase`。

## 3. 实现交互式视图确认 (Interactive View Confirmation)
*   **AI 输出坐标 (`server/src/agents/prompts.ts`)**:
    *   修改 `SPLITTER_PROMPT`，要求大模型在拆解视图时，必须输出每个视图在原图上的相对坐标（如 `box: [x, y, width, height]`）。
*   **定义 UI 消息类型 (`components/CopilotChat/types.ts`)**:
    *   在 `ChatMessage` 接口中增加 `uiType?: 'view_confirmation'`。
    *   在 `metadata` 中增加 `views` (视图数据) 和 `imageData` (原图 Base64) 字段。
*   **渲染交互式卡片 (`components/CopilotChat/ChatMessage.tsx`)**:
    *   当检测到 `uiType === 'view_confirmation'` 时，渲染一个自定义组件。
    *   该组件展示原图缩略图，并在图上绘制 AI 识别出的标注框（Bounding Box）。
    *   提供两个按钮：`[确认并继续提取]` 和 `[调整位置]`。
*   **集成 Cropper (`components/CopilotChat/ChatMessage.tsx` & `App.tsx`)**:
    *   点击 `[调整位置]` 时，复用现有的 `ViewCropper` 逻辑。可以将状态提升到 `App.tsx`，或者在聊天框内嵌一个简易版的 Cropper。用户调整完毕后，将新的坐标发送给后端，触发参数提取。

## 流程图：重构后的确认工作流

```mermaid
flowchart TD
    User["User Input\n(e.g., '只有主视图')"] --> Execute["workflow.execute()"]
    Execute --> Controller["controllerPhase()\nCall LLM Intent Recognition"]
    Controller --> Router{"Intent Router"}
    
    Router -->|"ConfirmView"| Extractor["extractorPhase()"]
    Router -->|"ModifyView"| Modify["Send Reply:\n'请手动调整'"]
    Router -->|"AnalyzeDrawing"| Splitter["splitterPhase()"]
    
    Splitter --> Output["Send 'view_confirmation' UI Message\n(with Bounding Boxes)"]
    Output --> Wait["State: waiting_confirmation"]
    
    Wait -.->|"User Clicks 'Confirm'"| Extractor
    Wait -.->|"User Clicks 'Adjust'"| Cropper["Open ViewCropper"]
    Cropper -.->|"Submit New Boxes"| Extractor
    
    Extractor --> Inspector["inspectorPhase()"]
```