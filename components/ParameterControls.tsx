import React from 'react';
import { SheetMetalParams, PartType, BendAxis } from '../types';
import { PART_TYPE_OPTIONS } from '../constants';

interface Props {
  params: SheetMetalParams;
  onChange: (newParams: SheetMetalParams) => void;
}

export const ParameterControls: React.FC<Props> = ({ params, onChange }) => {
  const handleChange = (field: keyof SheetMetalParams, value: any) => {
    onChange({
      ...params,
      [field]: value
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-full overflow-y-auto">
      <h3 className="text-industrial-100 font-semibold mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        参数设置 (Parameters)
      </h3>

      <div className="space-y-4">
        {/* Part Type Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">零件类型 (Type)</label>
          <select 
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-industrial-500 outline-none"
            value={params.type}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            {PART_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Width */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">宽度 (Width A)</label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                value={params.width}
                onChange={(e) => handleChange('width', Number(e.target.value))}
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">高度/长度 (Length B)</label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                value={params.height}
                onChange={(e) => handleChange('height', Number(e.target.value))}
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
            </div>
          </div>
        </div>

        {/* Conditionals based on type */}
        {(params.type === PartType.U_CHANNEL || params.type === PartType.BOX_PANEL) && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">折弯高度 (Depth C)</label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                value={params.depth}
                onChange={(e) => handleChange('depth', Number(e.target.value))}
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
            </div>
          </div>
        )}

        {/* Bend Axis Toggle for U-Channel */}
        {params.type === PartType.U_CHANNEL && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">折弯方向 (Bend Direction)</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleChange('bendAxis', 'LONG' as BendAxis)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors border ${
                  (!params.bendAxis || params.bendAxis === 'LONG')
                    ? 'bg-industrial-600 border-industrial-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="font-semibold">沿长边</div>
                <div className="text-[10px] opacity-70">水槽型</div>
              </button>
              <button
                onClick={() => handleChange('bendAxis', 'SHORT' as BendAxis)}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors border ${
                  params.bendAxis === 'SHORT'
                    ? 'bg-industrial-600 border-industrial-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="font-semibold">沿短边</div>
                <div className="text-[10px] opacity-70">ㄇ字型</div>
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 bg-slate-800/50 p-2 rounded">
              {(!params.bendAxis || params.bendAxis === 'LONG')
                ? '水槽型：沿长度方向上下折弯，形成U型水槽截面'
                : 'ㄇ字型：沿宽度方向左右折弯，形成ㄇ型支架截面'}
            </div>
          </div>
        )}

        {params.type === PartType.L_BRACKET && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">翼缘长度 (Flange)</label>
            <div className="relative">
              <input 
                type="number" 
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                value={params.flangeLength}
                onChange={(e) => handleChange('flangeLength', Number(e.target.value))}
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
            </div>
          </div>
        )}

        <div className="border-t border-slate-700 pt-4 mt-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">工艺参数 (Material)</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">板厚 (Thickness)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                  value={params.materialThickness}
                  onChange={(e) => handleChange('materialThickness', Number(e.target.value))}
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">内R角 (Radius)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                  value={params.bendRadius}
                  onChange={(e) => handleChange('bendRadius', Number(e.target.value))}
                />
                <span className="absolute right-2 top-2 text-xs text-slate-500">mm</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">K因子 (K-Factor)</label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-industrial-500 outline-none font-mono"
                  value={params.kFactor}
                  onChange={(e) => handleChange('kFactor', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hole Array Section */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">孔位阵列 (Hole Array)</h4>
            {!params.holeArray ? (
              <button
                onClick={() => handleChange('holeArray', { startX: 15, startY: params.height / 2, spacing: 25, count: 5, diameter: 5.4, face: 'MAIN' })}
                className="text-[10px] px-2 py-1 rounded bg-industrial-600 hover:bg-industrial-500 text-white transition-colors"
              >
                + 添加阵列
              </button>
            ) : (
              <button
                onClick={() => handleChange('holeArray', undefined)}
                className="text-[10px] px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
              >
                移除阵列
              </button>
            )}
          </div>

          {params.holeArray ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">首孔距 X</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-industrial-500 outline-none font-mono"
                      value={params.holeArray.startX}
                      onChange={(e) => handleChange('holeArray', { ...params.holeArray!, startX: Number(e.target.value) })}
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">mm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">孔中心 Y</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-industrial-500 outline-none font-mono"
                      value={params.holeArray.startY}
                      onChange={(e) => handleChange('holeArray', { ...params.holeArray!, startY: Number(e.target.value) })}
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">mm</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">孔间距</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-industrial-500 outline-none font-mono"
                      value={params.holeArray.spacing}
                      onChange={(e) => handleChange('holeArray', { ...params.holeArray!, spacing: Number(e.target.value) })}
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">mm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">孔数量</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-industrial-500 outline-none font-mono"
                    value={params.holeArray.count}
                    onChange={(e) => handleChange('holeArray', { ...params.holeArray!, count: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">孔直径</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-industrial-500 outline-none font-mono"
                    value={params.holeArray.diameter}
                    onChange={(e) => handleChange('holeArray', { ...params.holeArray!, diameter: Number(e.target.value) })}
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">mm</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 bg-slate-800/50 p-2 rounded border border-dashed border-slate-700">
                <span className="text-industrial-400">预览:</span> {params.holeArray.count} 个 Φ{params.holeArray.diameter} 孔，
                从 X={params.holeArray.startX} 开始，间距 {params.holeArray.spacing}mm
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-slate-600">
              点击"添加阵列"创建等距排孔，适合处理图纸标注如 "8x25(=200)" 的孔位。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
