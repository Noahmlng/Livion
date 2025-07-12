import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
let supabaseUrl: string, supabaseAnonKey: string;

try {
  // 尝试从环境变量获取值
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // 防御性检查 - 避免使用无效值
  if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseUrl.startsWith('http')) {
    throw new Error('无效的Supabase URL配置');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    throw new Error('无效的Supabase Key配置');
  }
} catch (error) {
  throw new Error('Supabase环境配置错误，请正确设置环境变量');
}

// 创建 Supabase 客户端
let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  throw new Error('Supabase客户端创建失败');
}

export default supabase; 