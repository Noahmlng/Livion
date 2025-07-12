import { ITemplateService } from './interfaces';
import { IBehaviourRepository, IChallengeRepository, Behaviour, Challenge } from '../repositories/interfaces';

/**
 * 模板服务实现
 */
export class TemplateService implements ITemplateService {
  private behaviourRepository: IBehaviourRepository;
  private challengeRepository: IChallengeRepository;

  constructor(behaviourRepository: IBehaviourRepository, challengeRepository: IChallengeRepository) {
    this.behaviourRepository = behaviourRepository;
    this.challengeRepository = challengeRepository;
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(userId: string): Promise<Behaviour[]> {
    return await this.behaviourRepository.getAll(userId);
  }

  /**
   * 创建新模板
   */
  async createTemplate(templateData: Omit<Behaviour, 'template_id' | 'created_at' | 'user_id'>, userId: string): Promise<Behaviour> {
    if (!templateData.name.trim()) {
      throw new Error('Template name is required');
    }

    const templateToCreate = {
      ...templateData,
      reward_points: templateData.reward_points || 0
    };

    return await this.behaviourRepository.create(templateToCreate, userId);
  }

  /**
   * 更新模板
   */
  async updateTemplate(templateId: number, updates: Partial<Behaviour>, userId: string): Promise<void> {
    await this.behaviourRepository.update(templateId, updates, userId);
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateId: number, userId: string): Promise<void> {
    await this.behaviourRepository.delete(templateId, userId);
  }

  /**
   * 从模板创建任务
   */
  async createTaskFromTemplate(templateId: number, userId: string): Promise<Challenge> {
    // 获取模板信息
    const template = await this.behaviourRepository.getById(templateId, userId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // 根据模板创建任务
    const taskData = {
      name: template.name,
      description: template.description || '',
      priority: 0,
      status: 'ongoing' as const,
      reward_points: template.reward_points || 0
    };

    return await this.challengeRepository.create(taskData, userId);
  }
} 