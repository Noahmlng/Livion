import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { IGoalRepository, Goal } from './interfaces';

/**
 * Goal Repository实现
 */
export class GoalRepository extends BaseRepository<Goal> implements IGoalRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'goals', 'goal_id', 'user_id');
  }
} 