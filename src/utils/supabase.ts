import { createClient } from '@supabase/supabase-js';

// 确保提供有效的默认URL和Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rnkgkrwzwfaztwdgjfzz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJua2drcnd6d2ZhenR3ZGdqZnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwNTU2ODksImV4cCI6MjAzMDYzMTY4OX0.IyhdSB-yp8LD15rvpyJXb7r0NOF6vmvPO02u3yBZFJY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 