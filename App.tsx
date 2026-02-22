import React, { useState, useCallback } from 'react';
import { SheetMetalParams } from './types';
import { DEFAULT_PARAMS } from './constants';
import { FlatPatternViewer } from './components/FlatPatternViewer';
import { ThreeDViewer } from './components/ThreeDViewer';
import { ParameterControls } from './components/ParameterControls';
import { analyzeDrawing } from './services/geminiService';

const App: React.FC = () => {
  const [params, setParams] = useState<SheetMetalParams>(DEFAULT_PARAMS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setAiReasoning(null);

    const fileName = file.name.toLowerCase();
    
    // Handle DWG specifically
    if (fileName.endsWith('.dwg')) {
      setError("DWG format is binary and not directly supported. Please export as PDF or DXF for AI analysis.");
      return;
    }

    // Handle DXF (Read as Text)
    if (fileName.endsWith('.dxf')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const textContent = reader.result as string;
        setUploadedImage(null); // No preview for DXF
        processImage(textContent, 'application/dxf');
      };
      reader.readAsText(file);
      return;
    }

    // Handle Images and PDF (Read as Data URL)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUploadedImage(base64String);
      
      // Extract MIME type and base64 data
      const matches = base64String.match(/^data:(.*);base64,(.*)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        processImage(base64Data, mimeType);
      } else {
        setError("Invalid file format");
      }
    };
    reader.readAsDataURL(file);
  };

  // AI Processing
  const processImage = async (content: string, mimeType: string) => {
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeDrawing(content, mimeType);
      
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
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
             Powered by Gemini 2.5 Flash
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input & AI */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
             <h3 className="text-sm font-semibold text-slate-300 mb-3">1. 上传图纸 (Upload Drawing)</h3>
             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-750 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadedImage ? (
                        (uploadedImage.startsWith('data:image/png') || 
                         uploadedImage.startsWith('data:image/jpeg') || 
                         uploadedImage.startsWith('data:image/webp') || 
                         uploadedImage.startsWith('data:image/svg+xml')) ? (
                          <img src={uploadedImage} alt="Preview" className="h-20 object-contain opacity-80" />
                        ) : uploadedImage.startsWith('data:application/pdf') ? (
                          <div className="flex flex-col items-center text-red-400">
                             <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                             <span className="text-xs">PDF Document</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-slate-400">
                            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span className="text-xs">File Uploaded</span>
                          </div>
                        )
                    ) : (
                        <>
                        <svg className="w-8 h-8 mb-3 text-slate-500 group-hover:text-industrial-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-xs text-slate-500">点击上传 (Image, PDF, DXF)</p>
                        <p className="text-[10px] text-slate-600 mt-1">不支持 DWG (请转存为 PDF/DXF)</p>
                        </>
                    )}
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf,.dxf" onChange={handleFileUpload} />
            </label>
            
            {isAnalyzing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-industrial-400 text-sm animate-pulse">
                <svg className="animate-spin h-4 w-4 text-industrial-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                AI 正在识别图纸参数...
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-300 text-xs">
                Error: {error}
              </div>
            )}
            
            {aiReasoning && (
              <div className="mt-4 p-3 bg-industrial-900/30 border border-industrial-800 rounded">
                <h4 className="text-xs font-bold text-industrial-400 mb-1">AI 分析结果 (Analysis):</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{aiReasoning}</p>
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
