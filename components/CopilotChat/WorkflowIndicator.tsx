import React from 'react';
import { AgentAvatar, AgentRole } from './AgentAvatar';
import { WorkflowState, AgentStatus } from './types';

interface WorkflowIndicatorProps {
  workflow: WorkflowState;
  agentStatuses: AgentStatus[];
}

const phases: { key: WorkflowState['phase']; label: string; agent?: AgentRole }[] = [
  { key: 'idle', label: '待命中' },
  { key: 'uploading', label: '接收指令' },
  { key: 'splitting', label: '视图拆解', agent: 'splitter' },
  { key: 'extracting', label: '参数提取', agent: 'extractor' },
  { key: 'inspecting', label: '质检校验', agent: 'inspector' },
  { key: 'executing', label: '执行指令', agent: 'controller' },
  { key: 'complete', label: '完成' },
];

export const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({ workflow, agentStatuses }) => {
  if (workflow.phase === 'idle') return null;

  const currentPhaseIndex = phases.findIndex(p => p.key === workflow.phase);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-industrial-400 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-slate-300">工作流进度</span>
      </div>
      <div className="flex items-center gap-1">
        {phases.slice(1, -1).map((phase, index) => {
          const isActive = index < currentPhaseIndex - 1;
          const isCurrent = index === currentPhaseIndex - 2;
          const agentStatus = phase.agent
            ? agentStatuses.find(a => a.role === phase.agent)
            : null;

          return (
            <React.Fragment key={phase.key}>
              {index > 0 && (
                <div
                  className={`h-0.5 flex-1 ${
                    isActive ? 'bg-industrial-500' : 'bg-slate-700'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                {phase.agent && (
                  <div className={isCurrent ? 'ring-2 ring-industrial-400 rounded-full' : ''}>
                    <AgentAvatar role={phase.agent} size="sm" />
                  </div>
                )}
                <span
                  className={`text-[10px] ${
                    isCurrent
                      ? 'text-industrial-400 font-medium'
                      : isActive
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}
                >
                  {phase.label}
                </span>
                {agentStatus?.status === 'working' && (
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
