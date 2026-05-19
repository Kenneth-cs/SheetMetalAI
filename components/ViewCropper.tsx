import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DetectedViewBoxes, ViewBox } from '../services/qwenService';

interface CroppedResult {
  data: string;
  mimeType: string;
  viewLabel: string;
}

interface ViewCropperProps {
  imageData: string;
  mimeType: string;
  initialBoxes: DetectedViewBoxes;
  onConfirm: (results: CroppedResult[]) => void;
  onCancel: () => void;
}

type ViewKey = 'front' | 'side' | 'plan';

const VIEW_LABELS: Record<ViewKey, string> = {
  front: '主视图',
  side: '侧视图',
  plan: '俯视图',
};

const VIEW_FULL_LABELS: Record<ViewKey, string> = {
  front: '主视图 (Front View)',
  side: '侧视图 (Side View)',
  plan: '俯视图 (Plan View)',
};

const VIEW_COLORS: Record<ViewKey, string> = {
  front: '#f59e0b',
  side: '#3b82f6',
  plan: '#10b981',
};

const VIEW_ICONS: Record<ViewKey, string> = {
  front: 'F',
  side: 'S',
  plan: 'P',
};

export const ViewCropper: React.FC<ViewCropperProps> = ({
  imageData,
  mimeType,
  initialBoxes,
  onConfirm,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [boxes, setBoxes] = useState<DetectedViewBoxes>(initialBoxes);
  const [activeView, setActiveView] = useState<ViewKey>('front');
  const [interactionMode, setInteractionMode] = useState<'adjust' | 'draw'>('adjust');
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-tl' | 'resize-br' | 'draw-new' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [boxStart, setBoxStart] = useState<ViewBox | null>(null);
  const [drawPreview, setDrawPreview] = useState<ViewBox | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const getImageSrc = useCallback(() => {
    if (imageData.startsWith('data:')) {
      return imageData;
    }
    return `data:${mimeType};base64,${imageData}`;
  }, [imageData, mimeType]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const maxW = 800;
      const maxH = 600;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      setCanvasSize({
        width: Math.round(img.width * scale),
        height: Math.round(img.height * scale),
      });
      setImageLoaded(true);
    };
    img.src = getImageSrc();
  }, [getImageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx || !img || !imageLoaded) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);

    const viewKeys: ViewKey[] = ['front', 'side', 'plan'];
    for (const key of viewKeys) {
      const box = boxes[key];
      if (!box) continue;

      const x = (box.x / 100) * canvasSize.width;
      const y = (box.y / 100) * canvasSize.height;
      const w = (box.width / 100) * canvasSize.width;
      const h = (box.height / 100) * canvasSize.height;

      const isActive = key === activeView;

      ctx.fillStyle = VIEW_COLORS[key];
      ctx.globalAlpha = isActive ? 0.12 : 0.06;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = VIEW_COLORS[key];
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.setLineDash(isActive ? [] : [6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = VIEW_COLORS[key];
      ctx.font = 'bold 11px sans-serif';
      const label = VIEW_LABELS[key];
      const textW = ctx.measureText(label).width;
      const labelH = 18;
      ctx.beginPath();
      ctx.roundRect(x, y - labelH - 2, textW + 12, labelH, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 6, y - 7);

      if (isActive) {
        const handleSize = 8;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = VIEW_COLORS[key];
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x + w, y + h, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    if (drawPreview) {
      const x = (drawPreview.x / 100) * canvasSize.width;
      const y = (drawPreview.y / 100) * canvasSize.height;
      const w = (drawPreview.width / 100) * canvasSize.width;
      const h = (drawPreview.height / 100) * canvasSize.height;

      ctx.strokeStyle = VIEW_COLORS[activeView];
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = VIEW_COLORS[activeView];
      ctx.globalAlpha = 0.1;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }, [boxes, activeView, canvasSize, imageLoaded, drawPreview]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const pxToPct = (px: number, dimension: 'x' | 'y') => {
    const size = dimension === 'x' ? canvasSize.width : canvasSize.height;
    return (px / size) * 100;
  };

  const isInHandle = (mx: number, my: number, box: ViewBox, handle: 'tl' | 'br') => {
    const x = (box.x / 100) * canvasSize.width;
    const y = (box.y / 100) * canvasSize.height;
    const w = (box.width / 100) * canvasSize.width;
    const h = (box.height / 100) * canvasSize.height;

    const hx = handle === 'tl' ? x : x + w;
    const hy = handle === 'tl' ? y : y + h;
    return Math.abs(mx - hx) < 12 && Math.abs(my - hy) < 12;
  };

  const isInBox = (mx: number, my: number, box: ViewBox) => {
    const x = (box.x / 100) * canvasSize.width;
    const y = (box.y / 100) * canvasSize.height;
    const w = (box.width / 100) * canvasSize.width;
    const h = (box.height / 100) * canvasSize.height;
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (interactionMode === 'draw') {
      setDragMode('draw-new');
      setIsDragging(true);
      setDragStart(pos);
      setDrawPreview(null);
      return;
    }

    const box = boxes[activeView];
    if (!box) return;

    if (isInHandle(pos.x, pos.y, box, 'tl')) {
      setDragMode('resize-tl');
    } else if (isInHandle(pos.x, pos.y, box, 'br')) {
      setDragMode('resize-br');
    } else if (isInBox(pos.x, pos.y, box)) {
      setDragMode('move');
    } else {
      return;
    }

    setIsDragging(true);
    setDragStart(pos);
    setBoxStart({ ...box });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const pos = getMousePos(e);

    if (dragMode === 'draw-new') {
      const x1 = pxToPct(Math.min(dragStart.x, pos.x), 'x');
      const y1 = pxToPct(Math.min(dragStart.y, pos.y), 'y');
      const x2 = pxToPct(Math.max(dragStart.x, pos.x), 'x');
      const y2 = pxToPct(Math.max(dragStart.y, pos.y), 'y');

      setDrawPreview({
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
      });
      return;
    }

    if (!boxStart) return;

    const dxPct = pxToPct(pos.x - dragStart.x, 'x');
    const dyPct = pxToPct(pos.y - dragStart.y, 'y');

    let newBox: ViewBox;

    if (dragMode === 'move') {
      newBox = {
        x: Math.max(0, Math.min(100 - boxStart.width, boxStart.x + dxPct)),
        y: Math.max(0, Math.min(100 - boxStart.height, boxStart.y + dyPct)),
        width: boxStart.width,
        height: boxStart.height,
      };
    } else if (dragMode === 'resize-tl') {
      newBox = {
        x: Math.max(0, boxStart.x + dxPct),
        y: Math.max(0, boxStart.y + dyPct),
        width: Math.max(3, boxStart.width - dxPct),
        height: Math.max(3, boxStart.height - dyPct),
      };
    } else {
      newBox = {
        x: boxStart.x,
        y: boxStart.y,
        width: Math.max(3, Math.min(100 - boxStart.x, boxStart.width + dxPct)),
        height: Math.max(3, Math.min(100 - boxStart.y, boxStart.height + dyPct)),
      };
    }

    setBoxes(prev => ({ ...prev, [activeView]: newBox }));
  };

  const handleMouseUp = () => {
    if (dragMode === 'draw-new' && drawPreview && drawPreview.width > 2 && drawPreview.height > 2) {
      setBoxes(prev => ({ ...prev, [activeView]: drawPreview }));
      setDrawPreview(null);
      setInteractionMode('adjust');
    }

    setIsDragging(false);
    setDragMode(null);
    setBoxStart(null);
  };

  const handleClearView = (key: ViewKey) => {
    setBoxes(prev => ({ ...prev, [key]: null }));
    if (key === activeView) {
      const remaining = (['front', 'side', 'plan'] as ViewKey[]).filter(k => k !== key && boxes[k]);
      if (remaining.length > 0) {
        setActiveView(remaining[0]);
      }
    }
  };

  const handleStartDraw = (key: ViewKey) => {
    setActiveView(key);
    setInteractionMode('draw');
  };

  const handleCropAndConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const results: CroppedResult[] = [];
    const viewKeys: ViewKey[] = ['front', 'side', 'plan'];

    for (const key of viewKeys) {
      const box = boxes[key];
      if (!box) continue;

      const canvas = document.createElement('canvas');
      const sx = (box.x / 100) * img.width;
      const sy = (box.y / 100) * img.height;
      const sw = (box.width / 100) * img.width;
      const sh = (box.height / 100) * img.height;

      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const base64Data = canvas.toDataURL(mimeType).split(',')[1];
      results.push({
        data: base64Data,
        mimeType,
        viewLabel: VIEW_FULL_LABELS[key],
      });
    }

    if (results.length > 0) {
      onConfirm(results);
    }
  };

  const activeBox = boxes[activeView];
  const hasAnyBox = boxes.front || boxes.side || boxes.plan;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 max-w-[95vw] max-h-[90vh] flex gap-4" onClick={e => e.stopPropagation()}>
        {/* Left sidebar - View list */}
        <div className="w-56 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-200 mb-1">视图管理</h3>
          <p className="text-[10px] text-slate-500 mb-2">
            拖拽调整框选区域 · 点击"重选"重新画框 · 点击"清除"移除不需要的视图
          </p>

          {(['front', 'side', 'plan'] as ViewKey[]).map(key => {
            const box = boxes[key];
            const isActive = key === activeView;

            return (
              <div
                key={key}
                className={`rounded-lg border p-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-current bg-slate-800'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
                style={isActive ? { borderColor: VIEW_COLORS[key] } : {}}
                onClick={() => {
                  setActiveView(key);
                  if (box) setInteractionMode('adjust');
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: VIEW_COLORS[key] }}
                    >
                      {VIEW_ICONS[key]}
                    </span>
                    <span className="text-xs font-medium text-slate-300">{VIEW_LABELS[key]}</span>
                  </div>
                  {box ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">已框选</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">未框选</span>
                  )}
                </div>

                {box && (
                  <div className="text-[10px] text-slate-500 mb-1.5">
                    位置: ({box.x.toFixed(0)}%, {box.y.toFixed(0)}%) · {box.width.toFixed(0)}% × {box.height.toFixed(0)}%
                  </div>
                )}

                <div className="flex gap-1.5">
                  {box ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView(key);
                          setInteractionMode('adjust');
                        }}
                        className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                          isActive && interactionMode === 'adjust'
                            ? 'bg-industrial-600 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        调整
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDraw(key);
                        }}
                        className="flex-1 py-1 text-[10px] rounded bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        重选
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearView(key);
                        }}
                        className="py-1 px-2 text-[10px] rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                      >
                        清除
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDraw(key);
                      }}
                      className="w-full py-1 text-[10px] rounded transition-colors"
                      style={{ backgroundColor: VIEW_COLORS[key] + '20', color: VIEW_COLORS[key] }}
                    >
                      + 添加{VIEW_LABELS[key]}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-auto pt-3 border-t border-slate-700 flex flex-col gap-2">
            <button
              onClick={handleCropAndConfirm}
              disabled={!hasAnyBox}
              className="w-full py-2.5 text-xs font-medium bg-industrial-600 hover:bg-industrial-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认裁剪并分析
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>

        {/* Right side - Canvas */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-xs text-slate-500">
              {interactionMode === 'draw' ? (
                <span className="text-industrial-400">✏️ 在图纸上拖拽鼠标画出 {VIEW_LABELS[activeView]} 的框选区域</span>
              ) : activeBox ? (
                <>当前: <span style={{ color: VIEW_COLORS[activeView] }}>{VIEW_LABELS[activeView]}</span> · 拖拽移动 · 拖拽角点缩放</>
              ) : (
                <span className="text-slate-600">选择左侧视图后点击"添加"或"重选"来画框</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-2 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              style={{ cursor: interactionMode === 'draw' ? 'crosshair' : isDragging ? 'grabbing' : 'default' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="text-[10px] text-slate-600 mt-2 text-center">
            提示: 主视图必填，侧视图和俯视图可选。如果图纸中没有某个视图，请点击"清除"将其移除。
          </div>
        </div>
      </div>
    </div>
  );
};
