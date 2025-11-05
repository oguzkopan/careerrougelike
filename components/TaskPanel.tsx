import React, { useState } from 'react';
import { Task } from '../types';
import Button from './shared/Button';

interface TaskPanelProps {
  task: Task;
  onSubmit: (answer: string) => void;
  onSubmitEventChoice: (choice: string) => void;
  isLoading: boolean;
}

const TaskPanel: React.FC<TaskPanelProps> = ({ task, onSubmit, onSubmitEventChoice, isLoading }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer);
      setAnswer('');
    }
  };
  
  const isEvent = task.type === 'event' && task.choices && task.choices.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-700">
        <span className="text-sm font-semibold text-indigo-400 uppercase">{task.type}</span>
        <h2 className="text-2xl font-bold text-white mt-1">{task.title}</h2>
      </div>
      <div className="flex-grow p-6 overflow-y-auto">
        <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
      </div>
      
      {isEvent ? (
        <div className="p-6 border-t border-gray-700 bg-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">{task.prompt}</h3>
            <div className="flex flex-col gap-3">
                {task.choices?.map((choice, index) => (
                    <button 
                        key={index} 
                        onClick={() => onSubmitEventChoice(choice)} 
                        disabled={isLoading}
                        className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {choice}
                    </button>
                ))}
            </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 border-t border-gray-700 bg-gray-900/50">
          <label htmlFor="answer" className="block text-sm font-medium text-gray-300 mb-2">{task.prompt}</label>
          <textarea
            id="answer"
            rows={6}
            className="w-full bg-gray-800 border border-gray-600 rounded-md text-white p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out placeholder-gray-500"
            placeholder="Type your answer, code, or plan here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isLoading}
          />
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={isLoading || !answer.trim()}>
              {isLoading ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TaskPanel;