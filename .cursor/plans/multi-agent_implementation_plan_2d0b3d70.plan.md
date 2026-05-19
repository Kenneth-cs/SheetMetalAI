---
name: Multi-Agent Implementation Plan
overview: 制定 SheetMetalAI 的 Multi-Agent 架构落地计划，涵盖前后端架构分离、Copilot UI 开发、多智能体工作流搭建以及数据库和 RAG 数据飞轮的接入。
todos:
  - id: ui-refactor
    content: 重构 App.tsx 布局，新增 Copilot 聊天组件和文件拖拽输入功能
    status: pending
  - id: setup-backend
    content: 搭建 Node.js 后端基础服务（或 Next.js API Routes）
    status: pending
  - id: agent-workflow
    content: 集成 LangChain/AI SDK，编写主控、拆解、提取、质检四个 Agent 的 Prompt 及协作逻辑
    status: pending
  - id: tool-functions
    content: 为 Agent 编写具体的 Tools 函数（裁图、逻辑校验等）
    status: pending
  - id: streaming-chat
    content: 前后端对接：建立 SSE 或 WebSocket，实现 Agent 聊天过程的流式“直播”推送
    status: pending
  - id: setup-db
    content: 配置 MySQL 建立业务表，并接入 Vector DB (向量数据库) 建立向量表
    status: pending
  - id: rag-flywheel
    content: 实现图纸特征提取、RAG 检索增强及教训动态注入的“数据飞轮”接口
    status: pending
isProject: false
---

# SheetMetalAI - Multi-Agent 架构技术落地计划

根据刚刚整理的 PRD 文档，目前的纯前端 Vite 架构（直接在浏览器调用模型 API）不足以支撑复杂的多智能体编排和数据库飞轮。我们需要进行前后端分离架构升级。

## 1. 整体技术栈升级建议
- **前端 (Frontend):** 维持 React + Vite + Three.js 现状。新增右侧聊天面板，通过 **SSE (Server-Sent Events)** 或 **WebSocket** 接收后台 Agent 的实时工作流消息。
- **后端 (Backend) [新增]:** 引入 Node.js (Express / NestJS / Next.js API Routes) 充当多智能体的大脑。
- **数据层 (Database) [新增]:** 
  - 关系型数据库：MySQL (用于存储会话、业务数据和图纸元数据)。
  - 向量数据库：引入独立的 Vector DB (向量数据库) 处理高维特征向量检索。

## 2. 详细落地步骤

### Step 1: 界面重构与 Copilot 对话端开发 (Frontend)
- **布局调整:** 修改 `App.tsx` 的网格布局，将右侧划拨出约 350px 宽度的空间作为 `CopilotChat` 组件。
- **UI 开发:**
  - 开发类似 ChatGPT 的对话气泡。
  - 支持将图片拖拽到聊天输入框并上传。
  - 支持渲染不同来源的“冒泡”（主控 Agent、提取员、质检员的头像和文本流）。
- **流式通信:** 前端对接后台接口，解析 SSE 数据流，让用户能看到“Agent 正在输入/思考”的直播效果。

### Step 2: 后端多智能体工作流搭建 (Backend)
- **Agent 框架引入:** 采用 `LangChain` 或 `Vercel AI SDK` 构建多智能体流程。
- **工具定义 (Tool Use):** 在代码中用函数封装工具并暴露给模型：
  - `cropImage()`: 视图拆解工具。
  - `extractParams()`: 视觉提取工具（调用 Qwen-VL 或 Gemini Vision）。
  - `validateLogic()`: 数学计算核对工具。
- **工作流编排 (Orchestration):**
  - 主控 Agent 接收到前端的图纸+提示后，启动状态机流转：`Agent A -> Agent B -> Agent C`。
  - 在每一步，后台向前端推送状态事件（如 `type: "agent_message", agent: "A", content: "我已经拆解完毕..."`）。

### Step 3: RAG 向量数据库与数据飞轮接入 (Database)
- **建立表结构:** 
  - MySQL `chat_sessions` (匿名会话表)
  - MySQL `drawings` (图纸元数据与原始提取结果表)
  - Vector DB `knowledge_vectors` (经验教训向量表，存储特征向量)
- **特征提取与检索逻辑:** 
  - 当图纸传入后，通过预处理提取 `drawing_style`、`company_name` 等元数据。
  - 调用 Embedding 模型生成向量，检索 `knowledge_vectors` 表寻找历史类似图纸的纠错教训。
  - 将检索到的教训拼接进 Agent B 和 Agent C 的 System Prompt 中。
- **纠错反馈写入:** 提供 API 让前端在用户修正参数时，后台异步总结错误模式，生成新向量并 INSERT 进库。

### Step 4: 测试与联调
- 验证多模态大模型的系统 Prompt 角色扮演稳定性。
- 确保从“发送图片 -> Agent 逐个冒泡 -> 输出最终参数给 3D 组件渲染”的数据链路畅通。
- 测试 RAG 教训机制是否生效（例如故意上传历史犯错图纸，看 AI 是否能根据注入的教训避坑）。