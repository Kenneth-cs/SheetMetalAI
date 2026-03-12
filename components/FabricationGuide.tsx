import React from 'react';
import { FabricationAdvice } from '../types';

interface Props {
  advice: FabricationAdvice | null;
}

export const FabricationGuide: React.FC<Props> = ({ advice }) => {
  if (!advice) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-full overflow-y-auto">
      <h3 className="text-industrial-100 font-semibold flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-industrial-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
        加工工艺建议 (Fabrication Advice)
      </h3>

      <div className="space-y-6">
        {/* Cutting Section */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">1</span>
            切割与下料 (Cutting)
          </h4>
          <ul className="space-y-2 pl-8">
            {advice.cuttingSteps.map((step, idx) => (
              <li key={idx} className="text-xs text-slate-400 list-disc marker:text-industrial-500">
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Bending Section */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">2</span>
            折弯工序 (Bending)
          </h4>
          <ul className="space-y-2 pl-8">
            {advice.bendingSequence.map((step, idx) => (
              <li key={idx} className="text-xs text-slate-400 list-disc marker:text-industrial-500">
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips Section */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">3</span>
            专家提示 (Pro Tips)
          </h4>
          <div className="pl-8 space-y-2">
            {advice.technicalTips.map((tip, idx) => (
              <div key={idx} className="bg-industrial-900/20 border border-industrial-900/50 p-2 rounded text-xs text-industrial-300 flex gap-2">
                 <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
