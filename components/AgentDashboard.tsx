
import React from 'react';
import { AGENT_DATA } from '../constants/agentData';
import AgentCard from './AgentCard';
import { ArrowLeft } from 'lucide-react';

interface AgentDashboardProps {
  onNavigateBack: () => void;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ onNavigateBack }) => {
  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onNavigateBack} 
            className="p-2 rounded-md hover:bg-gray-700 transition-colors"
            aria-label="Back to game"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">AI Agents & Services</h1>
        </div>
        <p className="text-sm text-gray-400">Cloud Run Multi-Agent Architecture</p>
      </header>
      <div className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-12">
          {AGENT_DATA.map((service) => (
            <section key={service.service}>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-indigo-400">{service.service}</h2>
                <p className="mt-2 text-gray-400 max-w-3xl">{service.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {service.agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
