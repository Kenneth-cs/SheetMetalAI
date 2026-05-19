import React, { useMemo, useRef, useCallback } from 'react';
import { SheetMetalParams, PartType, Hole } from '../types';
import { calculateFlatPattern } from '../utils/calculation';

interface Props {
  params: SheetMetalParams;
  onChange?: (updates: Partial<SheetMetalParams>) => void;
}

const expandHoleArray = (params: SheetMetalParams): Hole[] => {
  const holes: Hole[] = [...(params.holes || [])];
  
  if (params.holeArray && typeof params.holeArray === 'object') {
    const { startX = 0, startY = 0, spacing = 0, count = 0, diameter = 5, face } = params.holeArray;
    
    if (typeof count === 'number' && Number.isInteger(count) && count > 0 && 
        typeof spacing === 'number' && spacing > 0 &&
        typeof startX === 'number' && !isNaN(startX) &&
        typeof startY === 'number' && !isNaN(startY) &&
        typeof diameter === 'number' && diameter > 0) {
      for (let i = 0; i < count; i++) {
        const x = startX + i * spacing;
        if (typeof x === 'number' && !isNaN(x)) {
          holes.push({
            type: 'CIRCLE',
            x,
            y: startY,
            diameter,
            face: face || 'MAIN',
          });
        }
      }
    }
  }
  
  return holes.filter(h => 
    typeof h.x === 'number' && !isNaN(h.x) && 
    typeof h.y === 'number' && !isNaN(h.y)
  );
};

