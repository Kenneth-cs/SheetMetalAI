---
name: 全新整体重构与修复方案
overview: 整合底层几何歧义修复、折弯方向开关、孔位阵列状态同步、PDF转图片解析支持，彻底打通 2D展开、3D渲染与大模型参数提取的完整业务闭环。
todos:
  - id: install-pdfjs
    content: 安装 pdfjs-dist 依赖并配置 Vite 支持
    status: pending
  - id: pdf-to-image
    content: 在 App.tsx 的 readFile 中实现 PDF 到图像 Base64 的无损转换
    status: pending
  - id: update-types-and-state
    content: 在 types.ts 中增加 bendAxis 并补全 App.tsx 的状态同步(holeArray等)
    status: pending
  - id: add-bend-axis-toggle
    content: 在 ParameterControls.tsx 中新增 U型槽 的折弯方向开关
    status: pending
  - id: refactor-2d-unfolding
    content: 重构 utils/calculation.ts 和 FlatPatternViewer.tsx，实现基于 bendAxis 的 XY轴 2D展开逻辑
    status: pending
  - id: refactor-3d-assembly
    content: 重构 ThreeDViewer.tsx，实现基于 bendAxis 的 3D 水槽与支架两套组装逻辑
    status: pending
  - id: update-prompt-logic
    content: 在 qwenService.ts 中更新 FEW_SHOT_EXAMPLES，强化推算逻辑与 bendAxis 判断
    status: pending
isProject: false
---

# 全新整体重构与修复方案 (Comprehensive Plan)

## 概述
本计划将此前讨论的所有零散修复与功能演进进行大一统。旨在彻底解决底层的几何歧义（U型长槽与ㄇ字形支架的混淆），修复漏传参数的状态同步问题，并首次加入全链路支持 PDF 无损转图片的能力，以便让 AI 辅助裁剪（方案 2）能在真正的工程环境下落地。

## 详细实施步骤

### 步骤 1：统一参数定义的“物理意义”与类型扩充
- **修改 `types.ts`**:
  - 为 `SheetMetalParams` 增加一个字段：`bendAxis?: 'LONG' | 'SHORT'`，默认可设为 `LONG`。
  - 确保之前遗漏的 `holeArray?: LinearHoleArray` 完全就绪。
- **修改 `components/ParameterControls.tsx`**:
  - 在 U 型槽（`PartType.U_CHANNEL`）的选项下，动态渲染一个 **“折弯方向”控制开关 (Toggle)**，允许用户在“沿长边(水槽)”和“沿短边(ㄇ字型)”之间一键切换，并双向绑定到 `params.bendAxis`。

### 步骤 2：重写 2D 展开图 (Flat Pattern)
- **目标文件**: `utils/calculation.ts` 和 `components/FlatPatternViewer.tsx`
- **逻辑重构**:
  - 弃用之前的粗暴累加。统一 `width` 为 X 轴全长，`height` 为 Y 轴截面基宽。
  - 对于 `bendAxis === 'LONG'`（水槽）：在 **Y轴** 方向上下各加一个 `depth`（扣除 BD），画两条水平折弯虚线。
  - 对于 `bendAxis === 'SHORT'`（ㄇ字型）：在 **X轴** 方向左右各加一个 `depth`（扣除 BD），画两条垂直折弯虚线。
- **孔位映射修正**: 
  - 根据 `bendAxis` 和孔所在的 `face` (MAIN, FLANGE_TOP/LEFT等)，将孔坐标精确映射到展开后的平面坐标系中。

### 步骤 3：重写 3D 渲染器 (ThreeDViewer)
- **目标文件**: `components/ThreeDViewer.tsx`
- **逻辑重构**:
  - `U_CHANNEL` 渲染分支将基于 `params.bendAxis` 发生分化：
    - `LONG`：拼接成上下翼缘（`FLANGE_TOP` / `FLANGE_BOTTOM`）的 U 型水槽。
    - `SHORT`：拼接成左右翼缘（`FLANGE_LEFT` / `FLANGE_RIGHT`）的 ㄇ 型支架。
  - 确保各个子平面的 `PanelWithHoles` 放置（`position` 与 `rotation`）准确匹配。

### 步骤 4：修复状态丢失与 AI 推理增强
- **修复漏传**:
  - 在 `App.tsx` 的 `setParams` 逻辑中，补全对 `result.extractedParams.holeArray` 的读取。
- **强化 Prompt (`qwenService.ts`)**:
  - 加入“长宽比与对称性”推理教程：如果看到标注 `8x25(=200)` 和孔边距 `15`，必须推导出 `15 + 200 + 15 = 230` 作为 `width`。
  - 强制 AI 输出 `bendAxis` 字段：依据比例或图纸外观，判断是 `LONG` 还是 `SHORT` 折弯。

### 步骤 5：PDF 无损转图片解析
- **引入新依赖**:
  - 安装 `pdfjs-dist` 用于在浏览器端（或前端环境）本地解析并渲染 PDF。
  ```bash
  npm install pdfjs-dist
  ```
- **文件读取流改造 (`App.tsx` 中的 `readFile`)**:
  - 拦截 `.pdf` 文件的上传。
  - 使用 `pdfjs-dist` 加载 PDF，提取第一页，用 `<canvas>` 渲染后无损转换为 `image/png` 的 Base64 编码。
  - 最终交给大模型的，无论是用户传的图片还是 PDF，统一全部变成高精度的图像流，确保视觉模型的精准度。

## 架构示意图 (Mermaid)

```mermaid
flowchart TD
    Upload[用户上传 PDF/图片] --> PDF[pdfjs-dist 本地转 Image Base64]
    PDF --> AI_Detect[AI: 获取 holeArray, width/height, bendAxis]
    AI_Detect --> State[App State: 统一物理语义的 Params]
    
    State --> Switch{bendAxis 是啥?}
    
    Switch -->|LONG (水槽)| 2D_Long[2D Y轴展开]
    Switch -->|LONG (水槽)| 3D_Long[3D 上下折弯拼装]
    
    Switch -->|SHORT (ㄇ字)| 2D_Short[2D X轴展开]
    Switch -->|SHORT (ㄇ字)| 3D_Short[3D 左右折弯拼装]
    
    State --> ParamsUI[左侧：方向开关 + 孔位阵列微调]
    ParamsUI -.->|实时驱动| State
```