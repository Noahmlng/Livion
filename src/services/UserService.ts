import { IUserService } from './interfaces';
import { IUserRepository, User } from '../repositories/interfaces';

/**
 * 用户服务实现
 */
export class UserService implements IUserService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * 用户登录
   */
  async login(password: string): Promise<User> {
    const user = await this.userRepository.getByPassword(password);
    
    if (!user) {
      throw new Error('Invalid password');
    }
    
    return user;
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    return await this.userRepository.getById(userId);
  }

  /**
   * 创建新用户
   */
  async createUser(userData: Omit<User, 'user_id' | 'created_at'>): Promise<User> {
    // 可以在这里添加业务逻辑，如密码验证、默认值设置等
    const userToCreate = {
      ...userData,
      total_points: userData.total_points || 0
    };
    
    return await this.userRepository.create(userToCreate);
  }

  /**
   * 更新用户积分
   */
  async updateUserPoints(userId: string, points: number): Promise<void> {
    // 获取当前用户
    const currentUser = await this.userRepository.getById(userId);
    
    if (!currentUser) {
      throw new Error('User not found');
    }
    
    // 更新积分
    const newPoints = currentUser.total_points + points;
    await this.userRepository.update(userId, { total_points: newPoints });
  }
} 