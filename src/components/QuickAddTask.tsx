import React, { useState } from 'react';
import { FiPlus, FiCalendar, FiFlag } from 'react-icons/fi';
import { clsx } from 'clsx';

interface QuickAddTaskProps {
  onAddTask: (taskData: {
    title: string;
    type: string;
    priority: number;
    dueDate?: Date;
  }) => Promise<void>;
}

export default function QuickAddTask({ onAddTask }: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [taskType, setTaskType] = useState('Daily');
  const [priority, setPriority] = useState(3);
  const [dueDate, setDueDate] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    await onAddTask({
      title: title.trim(),
      type: taskType,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    
    // Reset form
    setTitle('');
    setShowOptions(false);
    setTaskType('Daily');
    setPriority(3);
    setDueDate('');
  };
  
  return (
    <div className="card mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-dark flex items-center justify-center flex-shrink-0">
            <FiPlus className="h-5 w-5 text-white" />
          </div>
          
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task..."
            className="input-field ml-3 flex-1"
            onFocus={() => setShowOptions(true)}
          />
          
          <button 
            type="submit"
            className="btn-primary ml-3"
            disabled={!title.trim()}
          >
            Add
          </button>
        </div>
        
        {showOptions && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Task Type
              </label>
              <div className="flex space-x-2">
                {['Daily', 'Challenges', 'Main'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={clsx(
                      'px-3 py-1.5 text-sm rounded-md',
                      taskType === type 
                        ? 'bg-primary text-white' 
                        : 'bg-background-dark text-gray-300 hover:bg-background-light'
                    )}
                    onClick={() => setTaskType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <FiFlag className="inline mr-1" /> Priority
              </label>
              <div className="flex space-x-2">
                {[1, 3, 5, 8].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={clsx(
                      'px-3 py-1.5 text-sm rounded-md',
                      priority === p 
                        ? 'bg-primary text-white' 
                        : 'bg-background-dark text-gray-300 hover:bg-background-light'
                    )}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <FiCalendar className="inline mr-1" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 