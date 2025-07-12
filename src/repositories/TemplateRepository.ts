import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { ITemplateRepository, TaskTemplate } from './interfaces';

/**
 * Template Repository实现
 */
export class TemplateRepository extends BaseRepository<TaskTemplate> implements ITemplateRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'task_templates', 'template_id', 'user_id');
  }
} 