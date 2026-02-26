import React, { useMemo, useRef } from 'react';
import { SheetMetalParams, PartType } from '../types';
import { calculateFlatPattern } from '../utils/calculation';

interface Props {
  params: SheetMetalParams;
}

export const FlatPatternViewer: React.FC<Props> = ({ params }) => {
  const result = useMemo(() => calculateFlatPattern(params), [params]);
  const svgRef = useRef<SVGSVGElement>(null);

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
            {params.holes && params.holes.map((hole, i) => {
              // Map hole coordinates to flat pattern
              // For simple Flat Panel, x/y match.
              // For others, we need to offset based on where the "Main Face" ends up in the flat pattern.
              
              // In calculateFlatPattern:
              // Flat Panel: 0,0 is top-left? No, usually SVG origin.
              // Let's assume the "Main Face" starts at (0,0) for Flat Panel.
              // For L-Bracket, Main Face is top part? 
              // In calculation.ts:
              // L-Bracket: Height is top part. Bend line at y = Height - (bd/2).
              // So Main Face is from y=0 to y=Height-(bd/2).
              // Wait, in calculation.ts:
              // flatHeight = height + flangeLength - bd;
              // bendLines.push({ y1: height - (bd/2) ... })
              // So the main face is the top section (0 to bendLine).
              
              // We need to transform the hole coordinates (which are relative to bottom-left of main face)
              // to the SVG coordinates.
              
              let cx = hole.x;
              let cy = hole.y;
              
              if (params.type === PartType.FLAT_PANEL) {
                // SVG origin is top-left.
                // Hole Y is from bottom.
                // cy = height - hole.y
                cy = result.flatHeight - hole.y;
              } else if (params.type === PartType.L_BRACKET) {
                // Main face is the top part (height).
                // Bottom of main face is at the bend line?
                // Actually, let's assume hole.y is from the "bottom" of the main face (the bend).
                // If hole.y is from bottom of main face:
                // Bend Y = height - bd/2.
                // cy = (height - bd/2) - hole.y
                // If hole.y is from bottom of the PART (before unfolding)?
                // Usually drawings reference edges.
                // Let's assume hole.y is from the "bottom edge" of the main face.
                
                // For L-Bracket, if main face is the vertical leg:
                // Top of leg is y=0 in SVG.
                // Bottom of leg is y=height-bd/2.
                // So cy = (height - bd/2) - hole.y
                
                // Simplified:
                cy = (params.height) - hole.y; 
              } else {
                 // Fallback for complex parts - just place relative to bottom-left of bounding box for now
                 cy = result.flatHeight - hole.y;
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

            {/* Dimensions Annotations */}
            {/* Overall Width */}
            <line x1="0" y1={-20} x2={result.flatWidth} y2={-20} stroke="#94a3b8" strokeWidth="1" />
            <line x1="0" y1={-25} x2="0" y2={-15} stroke="#94a3b8" strokeWidth="1" />
            <line x1={result.flatWidth} y1={-25} x2={result.flatWidth} y2={-15} stroke="#94a3b8" strokeWidth="1" />
            <text x={result.flatWidth/2} y={-30} fill="#94a3b8" fontSize="12" textAnchor="middle" fontFamily="monospace">
              {result.flatWidth.toFixed(1)} mm
            </text>

            {/* Overall Height */}
            <line x1={-20} y1="0" x2={-20} y2={result.flatHeight} stroke="#94a3b8" strokeWidth="1" />
            <line x1={-25} y1="0" x2={-15} y2="0" stroke="#94a3b8" strokeWidth="1" />
            <line x1={-25} y1={result.flatHeight} x2={-15} y2={result.flatHeight} stroke="#94a3b8" strokeWidth="1" />
            <text x={-30} y={result.flatHeight/2} fill="#94a3b8" fontSize="12" textAnchor="middle" transform={`rotate(-90, -30, ${result.flatHeight/2})`} fontFamily="monospace">
              {result.flatHeight.toFixed(1)} mm
            </text>
            
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
