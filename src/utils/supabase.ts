import { createClient, SupabaseClient } from '@supabase/supabase-js';
import envConfig from '../../env.config';

// 使用环境配置文件中的值作为后备
const FALLBACK_URL = envConfig.supabase.url;
const FALLBACK_KEY = envConfig.supabase.anonKey;

// 使用try-catch确保即使环境变量有问题也能使用后备值
let supabaseUrl, supabaseAnonKey;

try {
  // 尝试从环境变量获取值，如果获取失败则使用后备值
  supabaseUrl = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'undefined' && import.meta.env.VITE_SUPABASE_URL.startsWith('http')) 
    ? import.meta.env.VITE_SUPABASE_URL 
    : FALLBACK_URL;
  
  supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY !== 'undefined')
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : FALLBACK_KEY;
} catch (error) {
  console.error('Error accessing environment variables, using fallback values:', error);
  supabaseUrl = FALLBACK_URL;
  supabaseAnonKey = FALLBACK_KEY;
}

// 输出值以便调试
console.log('[Supabase Config] URL:', supabaseUrl);
console.log('[Supabase Config] Using fallback:', supabaseUrl === FALLBACK_URL);

// 创建 Supabase 客户端
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[Supabase Config] Client created successfully');
} catch (error) {
  console.error('[Supabase Config] Error creating client, trying with fallback values:', error);
  // 如果创建失败，使用后备值再次尝试
  supabase = createClient(FALLBACK_URL, FALLBACK_KEY);
}

export default supabase; 