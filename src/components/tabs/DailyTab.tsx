import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TaskListContainer, 
  TaskCard, 
  PriorityIndicator,
  TaskModal,
  TaskModalHeader,
  TaskModalContent,
  TaskModalLeft,
  TaskModalRight,
  TaskModalFooter,
  Button,
  Overlay,
  FloatingButton
} from '../ui/StyledElements';
import { useTask } from '../../context/TaskContext';
import { Task, TaskTemplate } from '../../types/task';
import TaskForm from '../ui/TaskForm';

const DailyTab: React.FC = () => {
  const { templates, createTaskFromTemplate, updateTemplate, deleteTemplate } = useTask();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Sort templates
  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [templates]);

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  // Handle template click
  const handleTemplateClick = (template: TaskTemplate) => {
    setSelectedTemplate(template);
  };

  // Handle template deletion
  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setSelectedTemplate(null);
  };

  // Handle generate task from template
  const handleGenerateTask = (id: string) => {
    createTaskFromTemplate(id);
    
    // Show feedback (could be improved with a toast notification)
    alert('任务已生成！');
  };

  return (
    <TaskListContainer>
      {/* Templates List */}
      {sortedTemplates.length > 0 ? (
        sortedTemplates.map((template) => (
          <TaskCard 
            key={template.id} 
            onClick={() => handleTemplateClick(template)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ 
              background: 'linear-gradient(135deg, rgba(240,230,200,1) 0%, rgba(242,232,192,1) 100%)',
              border: '1px solid #e0a639'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PriorityIndicator priority={template.priority} />
                <span style={{ fontWeight: 500 }}>
                  {template.title}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: 'rgba(224, 166, 57, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#614126'
                }}>
                  {template.frequency === 'daily' && '每日'}
                  {template.frequency === 'weekly' && '每周'}
                  {template.frequency === 'monthly' && '每月'}
                </div>
                
                <Button 
                  size="small" 
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateTask(template.id);
                  }}
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  生成任务
                </Button>
              </div>
            </div>
          </TaskCard>
        ))
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '50vh',
          opacity: 0.7
        }}>
          <p style={{ marginBottom: '1rem' }}>无日常任务模板，创建一个来提高效率！</p>
          <Button onClick={() => setIsFormVisible(true)}>创建任务模板</Button>
        </div>
      )}

      {/* Template Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTemplate(null)}
          >
            <TaskModal
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <TaskModalHeader>
                <h2>{selectedTemplate.title}</h2>
                <Button 
                  variant="danger" 
                  size="small" 
                  onClick={() => setSelectedTemplate(null)}
                >
                  ×
                </Button>
              </TaskModalHeader>
              <TaskModalContent>
                <TaskModalLeft>
                  <p style={{ marginBottom: '1rem' }}>{selectedTemplate.description}</p>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>优先级：</strong>
                    <PriorityIndicator priority={selectedTemplate.priority} />
                    {selectedTemplate.priority === 'high' && '高优先级'}
                    {selectedTemplate.priority === 'medium' && '中等优先级'}
                    {selectedTemplate.priority === 'low' && '低优先级'}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>频率：</strong>
                    {selectedTemplate.frequency === 'daily' && '每日'}
                    {selectedTemplate.frequency === 'weekly' && '每周'}
                    {selectedTemplate.frequency === 'monthly' && '每月'}
                  </div>
                  {selectedTemplate.lastGenerated && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>上次生成：</strong> {formatDate(selectedTemplate.lastGenerated)}
                    </div>
                  )}
                </TaskModalLeft>
                <TaskModalRight>
                  <img src={`/task-images/daily.jpg`} alt={selectedTemplate.title} />
                </TaskModalRight>
              </TaskModalContent>
              <TaskModalFooter>
                <Button 
                  variant="danger" 
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                >
                  删除模板
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    handleGenerateTask(selectedTemplate.id);
                    setSelectedTemplate(null);
                  }}
                >
                  生成任务
                </Button>
              </TaskModalFooter>
            </TaskModal>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Template Form Modal */}
      <AnimatePresence>
        {isFormVisible && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFormVisible(false)}
          >
            <TaskForm 
              onClose={() => setIsFormVisible(false)} 
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              task={{ 
                id: '', 
                title: '', 
                description: '', 
                priority: 'medium', 
                category: 'daily', 
                status: 'todo', 
                createdAt: new Date(),
                tags: ['daily', 'template']
              } as Task}
            />
          </Overlay>
        )}
      </AnimatePresence>

      {/* Floating Button to Add Template */}
      <FloatingButton 
        onClick={() => setIsFormVisible(true)}
        variant="primary"
      >
        +
      </FloatingButton>
    </TaskListContainer>
  );
};

export default DailyTab; 