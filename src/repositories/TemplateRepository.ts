import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import { IBehaviourRepository, Behaviour } from './interfaces';

/**
 * Behaviour Repository实现 (formerly Template)
 */
export class BehaviourRepository extends BaseRepository<Behaviour> implements IBehaviourRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'behaviour', 'template_id', 'user_id');
  }
} 