# 部署指南

## 环境变量设置

在部署环境中，请确保设置以下环境变量：

### Supabase配置

```
# Supabase URL
VITE_SUPABASE_URL=https://rnkgkrwzwfaztwdgjfzz.supabase.co

# Supabase匿名密钥
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJua2drcnd6d2ZhenR3ZGdqZnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUwNTU2ODksImV4cCI6MjAzMDYzMTY4OX0.IyhdSB-yp8LD15rvpyJXb7r0NOF6vmvPO02u3yBZFJY
```

## 部署平台设置

### Vercel
在Vercel上，可以在项目设置的"Environment Variables"部分添加上述环境变量。

### Netlify
在Netlify上，可以在"Site settings" > "Build & deploy" > "Environment"部分添加上述环境变量。 