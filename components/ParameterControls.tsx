import React from 'react';
import { SheetMetalParams, PartType } from '../types';
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
      </div>
    </div>
  );
};