export const FlatPatternViewer: React.FC<Props> = ({ params, onChange }) => {
  const result = useMemo(() => calculateFlatPattern(params), [params]);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleDimensionClick = useCallback((label: string, currentValue: number, field: string) => {
    if (!onChange) return;
    const input = prompt(`修改 ${label}:`, currentValue.toString());
    if (input !== null) {
      const newValue = parseFloat(input);
      if (!isNaN(newValue) && newValue > 0) {
        // Handle nested fields like 'holeArray.startX'
        if (field.startsWith('holeArray.')) {
          const holeField = field.split('.')[1];
          onChange({
            holeArray: {
              ...params.holeArray!,
              [holeField]: newValue,
            }
          });
        } else {
          onChange({ [field]: newValue });
        }
      }
    }
  }, [onChange, params.holeArray]);

  // Handle right margin click with reverse derivation
  const handleRightMarginClick = useCallback(() => {
    if (!onChange || !params.holeArray) return;
    
    const { startX, spacing, count } = params.holeArray;
    const lastHoleX = startX + (count - 1) * spacing;
    const currentEndMargin = params.width - lastHoleX;
    
    const input = prompt(`修改右侧边距:`, currentEndMargin.toFixed(1));
    if (input !== null) {
      const newEndMargin = parseFloat(input);
      if (!isNaN(newEndMargin) && newEndMargin > 0) {
        // Reverse derivation: new width = lastHoleX + newEndMargin
        const newWidth = lastHoleX + newEndMargin;
        onChange({ width: Math.round(newWidth * 10) / 10 });
      }
    }
  }, [onChange, params.holeArray, params.width]);

  // Handle top/bottom margin click
  const handleVerticalMarginClick = useCallback((type: 'top' | 'bottom') => {
    if (!onChange || !params.holeArray) return;
    
    const { startY } = params.holeArray;
    const currentMargin = type === 'top' ? params.height - startY : startY;
    
    const input = prompt(`修改${type === 'top' ? '上' : '下'}方边距:`, currentMargin.toFixed(1));
    if (input !== null) {
      const newMargin = parseFloat(input);
      if (!isNaN(newMargin) && newMargin > 0) {
        const newStartY = type === 'top' ? params.height - newMargin : newMargin;
        onChange({
          holeArray: {
            ...params.holeArray,
            startY: Math.round(newStartY * 10) / 10,
          }
        });
      }
    }
  }, [onChange, params.holeArray, params.height]);

  // Add padding for dimensions
  const padding = 60;
  const viewBoxWidth = result.flatWidth + padding * 2;
  const viewBoxHeight = result.flatHeight + padding * 2;

  const handleDownload = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flat_pattern_${params.type.replace(/\s/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to draw the main outline path based on type
  const getOutlinePath = () => {
    const { flatWidth: w, flatHeight: h } = result;
    const { type, depth, materialThickness, bendRadius, kFactor } = params;
    
    // Simplification for visualization: just rectangles or shapes with cutouts
    // For Box Panel, we need to cut out the corners.
    
    if (type === PartType.BOX_PANEL) {
      // Corner cutout size approx (depth - simple correction)
      // For accurate CAD this is complex, for Vis we remove the corners
      const corner = Math.max(0, depth - 2); // simplified visual corner notch
      
      return `
        M ${corner},0 
        L ${w - corner},0 
        L ${w - corner},${corner}
        L ${w},${corner}
        L ${w},${h - corner}
        L ${w - corner},${h - corner}
        L ${w - corner},${h}
        L ${corner},${h}
        L ${corner},${h - corner}
        L 0,${h - corner}
        L 0,${corner}
        L ${corner},${corner}
        Z
      `;
    }
    
    // Default Rectangle for others (L-bracket, U-channel unfolded are roughly rects)
    return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-industrial-100 font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
          CAD 预览 (Preview)
        </h3>
        <button 
          onClick={handleDownload}
          className="bg-industrial-500 hover:bg-industrial-400 text-white text-xs px-3 py-1 rounded transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          导出 SVG (Export)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={`-${padding} -${padding} ${viewBoxWidth} ${viewBoxHeight}`}
          className="max-h-[500px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
             <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
            </pattern>
          </defs>
          
          {/* Background Grid for Technical Feel */}
          <rect x={-padding} y={-padding} width={viewBoxWidth} height={viewBoxHeight} fill="url(#grid)" opacity="0.2" />

          <g transform={`translate(0,0)`}>
            {/* Cut Line (Outer Contour) */}
            <path 
              d={getOutlinePath()} 
              fill="#0f172a" 
              fillOpacity="0.5"
              stroke="#22d3ee" 
              strokeWidth="2" 
              vectorEffect="non-scaling-stroke"
            />

            {/* Bend Lines */}
            {result.bendLines.map((line, i) => (
              <line 
                key={i}
                x1={line.x1} y1={line.y1}
                x2={line.x2} y2={line.y2}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="5,5"
              />
            ))}

            {/* Holes */}
            {expandHoleArray(params).map((hole, i) => {
              // Map hole coordinates (from part drawing) to SVG flat pattern space.
              // SVG origin: top-left of the flat blank.
              // Hole x/y from AI: measured from the bottom-left corner of the FACE they are on.
              let cx = hole.x;
              let cy = hole.y;

              const { type, width, height, depth, flangeLength, bendAxis } = params;

              if (type === PartType.FLAT_PANEL) {
                // Y from bottom → convert to SVG Y from top
                cy = result.flatHeight - hole.y;

              } else if (type === PartType.L_BRACKET) {
                const bendLineY = height;
                if (!hole.face || hole.face === 'MAIN') {
                  cy = bendLineY - hole.y;
                } else {
                  cy = result.flatHeight - hole.y;
                }

              } else if (type === PartType.U_CHANNEL) {
                const bd = params.bendRadius + params.materialThickness * params.kFactor;
                const flangeFlatShort = depth - bd;

                if (bendAxis === 'SHORT') {
                  // ㄇ字型：水平展开 [LEFT_FLANGE | MAIN | RIGHT_FLANGE]
                  // Bend lines are vertical
                  if (!hole.face || hole.face === 'MAIN') {
                    cx = flangeFlatShort + hole.x;
                    cy = result.flatHeight - hole.y;
                  } else if (hole.face === 'FLANGE_LEFT') {
                    cx = flangeFlatShort - hole.y;
                    cy = result.flatHeight - hole.x;
                  } else if (hole.face === 'FLANGE_RIGHT') {
                    cx = flangeFlatShort + width + hole.y;
                    cy = result.flatHeight - hole.x;
                  }
                } else {
                  // 水槽型（LONG）：垂直展开 [TOP_FLANGE / MAIN / BOTTOM_FLANGE]
                  // Bend lines are horizontal
                  // 使用精准的折弯扣除后法兰高度
                  const flangeFlatLong = depth - bd / 2;

                  if (!hole.face || hole.face === 'MAIN') {
                    // MAIN face: cx 直接等于 hole.x（水平居中）
                    // cy = flangeFlatLong + height - hole.y
                    cx = hole.x;
                    cy = (flangeFlatLong + height) - hole.y;
                  } else if (hole.face === 'FLANGE_TOP') {
                    // Top flange: y from 0 to flangeFlatLong
                    cx = hole.x;
                    cy = flangeFlatLong - hole.y;
                  } else if (hole.face === 'FLANGE_BOTTOM') {
                    // Bottom flange: y from flangeFlatLong+height to flatHeight
                    cx = hole.x;
                    cy = (flangeFlatLong + height) + hole.y;
                  }
                }

              } else {
                // Fallback
                cy = result.flatHeight - hole.y;
              }

              // Skip holes whose coordinates fall outside the flat blank area
              const margin = (hole.diameter || Math.max(hole.width || 0, hole.height || 0) || 10) / 2;
              if (cx - margin < -margin || cx + margin > result.flatWidth + margin ||
                  cy - margin < -margin || cy + margin > result.flatHeight + margin) {
                return null;
              }

              if (hole.type === 'CIRCLE') {
                return (
                  <circle 
                    key={`hole-${i}`}
                    cx={cx} 
                    cy={cy} 
                    r={(hole.diameter || 10) / 2} 
                    fill="#0f172a" 
                    stroke="#ef4444" 
                    strokeWidth="1"
                  />
                );
              } else {
                const w = hole.width || 10;
                const h = hole.height || 10;
                return (
                  <rect 
                    key={`hole-${i}`}
                    x={cx - w/2} 
                    y={cy - h/2} 
                    width={w} 
                    height={h} 
                    fill="#0f172a" 
                    stroke="#ef4444" 
                    strokeWidth="1"
                  />
                );
              }
            })}

            {/* Dimensions Annotations - Clickable */}
            {/* Overall Width */}
            <line x1="0" y1={-20} x2={result.flatWidth} y2={-20} stroke="#94a3b8" strokeWidth="1" />
            <line x1="0" y1={-25} x2="0" y2={-15} stroke="#94a3b8" strokeWidth="1" />
            <line x1={result.flatWidth} y1={-25} x2={result.flatWidth} y2={-15} stroke="#94a3b8" strokeWidth="1" />
            <text 
              x={result.flatWidth/2} 
              y={-30} 
              fill={onChange ? "#22d3ee" : "#94a3b8"} 
              fontSize="12" 
              textAnchor="middle" 
              fontFamily="monospace"
              style={{ cursor: onChange ? 'pointer' : 'default' }}
              onClick={() => handleDimensionClick('总长度 (Width)', params.width, 'width')}
            >
              {result.flatWidth.toFixed(1)} mm
            </text>

            {/* Overall Height */}
            <line x1={-20} y1="0" x2={-20} y2={result.flatHeight} stroke="#94a3b8" strokeWidth="1" />
            <line x1={-25} y1="0" x2={-15} y2="0" stroke="#94a3b8" strokeWidth="1" />
            <line x1={-25} y1={result.flatHeight} x2={-15} y2={result.flatHeight} stroke="#94a3b8" strokeWidth="1" />
            <text 
              x={-30} 
              y={result.flatHeight/2} 
              fill={onChange ? "#22d3ee" : "#94a3b8"} 
              fontSize="12" 
              textAnchor="middle" 
              transform={`rotate(-90, -30, ${result.flatHeight/2})`} 
              fontFamily="monospace"
              style={{ cursor: onChange ? 'pointer' : 'default' }}
              onClick={() => handleDimensionClick('截面高度 (Height)', params.height, 'height')}
            >
              {result.flatHeight.toFixed(1)} mm
            </text>

            {/* Hole Array Dimensions - if present */}
            {params.holeArray && typeof params.holeArray === 'object' && (() => {
              const { startX = 0, startY = 0, spacing = 0, count = 0 } = params.holeArray;
              
              if (typeof count !== 'number' || count <= 0 || typeof spacing !== 'number' || spacing <= 0) {
                return null;
              }
              
              const lastHoleX = startX + (count - 1) * spacing;
              const endMargin = params.width - lastHoleX;
              const holeY = result.flatHeight / 2;
              
              return (
                <>
                  {/* Left margin (startX) */}
                  <line x1="0" y1={result.flatHeight + 15} x2={startX} y2={result.flatHeight + 15} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1="0" y1={result.flatHeight + 10} x2="0" y2={result.flatHeight + 20} stroke="#f59e0b" strokeWidth="1" />
                  <line x1={startX} y1={result.flatHeight + 10} x2={startX} y2={result.flatHeight + 20} stroke="#f59e0b" strokeWidth="1" />
                  <text 
                    x={startX / 2} 
                    y={result.flatHeight + 28} 
                    fill={onChange ? "#f59e0b" : "#94a3b8"} 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                    style={{ cursor: onChange ? 'pointer' : 'default' }}
                    onClick={() => handleDimensionClick('左侧边距', startX, 'holeArray.startX')}
                  >
                    L:{startX.toFixed(1)}
                  </text>

                  {/* Right margin (endMargin) - with reverse derivation */}
                  <line x1={lastHoleX} y1={result.flatHeight + 15} x2={params.width} y2={result.flatHeight + 15} stroke="#10b981" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={lastHoleX} y1={result.flatHeight + 10} x2={lastHoleX} y2={result.flatHeight + 20} stroke="#10b981" strokeWidth="1" />
                  <line x1={params.width} y1={result.flatHeight + 10} x2={params.width} y2={result.flatHeight + 20} stroke="#10b981" strokeWidth="1" />
                  <text 
                    x={(lastHoleX + params.width) / 2} 
                    y={result.flatHeight + 28} 
                    fill={onChange ? "#10b981" : "#94a3b8"} 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                    style={{ cursor: onChange ? 'pointer' : 'default' }}
                    onClick={handleRightMarginClick}
                  >
                    R:{endMargin.toFixed(1)}
                  </text>

                  {/* Top margin (height - startY) */}
                  <line x1={result.flatWidth + 15} y1="0" x2={result.flatWidth + 15} y2={holeY - startY} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={result.flatWidth + 10} y1="0" x2={result.flatWidth + 20} y2="0" stroke="#8b5cf6" strokeWidth="1" />
                  <line x1={result.flatWidth + 10} y1={holeY - startY} x2={result.flatWidth + 20} y2={holeY - startY} stroke="#8b5cf6" strokeWidth="1" />
                  <text 
                    x={result.flatWidth + 28} 
                    y={(holeY - startY) / 2} 
                    fill={onChange ? "#8b5cf6" : "#94a3b8"} 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                    transform={`rotate(90, ${result.flatWidth + 28}, ${(holeY - startY) / 2})`}
                    style={{ cursor: onChange ? 'pointer' : 'default' }}
                    onClick={() => handleVerticalMarginClick('top')}
                  >
                    T:{(params.height - startY).toFixed(1)}
                  </text>

                  {/* Bottom margin (startY) */}
                  <line x1={result.flatWidth + 15} y1={holeY + startY} x2={result.flatWidth + 15} y2={result.flatHeight} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,2" />
                  <line x1={result.flatWidth + 10} y1={holeY + startY} x2={result.flatWidth + 20} y2={holeY + startY} stroke="#8b5cf6" strokeWidth="1" />
                  <text 
                    x={result.flatWidth + 28} 
                    y={(holeY + startY + result.flatHeight) / 2} 
                    fill={onChange ? "#8b5cf6" : "#94a3b8"} 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontFamily="monospace"
                    transform={`rotate(90, ${result.flatWidth + 28}, ${(holeY + startY + result.flatHeight) / 2})`}
                    style={{ cursor: onChange ? 'pointer' : 'default' }}
                    onClick={() => handleVerticalMarginClick('bottom')}
                  >
                    B:{startY.toFixed(1)}
                  </text>

                  {/* Spacing between holes */}
                  {count > 1 && (
                    <>
                      <line x1={startX} y1={-35} x2={startX + spacing} y2={-35} stroke="#06b6d4" strokeWidth="1" />
                      <line x1={startX} y1={-40} x2={startX} y2={-30} stroke="#06b6d4" strokeWidth="1" />
                      <line x1={startX + spacing} y1={-40} x2={startX + spacing} y2={-30} stroke="#06b6d4" strokeWidth="1" />
                      <text 
                        x={startX + spacing / 2} 
                        y={-45} 
                        fill={onChange ? "#06b6d4" : "#94a3b8"} 
                        fontSize="9" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                        style={{ cursor: onChange ? 'pointer' : 'default' }}
                        onClick={() => handleDimensionClick('孔间距', spacing, 'holeArray.spacing')}
                      >
                        P:{spacing.toFixed(1)}
                      </text>
                    </>
                  )}
                </>
              );
            })()}
            
          </g>
        </svg>
      </div>
      
      <div className="bg-slate-800 p-2 text-xs text-slate-400 border-t border-slate-700 flex justify-between">
         <span>Green: Cut Line</span>
         <span>Yellow Dashed: Bend Line</span>
         <span>Calculated Flat Size: {result.flatWidth.toFixed(1)} x {result.flatHeight.toFixed(1)} mm</span>
      </div>
    </div>
  );
};
