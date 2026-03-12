# 项目代码结构规范 (Project Structure)

为了支持项目的长期维护和功能扩展，我们将代码结构从扁平化重构为模块化分层结构。

## 1. 目录结构树 (Directory Tree)

```
sheetmetal_AI/
├── public/                 # 静态资源 (favicon, robots.txt, 纯静态文件)
├── src/
│   ├── assets/             # 项目内部资源
│   │   ├── images/         # 图片资源
│   │   └── styles/         # 全局样式 (Tailwind directives, fonts)
│   │
│   ├── components/         # React 组件库
│   │   ├── common/         # 通用基础组件 (Button, Input, Card, Layout)
│   │   ├── viewer/         # 核心视图组件 (ThreeDViewer, FlatPatternViewer)
│   │   └── editor/         # 编辑交互组件 (ParameterControls, FileUpload)
│   │
│   ├── services/           # 外部服务集成
│   │   ├── api/            # HTTP 请求封装
│   │   └── gemini/         # Google Gemini AI 服务封装
│   │
│   ├── utils/              # 工具函数库
│   │   ├── math/           # 几何计算 (Sheet metal unfolding algorithms)
│   │   ├── format/         # 数据格式化
│   │   └── parsers/        # 文件解析 (DXF parser etc.)
│   │
│   ├── hooks/              # 自定义 React Hooks
│   │   ├── useSheetMetal.ts# 钣金逻辑状态管理
│   │   └── useViewer.ts    # 视图控制逻辑
│   │
│   ├── types/              # TypeScript 类型定义
│   │   ├── models.ts       # 数据模型 (SheetMetalParams, BendLine)
│   │   └── api.ts          # API 响应类型
│   │
│   ├── constants/          # 常量定义
│   │   ├── defaults.ts     # 默认参数
│   │   └── materials.ts    # 材料属性表
│   │
│   ├── context/            # 全局状态管理 (Optional)
│   │
│   ├── App.tsx             # 根组件
│   ├── main.tsx            # 入口文件 (原 index.tsx)
│   └── vite-env.d.ts       # Vite 类型声明
│
├── tests/                  # 测试用例 (Vitest/Jest)
├── docs/                   # 项目文档 (PRD, Architecture)
├── .env.example            # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 2. 模块职责说明

### Components
*   **Viewer:** 专注于 Canvas 渲染逻辑，包含 `ThreeDViewer` 和 `FlatPatternViewer`。这些组件应尽量保持纯展示 (Presentational)，数据由 Props 传入。
*   **Editor:** 包含参数输入的表单逻辑，`ParameterControls` 负责处理用户输入并进行简单的校验。

### Services
*   **Gemini Service:** 负责构造 Prompt，调用 Google GenAI SDK，并解析返回的 JSON 结果。应包含错误处理和重试机制。

### Utils
*   **Calculation:** 核心算法层。钣金展开系数 (K-Factor)、折弯扣除 (Bend Deduction) 的计算逻辑应封装在此，与 UI 解耦，便于单独测试。

## 3. 命名规范
*   **组件文件:** PascalCase (e.g., `ThreeDViewer.tsx`)
*   **工具文件:** camelCase (e.g., `calculateUnfolding.ts`)
*   **类型文件:** `types.ts` 或 `*.types.ts`
*   **常量:** UPPER_SNAKE_CASE (e.g., `DEFAULT_MATERIAL_THICKNESS`)

## 4. 迁移计划
1.  创建 `src` 目录。
2.  移动 `components`, `services`, `utils` 到 `src` 下。
3.  将 `types.ts` 和 `constants.ts` 移动到对应的 `src/types/` 和 `src/constants/` 目录。
4.  更新所有文件的 import 路径。
5.  将 `index.tsx` 重命名为 `main.tsx` 并移动到 `src/`。
6.  更新 `index.html` 中的入口引用。
