import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
// 注意：请在部署环境中正确设置这些环境变量
let supabaseUrl: string, supabaseAnonKey: string;

try {
  // 尝试从环境变量获取值
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // 防御性检查 - 避免使用无效值
  if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseUrl.startsWith('http')) {
    console.error('[Supabase Config] Invalid or missing URL in environment variables');
    throw new Error('无效的Supabase URL配置');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    console.error('[Supabase Config] Invalid or missing key in environment variables');
    throw new Error('无效的Supabase Key配置');
  }
} catch (error) {
  console.error('[Supabase Config] Error accessing environment variables:', error);
  throw new Error('Supabase环境配置错误，请正确设置环境变量');
}

// 输出信息以便调试（不含敏感信息）
console.log('[Supabase Config] 环境变量加载成功');

// 创建 Supabase 客户端
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('[Supabase Config] Client created successfully');
} catch (error) {
  console.error('[Supabase Config] Error creating client:', error);
  throw new Error('Supabase客户端创建失败');
}

export default supabase; 