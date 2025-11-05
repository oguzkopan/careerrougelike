
import React from 'react';
import { AgentConfig } from '../types';
import { Cpu, BrainCircuit, Code } from 'lucide-react';

const AgentCard: React.FC<{ agent: AgentConfig }> = ({ agent }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="p-6">
        <div className="flex items-start justify-between">
            <div className='flex items-center gap-3'>
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                    <Cpu className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                    <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">{agent.model}</span>
                </div>
            </div>
        </div>
        <p className="mt-4 text-gray-400 text-sm">{agent.description}</p>
      </div>
      <div className="flex-grow mt-auto p-6 bg-gray-900/60">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
          <Code className="w-4 h-4 mr-2 text-gray-500" />
          Prompt Snippet
        </h4>
        <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-black/30 p-3 rounded-md border border-gray-700 font-mono">
          <code>{agent.promptSnippet}</code>
        </pre>
      </div>
    </div>
  );
};

export default AgentCard;
