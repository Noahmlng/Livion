import { ITemplateService } from './interfaces';
import { ITemplateRepository, ITaskRepository, TaskTemplate, Task } from '../repositories/interfaces';

/**
 * 模板服务实现
 */
export class TemplateService implements ITemplateService {
  private templateRepository: ITemplateRepository;
  private taskRepository: ITaskRepository;

  constructor(templateRepository: ITemplateRepository, taskRepository: ITaskRepository) {
    this.templateRepository = templateRepository;
    this.taskRepository = taskRepository;
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(userId: string): Promise<TaskTemplate[]> {
    return await this.templateRepository.getAll(userId);
  }

  /**
   * 创建新模板
   */
  async createTemplate(templateData: Omit<TaskTemplate, 'template_id' | 'created_at' | 'user_id'>, userId: string): Promise<TaskTemplate> {
    if (!templateData.name.trim()) {
      throw new Error('Template name is required');
    }

    const templateToCreate = {
      ...templateData,
      default_points: templateData.default_points || 0
    };

    return await this.templateRepository.create(templateToCreate, userId);
  }

  /**
   * 更新模板
   */
  async updateTemplate(templateId: number, updates: Partial<TaskTemplate>, userId: string): Promise<void> {
    await this.templateRepository.update(templateId, updates, userId);
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: number, userId: string): Promise<void> {
    await this.templateRepository.delete(templateId, userId);
  }

  /**
   * 从模板创建任务
   */
  async createTaskFromTemplate(templateId: number, userId: string): Promise<Task> {
    // 获取模板信息
    const template = await this.templateRepository.getById(templateId, userId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // 根据模板创建任务
    const taskData = {
      name: template.name,
      description: template.description || '',
      priority: 0,
      status: 'ongoing' as const,
      reward_points: template.default_points || 0
    };

    return await this.taskRepository.create(taskData, userId);
  }
} 