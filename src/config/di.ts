import supabase from '../utils/supabase';
import { DIContainer, RepositoryFactory } from '../repositories';
import { ServiceFactory } from '../services';

// 全局服务工厂实例
let serviceFactory: ServiceFactory;

/**
 * 初始化依赖注入容器
 */
export function initializeDI(): DIContainer {
  const container = DIContainer.getInstance();
  
  // 创建Repository工厂
  const repositoryFactory = new RepositoryFactory(supabase);
  
  // 创建服务工厂
  serviceFactory = new ServiceFactory(repositoryFactory);
  
  // 注册到容器
  container.registerRepositoryFactory(repositoryFactory);
  
  return container;
}

/**
 * 获取已配置的依赖注入容器
 */
export function getDIContainer(): DIContainer {
  return DIContainer.getInstance();
}

/**
 * 获取服务工厂
 */
export function getServiceFactory(): ServiceFactory {
  if (!serviceFactory) {
    throw new Error('DI container not initialized. Call initializeDI() first.');
  }
  return serviceFactory;
} 