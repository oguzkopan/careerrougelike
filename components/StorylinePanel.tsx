
import React, { useRef, useEffect } from 'react';
import { StoryEvent } from '../types';
import { Bot, CheckCircle2, AlertTriangle, ChevronsUp, XCircle, FileText } from 'lucide-react';

const iconMap: { [key in StoryEvent['type']]: React.ReactNode } = {
  system: <Bot className="w-5 h-5 text-indigo-400" />,
  task: <FileText className="w-5 h-5 text-blue-400" />,
  feedback: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  event: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  promotion: <ChevronsUp className="w-5 h-5 text-teal-400" />,
  layoff: <XCircle className="w-5 h-5 text-red-400" />,
};

const StorylinePanel: React.FC<{ events: StoryEvent[] }> = ({ events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <>
      <h2 className="text-lg font-semibold p-4 border-b border-gray-700 text-white">Storyline & Events</h2>
      <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4">
        {events.map((event, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0 pt-1">
              {iconMap[event.type]}
            </div>
            <div>
              <p className="text-sm text-gray-300">{event.content}</p>
              {event.timestamp && <p className="text-xs text-gray-500 mt-1">{event.timestamp}</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default StorylinePanel;
