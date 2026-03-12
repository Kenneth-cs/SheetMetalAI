import React, { useState } from 'react';
import { SheetMetalParams } from './types';
import { DEFAULT_PARAMS } from './constants';
import { FlatPatternViewer } from './components/FlatPatternViewer';
import { ThreeDViewer } from './components/ThreeDViewer';
import { ParameterControls } from './components/ParameterControls';
import { analyzeDrawing, listAvailableModels, ViewFile } from './services/geminiService';

// View slot definition
interface ViewSlot {
  key: 'front' | 'side' | 'plan';
  label: string;       // Chinese label shown in UI
  viewLabel: string;   // Label sent to AI
  required: boolean;
}

const VIEW_SLOTS: ViewSlot[] = [
  { key: 'front', label: '主视图', viewLabel: '主视图 (Front View) - 正面，显示零件长度和高度', required: true },
  { key: 'side',  label: '侧视图', viewLabel: '侧视图 (Side View) - 截面，显示折弯形状和翼缘高度',  required: false },
  { key: 'plan',  label: '俯视图', viewLabel: '俯视图 (Plan View) - 顶部，显示宽度和孔位排布',   required: false },
];

// Uploaded file for a single view slot
interface SlotFile {
  name: string;
  data: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [params, setParams] = useState<SheetMetalParams>(DEFAULT_PARAMS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // One file per view slot (null = not uploaded yet)
  const [slotFiles, setSlotFiles] = useState<Record<string, SlotFile | null>>({
    front: null,
    side: null,
    plan: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Debug: list available models
  const checkModels = async () => {
    try {
      const models = await listAvailableModels();
      alert(`Available Models:\n${models.map((m: any) => m.name.replace('models/', '')).join('\n')}`);
    } catch (e: any) {
      alert(`Failed to list models. Check API Key.\nError: ${e.message}`);
    }
  };

  // Read a single File object and return a SlotFile
  const readFile = (file: File): Promise<SlotFile> => {
    return new Promise((resolve, reject) => {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.dwg')) {
        reject(new Error("DWG 格式不支持，请导出为 PDF 或 DXF"));
        return;
      }

      if (fileName.endsWith('.dxf')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ name: file.name, data: reader.result as string, mimeType: 'application/dxf' });
        reader.onerror = reject;
        reader.readAsText(file);
        return;
      }

      // Image / PDF → base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const matches = base64String.match(/^data:(.*);base64,(.*)$/);
        if (matches) {
          resolve({ name: file.name, data: matches[2], mimeType: matches[1] });
        } else {
          reject(new Error(`无法解析文件：${file.name}`));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection for a specific view slot
  const handleSlotUpload = async (slotKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const slotFile = await readFile(files[0]);
      setSlotFiles(prev => ({ ...prev, [slotKey]: slotFile }));
    } catch (err: any) {
      setError(err.message);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const clearSlot = (slotKey: string) => {
    setSlotFiles(prev => ({ ...prev, [slotKey]: null }));
  };

  // Collect all uploaded slots in order and kick off analysis
  const handleAnalyze = () => {
    const viewFiles: ViewFile[] = VIEW_SLOTS
      .filter(slot => slotFiles[slot.key] !== null)
      .map(slot => ({
        data: slotFiles[slot.key]!.data,
        mimeType: slotFiles[slot.key]!.mimeType,
        viewLabel: slot.viewLabel,
      }));

    if (viewFiles.length === 0) return;
    processImages(viewFiles);
  };

  const uploadedCount = VIEW_SLOTS.filter(s => slotFiles[s.key] !== null).length;

  // AI Processing
  const processImages = async (files: ViewFile[]) => {
    setIsAnalyzing(true);
    setAiReasoning(null);
    setError(null);

    try {
      const result = await analyzeDrawing(files);

      setAiReasoning(result.reasoning);

      // Merge AI results into current params
      setParams(prev => ({
        ...prev,
        type: result.identifiedType,
        width: result.extractedParams.width || prev.width,
        height: result.extractedParams.height || prev.height,
        depth: result.extractedParams.depth || prev.depth,
        flangeLength: result.extractedParams.flangeLength || prev.flangeLength,
        materialThickness: result.extractedParams.materialThickness || prev.materialThickness,
        bendRadius: result.extractedParams.bendRadius || prev.bendRadius,
        holes: result.extractedParams.holes || [],
        manufacturingAdvice: result.manufacturingAdvice,
      }));

      // Switch to 3D view automatically after analysis
      setViewMode('3d');

    } catch (err: any) {
      setError(err.message || "Failed to analyze drawing");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-industrial-500 p-2 rounded text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SheetMetal<span className="text-industrial-500">AI</span></h1>
              <p className="text-xs text-slate-400">智能钣金展开助手 (Smart Unfolder)</p>
              <button onClick={checkModels} className="text-[10px] underline text-industrial-400 hover:text-industrial-300">Test Models</button>
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
             Powered by Gemini 3 Flash
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input & AI */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">1. 上传图纸 (Upload Drawings)</h3>
            <p className="text-[10px] text-slate-500 mb-3">分视图上传可显著提升 AI 识别精度。主视图必填，侧视图/俯视图可选。</p>

            {/* Three view slots */}
            <div className="space-y-2">
              {VIEW_SLOTS.map(slot => {
                const file = slotFiles[slot.key];
                return (
                  <div key={slot.key} className="border border-slate-700 rounded-lg overflow-hidden">
                    {/* Slot header */}
                    <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${slot.required ? 'bg-industrial-400' : 'bg-slate-500'}`} />
                        <span className="text-xs font-medium text-slate-300">{slot.label}</span>
                        {slot.required && <span className="text-[10px] text-industrial-500">必填</span>}
                      </div>
                      {file && (
                        <button onClick={() => clearSlot(slot.key)} className="text-slate-500 hover:text-red-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>

                    {/* Slot body */}
                    {file ? (
                      // Uploaded state: show thumbnail/badge + filename
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={`data:${file.mimeType};base64,${file.data}`} className="w-10 h-10 object-cover rounded border border-slate-700" alt="thumb" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 flex items-center justify-center rounded border border-slate-600 text-xs text-slate-400 font-bold">
                            {file.mimeType.includes('pdf') ? 'PDF' : 'DXF'}
                          </div>
                        )}
                        <span className="text-xs text-slate-300 truncate flex-1">{file.name}</span>
                        {/* Re-upload label */}
                        <label className="text-[10px] text-industrial-400 hover:text-industrial-300 cursor-pointer shrink-0">
                          更换
                          <input type="file" className="hidden" accept="image/*,.pdf,.dxf" onChange={e => handleSlotUpload(slot.key, e)} />
                        </label>
                      </div>
                    ) : (
                      // Empty state: dashed upload area
                      <label className="flex items-center justify-center gap-2 px-3 py-3 cursor-pointer bg-slate-900 hover:bg-slate-800 transition-colors group">
                        <svg className="w-4 h-4 text-slate-600 group-hover:text-industrial-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <span className="text-xs text-slate-600 group-hover:text-slate-400">点击上传 Image / PDF / DXF</span>
                        <input type="file" className="hidden" accept="image/*,.pdf,.dxf" onChange={e => handleSlotUpload(slot.key, e)} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Analyze button */}
            {uploadedCount > 0 && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`mt-4 w-full py-2 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors ${isAnalyzing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-industrial-600 hover:bg-industrial-500 text-white'}`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    开始 AI 识别 ({uploadedCount} 张视图)
                  </>
                )}
              </button>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-300 text-xs">
                Error: {error}
              </div>
            )}
            
            {aiReasoning && (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-industrial-900/30 border border-industrial-800 rounded">
                  <h4 className="text-xs font-bold text-industrial-400 mb-1">AI 分析结果 (Analysis):</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiReasoning}</p>
                </div>
                
                {params.manufacturingAdvice && (
                  <div className="p-3 bg-amber-900/20 border border-amber-800/50 rounded">
                    <h4 className="text-xs font-bold text-amber-500 mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      加工建议 (Manufacturing Advice):
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{params.manufacturingAdvice}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Parameters Form (Desktop: In Left Col) */}
          <div className="hidden lg:block h-[calc(100vh-500px)]">
             <ParameterControls params={params} onChange={setParams} />
          </div>
        </div>

        {/* Center/Right Column: Visualization */}
        <div className="lg:col-span-9 flex flex-col gap-6 h-[80vh] lg:h-auto">
          {/* View Mode Tabs */}
          <div className="flex gap-2 border-b border-slate-700 pb-1">
            <button 
              onClick={() => setViewMode('3d')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${viewMode === '3d' ? 'bg-slate-800 text-industrial-400 border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              3D 立体图 (Folded)
            </button>
            <button 
              onClick={() => setViewMode('2d')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${viewMode === '2d' ? 'bg-slate-800 text-industrial-400 border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              2D 展开图 (Flat Pattern)
            </button>
          </div>

          {/* Main Viewer */}
          <div className="flex-1 min-h-[500px] relative">
            {viewMode === '3d' ? (
              <ThreeDViewer params={params} />
            ) : (
              <FlatPatternViewer params={params} />
            )}
          </div>

          {/* Mobile Params (Visible only on small screens) */}
          <div className="lg:hidden">
            <ParameterControls params={params} onChange={setParams} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;
