import { AgentContext, AgentRole, IntentResult, ChatHistoryEntry } from '../types.js';
import { sseManager } from '../sseManager.js';
import { callVisionModel, callTextModel, imageToBase64, extractJSON } from './tools.js';
import { sessionStore } from '../store/sessionStore.js';
import { ragService } from '../services/ragService.js';
import {
  INTENT_RECOGNITION_PROMPT,
  buildIntentPrompt,
  SPLITTER_PROMPT,
  EXTRACTOR_PROMPT,
  INSPECTOR_PROMPT,
} from './prompts.js';

export class AgentWorkflow {
  private context: AgentContext;

  constructor(
    sessionId: string,
    userMessage: string,
    files: Express.Multer.File[],
    existingParams?: Record<string, any> | null,
    chatHistory?: ChatHistoryEntry[]
  ) {
    this.context = {
      sessionId,
      userMessage,
      files: files.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        encoding: f.encoding,
        mimetype: f.mimetype,
        buffer: f.buffer,
        size: f.size,
      })),
      currentPhase: 'idle',
      extractedParams: existingParams || null,
      chatHistory: chatHistory || [],
    };
  }

  async execute(): Promise<void> {
    try {
      await this.controllerPhase();
    } catch (error: any) {
      console.error('Workflow error:', error);
      sseManager.sendError(this.context.sessionId, error.message || '处理过程中发生错误');
      sseManager.sendDone(this.context.sessionId);
    }
  }

  private async controllerPhase(): Promise<void> {
    this.updatePhase('uploading', 'controller');
    sseManager.updateStatus(this.context.sessionId, 'controller', 'thinking', '正在理解您的意图...');

    const hasFiles = this.context.files.length > 0;
    const workflowState = sessionStore.getWorkflowState(this.context.sessionId);
    
    const prompt = buildIntentPrompt(
      this.context.userMessage,
      hasFiles,
      this.context.extractedParams,
      this.context.chatHistory,
      workflowState.phase
    );

    try {
      const result = await callTextModel(prompt, INTENT_RECOGNITION_PROMPT);
      const jsonStr = extractJSON(result);
      const intentResult: IntentResult = JSON.parse(jsonStr);

      sseManager.sendMessage(this.context.sessionId, 'controller', intentResult.reply);
      sessionStore.addMessage(this.context.sessionId, 'assistant', intentResult.reply);

      switch (intentResult.intent) {
        case 'Greeting':
        case 'Chat':
        case 'QueryData':
          this.complete();
          break;

        case 'AnalyzeDrawing':
          if (!hasFiles) {
            sseManager.sendMessage(
              this.context.sessionId,
              'controller',
              '请上传图纸文件后再进行分析。'
            );
            this.complete();
            break;
          }
          await this.splitterPhase();
          break;

        case 'ConfirmView':
          if (workflowState.phase === 'waiting_confirmation') {
            sessionStore.setWorkflowState(this.context.sessionId, { phase: 'extracting' });
            sseManager.sendMessage(this.context.sessionId, 'controller', '好的，继续提取参数...');
            
            if (workflowState.files && workflowState.files.length > 0) {
              this.context.files = workflowState.files;
            }
            
            await this.extractorPhase();
            await this.inspectorPhase();
            this.complete();
          } else {
            sseManager.sendMessage(
              this.context.sessionId,
              'controller',
              '当前没有待确认的视图。请先上传图纸进行分析。'
            );
            this.complete();
          }
          break;

        case 'ModifyView':
          sessionStore.setWorkflowState(this.context.sessionId, { phase: 'idle' });
          sseManager.sendMessage(
            this.context.sessionId,
            'controller',
            '已重置视图拆解。您可以重新上传图纸，或告诉我具体需要调整的内容。'
          );
          this.complete();
          break;

        case 'ModifyParameter':
          if (intentResult.actionDetails) {
            await this.executeCommandPhase(intentResult.actionDetails);
          } else {
            sseManager.sendMessage(
              this.context.sessionId,
              'controller',
              '请告诉我您想修改哪个参数以及修改的值。'
            );
            this.complete();
          }
          break;

        default:
          this.complete();
          break;
      }
    } catch (error: any) {
      console.error('Intent recognition failed:', error);
      sseManager.sendMessage(
        this.context.sessionId,
        'controller',
        '抱歉，我没能理解您的意图。请重新描述您的需求。'
      );
      this.complete();
    }
  }

  private async splitterPhase(): Promise<void> {
    this.updatePhase('splitting', 'splitter');
    sseManager.updateStatus(this.context.sessionId, 'splitter', 'thinking', '正在分析图纸结构...');

    await this.delay(1000);

    const file = this.context.files[0];
    const base64 = imageToBase64(file.buffer);

    sseManager.updateStatus(this.context.sessionId, 'splitter', 'working', '正在识别视图...');

    const analysisPrompt = `请分析这张图纸，识别其中包含的视图（主视图、侧视图、俯视图等）。
每个视图必须输出在原图上的相对坐标位置（box字段）。

用户指令：${this.context.userMessage || '无特殊指令'}`;

    const result = await callVisionModel(base64, file.mimetype, analysisPrompt, SPLITTER_PROMPT);

    let views: any[] = [];
    try {
      const jsonStr = extractJSON(result);
      const parsed = JSON.parse(jsonStr);
      views = parsed.views || [];
    } catch {
      console.error('Failed to parse splitter result');
    }

    sseManager.sendMessage(
      this.context.sessionId,
      'splitter',
      `视图拆解完成！已识别 ${views.length} 个视图。`
    );

    sseManager.sendEvent(this.context.sessionId, {
      type: 'agent_message',
      agent: 'controller',
      content: '',
      metadata: {
        uiType: 'view_confirmation',
        views: views,
        imageData: `data:${file.mimetype};base64,${base64}`,
      },
    });

    sessionStore.setWorkflowState(this.context.sessionId, {
      phase: 'waiting_confirmation',
      splitterResult: result,
      files: this.context.files,
    });

    sseManager.sendMessage(
      this.context.sessionId,
      'controller',
      '请查看上方视图识别结果。确认无误请点击"确认并继续"，或告诉我需要调整的内容。'
    );

    sseManager.updateStatus(this.context.sessionId, 'splitter', 'idle');
    this.updatePhase('complete');
    sseManager.sendDone(this.context.sessionId);
  }

  private async extractorPhase(): Promise<void> {
    this.updatePhase('extracting', 'extractor');
    sseManager.updateStatus(this.context.sessionId, 'extractor', 'thinking', '准备提取参数...');

    await this.delay(800);

    const file = this.context.files[0];
    const base64 = imageToBase64(file.buffer);

    sseManager.sendMessage(
      this.context.sessionId,
      'extractor',
      '正在处理图纸，提取尺寸参数...'
    );

    sseManager.updateStatus(this.context.sessionId, 'extractor', 'working', '正在检索历史经验...');

    let ragContext = '';
    try {
      const features = await ragService.extractDrawingFeatures(base64, file.mimetype);
      const similarLessons = await ragService.findSimilarLessons(features);
      if (similarLessons.length > 0) {
        ragContext = ragService.generateLessonPrompt(similarLessons);
        sseManager.sendMessage(
          this.context.sessionId,
          'extractor',
          `检索到 ${similarLessons.length} 条历史经验，已注入分析上下文。`
        );
      }
    } catch (error) {
      console.error('RAG retrieval failed:', error);
    }

    sseManager.updateStatus(this.context.sessionId, 'extractor', 'working', '正在提取参数...');

    const extractionPrompt = `请从这张钣金图纸中提取以下参数：
1. 零件类型 (identifiedType)
2. 宽度 (width)、高度 (height)、深度 (depth)
3. 翼缘长度 (flangeLength)
4. 板厚 (materialThickness)
5. 折弯半径 (bendRadius)
6. 孔位信息 (holes) - 单个孔必须有x,y坐标
7. 孔阵列 (holeArray) - 等距排列的孔使用此字段

用户指令：${this.context.userMessage || '无特殊指令'}
${ragContext}

请严格按照 JSON 格式输出结果。`;

    const result = await callVisionModel(base64, file.mimetype, extractionPrompt, EXTRACTOR_PROMPT);

    try {
      const jsonStr = extractJSON(result);
      const parsed = JSON.parse(jsonStr);
      this.context.extractedParams = parsed;

      sessionStore.updateParams(this.context.sessionId, parsed);
      sseManager.sendParameterUpdate(this.context.sessionId, parsed);

      const identifiedType = parsed.identifiedType || parsed.extractedParams?.identifiedType || '未知类型';
      sseManager.sendMessage(
        this.context.sessionId,
        'extractor',
        `参数提取完成！识别为 ${identifiedType}。`
      );
    } catch {
      sseManager.sendMessage(
        this.context.sessionId,
        'extractor',
        `参数提取完成，但结果格式需要人工审核。原始结果：${result.substring(0, 200)}...`
      );
    }

    sseManager.updateStatus(this.context.sessionId, 'extractor', 'idle');
  }

  private async inspectorPhase(): Promise<void> {
    this.updatePhase('inspecting', 'inspector');
    sseManager.updateStatus(this.context.sessionId, 'inspector', 'thinking', '正在校验数据...');

    await this.delay(1000);

    if (!this.context.extractedParams) {
      sseManager.sendMessage(
        this.context.sessionId,
        'inspector',
        '未收到提取结果，跳过质检。'
      );
      return;
    }

    const extractedData = this.context.extractedParams as any;
    const params = extractedData.extractedParams || extractedData;

    const issues: string[] = [];

    if (params.materialThickness) {
      if (params.materialThickness < 0.5 || params.materialThickness > 20) {
        issues.push(`板厚 ${params.materialThickness}mm 超出常规范围 (0.5-20mm)`);
      }
    }

    if (params.bendRadius && params.materialThickness) {
      const minRadius = params.materialThickness * 0.5;
      const maxRadius = params.materialThickness * 3;
      if (params.bendRadius < minRadius || params.bendRadius > maxRadius) {
        issues.push(`折弯半径 ${params.bendRadius}mm 与板厚不匹配`);
      }
    }

    this.context.inspectionResult = {
      passed: issues.length === 0,
      issues,
    };

    if (issues.length > 0) {
      sseManager.sendMessage(
        this.context.sessionId,
        'inspector',
        `质检发现问题：\n${issues.map(i => `- ${i}`).join('\n')}\n\n请用户确认这些参数是否正确。`
      );
    } else {
      sseManager.sendMessage(
        this.context.sessionId,
        'inspector',
        '质检通过！所有参数均在合理范围内。'
      );
    }

    sseManager.updateStatus(this.context.sessionId, 'inspector', 'idle');
  }

  private async executeCommandPhase(actionDetails: {
    parameter: string;
    value: number | string;
    operation?: 'set' | 'increase' | 'decrease';
  }): Promise<void> {
    this.updatePhase('executing', 'controller');
    sseManager.updateStatus(this.context.sessionId, 'controller', 'working', '正在执行参数修改...');

    try {
      const currentParams = this.context.extractedParams || {};
      const extractedData = currentParams as any;
      const params = extractedData.extractedParams || extractedData;

      const { parameter, value, operation } = actionDetails;
      const currentValue = params[parameter];

      if (currentValue === undefined) {
        sseManager.sendMessage(
          this.context.sessionId,
          'controller',
          `未找到参数 "${parameter}"，请检查参数名称是否正确。`
        );
        this.complete();
        return;
      }

      let newValue: number;
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;

      switch (operation) {
        case 'increase':
          newValue = currentValue + numericValue;
          break;
        case 'decrease':
          newValue = currentValue - numericValue;
          break;
        case 'set':
        default:
          newValue = numericValue;
          break;
      }

      if (newValue < 0) {
        sseManager.sendMessage(
          this.context.sessionId,
          'controller',
          `修改失败：${parameter} 不能为负数（当前值：${currentValue}，修改值：${newValue}）。`
        );
        this.complete();
        return;
      }

      params[parameter] = newValue;

      if (extractedData.extractedParams) {
        extractedData.extractedParams = params;
        this.context.extractedParams = extractedData;
      } else {
        this.context.extractedParams = params;
      }

      sessionStore.updateParams(this.context.sessionId, this.context.extractedParams);
      sseManager.sendParameterUpdate(this.context.sessionId, this.context.extractedParams);

      const operationText = operation === 'increase' ? '增加' : operation === 'decrease' ? '减少' : '设置为';
      sseManager.sendMessage(
        this.context.sessionId,
        'controller',
        `✅ 已将 ${parameter} ${operationText} ${newValue}（原值：${currentValue}）。参数已更新，请查看左侧结果。`
      );
    } catch (error: any) {
      sseManager.sendMessage(
        this.context.sessionId,
        'controller',
        `❌ 修改失败：${error.message}`
      );
    }

    this.complete();
  }

  private complete(): void {
    sessionStore.setWorkflowState(this.context.sessionId, { phase: 'idle' });
    this.updatePhase('complete');
    sseManager.sendDone(this.context.sessionId);
  }

  private updatePhase(phase: AgentContext['currentPhase'], agent?: AgentRole): void {
    this.context.currentPhase = phase;
    sseManager.updateWorkflow(this.context.sessionId, phase, agent);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
