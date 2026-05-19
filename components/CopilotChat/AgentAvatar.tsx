import React from 'react';

export type AgentRole = 'controller' | 'splitter' | 'extractor' | 'inspector';

interface AgentAvatarProps {
  role: AgentRole;
  size?: 'sm' | 'md';
}

const agentConfig: Record<AgentRole, { name: string; icon: string; color: string; bgColor: string }> = {
  controller: {
    name: '项目经理',
    icon: '👔',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
  },
  splitter: {
    name: '拆解员',
    icon: '🔍',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
  },
  extractor: {
    name: '提取员',
    icon: '⚙️',
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/30',
  },
  inspector: {
    name: '质检员',
    icon: '✓',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
  },
};

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ role, size = 'md' }) => {
  const config = agentConfig[role];
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div
      className={`${sizeClasses} ${config.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
      title={config.name}
    >
      <span>{config.icon}</span>
    </div>
  );
};

export const getAgentConfig = (role: AgentRole) => agentConfig[role];
