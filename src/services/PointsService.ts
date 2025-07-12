export interface PointsCalculationRequest {
    taskTitle: string;
    taskRecord?: string;
    customPrompt?: string;
    dailyPay?: number; // 日薪参数，默认1000
    userGoals?: string[]; // 用户目标
    userCompetenciesToDevelop?: string[]; // 用户要去习得的能力
  }
  
  export interface PointsCalculationResponse {
    points: number;
    reasoning: string;
    baseAmount: number; // 基础金额
    rewardAmount: number; // 奖励金额
    rewardMultiplier: number; // 与目标和能力提升方向的匹配度
    qualityBonus: number; // 学习奖励
    provider: string;
    cost: number;
  }
  
  export class PointsService {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!import.meta.env.VITE_DEEPSEEK_API_KEY;
  }

  /**
   * 主要的积分计算方法 - 使用 DeepSeek API
   */
  async calculatePoints(request: PointsCalculationRequest): Promise<PointsCalculationResponse> {
    if (!this.isEnabled) {
      throw new Error('DeepSeek API 未配置');
    }

    return this.calculateWithDeepSeek(request);
  }

  // /**
  //  * 测试版本的积分计算方法 - 包含详细信息 (已弃用，使用calculatePoints)
  //  */
  // async calculatePointsTest(request: PointsCalculationRequest): Promise<PointsCalculationResponse> {
  //   if (!this.isEnabled) {
  //     throw new Error('DeepSeek API 未配置');
  //   }

  //   return this.calculatePoints(request);
  // }
  
  /**
   * 使用 DeepSeek API 计算积分
   */
  private async calculateWithDeepSeek(request: PointsCalculationRequest): Promise<PointsCalculationResponse> {
    const { customPrompt, dailyPay = 1000 } = request;

    const prompt = customPrompt ? 
      this.getCustomSystemPrompt(customPrompt) + '\n\n' + this.createCustomPrompt(request) :
      this.getSystemPrompt() + '\n\n' + this.createPrompt(request);
  
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: customPrompt ? this.getCustomSystemPrompt(customPrompt) : this.getSystemPrompt()
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.9,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
          })
        });
  
        if (!response.ok) {
          throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        const responseText = data.choices[0]?.message?.content || '{}';
        const result = JSON.parse(responseText);
        
        // 计算积分
        const timeInDays = Math.min(result.estimatedTime || 0.05, 1.0); // 默认0.1天（约1.5小时），最高不超过1天
        const baseAmount = timeInDays * dailyPay;
        const rewardMultiplier = result.rewardMultiplier || 0.5; // AI计算的奖励系数，默认更低
        const rewardAmount = (baseAmount / 2 / 4 / 12) * rewardMultiplier; // 除以2再除以4再除以12 {1/2是一天只有一半时间是有效 working hours；1/4是价值创造到价格兑现的折损；1/12是实际到手资金 我愿意花在探索/消遣任务上比例}
        const qualityBonus = Math.min(result.qualityBonus || 0, 80); // 学习奖励上限80分
        const finalPoints = Math.max(Math.round(rewardAmount + qualityBonus), 5); // 最低5分
        
        return {
          points: finalPoints,
          reasoning: result.reasoning || '自动评估完成',
          baseAmount: Math.round(baseAmount),
          rewardAmount: Math.round(rewardAmount),
          rewardMultiplier: rewardMultiplier,
          qualityBonus: qualityBonus,
          provider: 'DeepSeek',
          cost: this.estimateTokenCost(prompt + responseText, 'deepseek')
        };
      } catch (error) {
        console.error('DeepSeek 计算失败:', error);
        throw error;
      }
    }
  
  // /**
  //  * 获取系统提示词 - 简化版本（仅返回积分）
  //  */
  // private getSystemPromptSimple(): string {
  //   return `作为一个个人任务管理系统的积分评估专家，请基于用户提供的任务信息进行积分评估。

  // 评估要求：
  // 1. 时间估算：保守估算完成这个任务需要多少天（可以是小数，如0.5天表示半天）
  //    - 采用严格的时间评估标准，考虑可能的复杂性和挑战，不可高估
  //    - 包含学习、思考、实施、调试、优化等全部时间
  //    - 重要限制：时间估算最高不超过1天，即使是复杂任务也应在1天内完成
  //    - 严格要求：时间估算必须基于实际工作量，不允许夸大
  //    - 时间估算参考标准：
  //      * 简单阅读/学习任务：0.05-0.1天（1-2小时）
  //      * 深度阅读/思考任务：0.1-0.2天（2-5小时）
  //      * 简单沟通/聊天任务：0.02-0.05天（0.5-1小时）
  //      * 产品分析/规划任务：0.3-0.5天（2-4小时）
  //      * 技术开发/实施任务：0.5-1天（4-8小时）
  //      * 复杂研究/创作任务：0.8-1天（6-8小时）
  // 2. 奖励系数：根据任务与用户目标和能力的匹配度计算奖励系数（0.5-2.5之间）
  //    - 关键要求：严格判断与目标的真实关联度，不允许过度拔高
  //    - 匹配度判断必须有明确证据，目标和能力的权重不同，越靠前的权重越高
  //    - 与首要目标/能力完美匹配且有突破性进展：2.0-2.5（必须有明确证据）
  //    - 与首要目标/能力高度匹配：1.5-2.0（直接相关且有明显提升）
  //    - 与重要目标/能力中度匹配：1.0-1.5（有一定关联但不够直接）
  //    - 与次要目标/能力轻微匹配：0.7-1.0（关联性较弱）
  //    - 与目标/能力无关但有创新价值：0.5-0.7（严格控制，需有真实价值）
  // 3. 学习奖励：如果有任务记录，根据记录中的思考和笔记判断学习收获，鼓励创新性理解（0-80分）
  //    - 卓越学习（70-80分）：结合自己的项目或经历进行深度分析，提出了原创性观点或独特见解，产生了认知突破或创新思路
  //    - 深度学习（50-69分）：结合自己的项目或经历进行分析思考，提出了新观点或独特见解，产生了认知突破
  //    - 良好学习（30-49分）：有清晰的思考过程和分析，能够联系实际情况，获得了有价值的学习收获
  //    - 基础学习（15-29分）：有一定思考，但缺乏深度分析或个人见解
  //    - 浅层学习（5-14分）：记录简单，主要是信息摘录，学习收获不明显
  //    - 无记录或无学习内容（0分）：无法评估学习收获

  // 积分计算公式：
  // - 基础金额 = 时间估算（天） × 日薪（元/天）
  // - 奖励金额 = 基础金额 ÷ 12 ÷ 4 ÷ 2 × 奖励系数
  // - 学习奖励 = 根据任务记录中的思考和笔记判断（0-80分）
  // - 最终积分 = 奖励金额 + 学习奖励（最低5分）

  // 评估标准：时间估算和目标匹配度判断要严格，学习收获评估鼓励创新性理解和多角度分析

  // 请返回 JSON 格式：
  // {
  //   "points": number // 最终积分（最低5分）
  // }

  // 重要提醒：
  // - 时间估算要严格精确，根据任务类型参考标准进行评估，不允许夸大，最高不超过1天
  // - 奖励系数要严格判断，必须有明确证据证明与目标的关联度，不允许过度拔高
  // - 学习奖励要鼓励创新，基于思考深度和学习收获给分，原创性思维可获得高分
  // - 在学习收获评估上给予更多创新惊喜，但基础评估（时间、匹配度）要严格
  // - 最终积分有最低5分的保障
  // - 直接返回最终积分，无需详细分析过程`;
  // }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(): string {
    return `作为一个个人任务管理系统的积分评估专家，请基于用户提供的任务信息进行积分评估。

评估要求：
1. 时间估算：保守估算完成这个任务需要多少天（可以是小数，如0.5天表示半天）
   - 采用严格的时间评估标准，考虑可能的复杂性和挑战，不可高估
   - 包含学习、思考、实施、调试、优化等全部时间
   - 重要限制：时间估算最高不超过1天，即使是复杂任务也应在1天内完成
   - 严格要求：时间估算必须基于实际工作量，不允许夸大
   - 时间估算参考标准：
     * 简单阅读/学习任务：0.05-0.1天（1-2小时）
     * 深度阅读/思考任务：0.1-0.2天（2-5小时）
     * 简单沟通/聊天任务：0.02-0.05天（0.5-1小时）
     * 产品分析/规划任务：0.3-0.5天（2-4小时）
     * 技术开发/实施任务：0.5-1天（4-8小时）
     * 复杂研究/创作任务：0.8-1天（6-8小时）
2. 奖励系数：根据任务与用户目标和能力的匹配度计算奖励系数（0.5-2.5之间）
   - 关键要求：严格判断与目标的真实关联度，不允许过度拔高
   - 匹配度判断必须有明确证据，目标和能力的权重不同，越靠前的权重越高
   - 与首要目标/能力完美匹配且有突破性进展：2.0-2.5（必须有明确证据）
   - 与首要目标/能力高度匹配：1.5-2.0（直接相关且有明显提升）
   - 与重要目标/能力中度匹配：1.0-1.5（有一定关联但不够直接）
   - 与次要目标/能力轻微匹配：0.7-1.0（关联性较弱）
   - 与目标/能力无关但有创新价值：0.5-0.7（严格控制，需有真实价值）
3. 学习奖励：如果有任务记录，根据记录中的思考和笔记判断学习收获，鼓励创新性理解（0-80分）
   - 卓越学习（70-80分）：结合自己的项目或经历进行深度分析，提出了原创性观点或独特见解，产生了认知突破或创新思路
   - 深度学习（50-69分）：结合自己的项目或经历进行分析思考，提出了新观点或独特见解，产生了认知突破
   - 良好学习（30-49分）：有清晰的思考过程和分析，能够联系实际情况，获得了有价值的学习收获
   - 基础学习（15-29分）：有一定思考，但缺乏深度分析或个人见解
   - 浅层学习（5-14分）：记录简单，主要是信息摘录，学习收获不明显
   - 无记录或无学习内容（0分）：无法评估学习收获

积分计算公式：
- 基础金额 = 时间估算（天） × 日薪（元/天）
- 奖励金额 = 基础金额 ÷ 12 ÷ 4 ÷ 2 × 奖励系数
- 学习奖励 = 根据任务记录中的思考和笔记判断（0-80分）
- 最终积分 = 奖励金额 + 学习奖励（最低5分）

评估标准：时间估算和目标匹配度判断要严格，学习收获评估鼓励创新性理解和多角度分析

请返回 JSON 格式：
{
  "estimatedTime": number, // 预计完成时间（单位：天，根据任务类型参考标准精确评估，最高1天）
  "rewardMultiplier": number, // 奖励系数（0.5-2.5，严格判断与目标的真实关联度）
  "qualityBonus": number, // 学习奖励（0-80分，没有任务记录时为0，基于思考和笔记的学习收获）
  "reasoning": "详细的评估理由，包括严格的时间估算、严格的奖励系数匹配度分析和创新性学习收获评估"
}

重要提醒：
- 时间估算要严格精确，根据任务类型参考标准进行评估，不允许夸大，最高不超过1天
- 奖励系数要严格判断，必须有明确证据证明与目标的关联度，不允许过度拔高
- 学习奖励要鼓励创新，基于思考深度和学习收获给分，原创性思维可获得高分
- 在学习收获评估上给予更多创新惊喜，但基础评估（时间、匹配度）要严格
- 最终积分有最低5分的保障`;
  }

  /**
   * 创建积分计算的提示词（仅包含任务数据）
   */
  private createPrompt(request: PointsCalculationRequest): string {
    const { taskTitle, taskRecord = '', dailyPay = 1000, userGoals = [], userCompetenciesToDevelop = [] } = request;
    
    return `任务标题：${taskTitle}

任务记录：${taskRecord || '无任务记录'}

日薪参数：${dailyPay}元/天

用户目标（按重要性排序，越靠前权重越高）：
${userGoals.length > 0 ? userGoals.map((goal, index) => `${index + 1}. ${goal} (权重: ${userGoals.length - index})`).join('\n') : '未设置目标'}

用户重视的能力（按重要性排序，越靠前权重越高）：
    ${userCompetenciesToDevelop.length > 0 ? userCompetenciesToDevelop.map((skill, index) => `${index + 1}. ${skill} (权重: ${userCompetenciesToDevelop.length - index})`).join('\n') : '未设置能力'}

请基于以上信息进行积分评估。`;
  }

  /**
   * 获取自定义系统提示词
   */
  private getCustomSystemPrompt(customPrompt: string): string {
    return customPrompt
      .replace('{rewardMultiplier}', '') // 移除静态奖励系数
      .replace('{baselinePoints}', '100') // 保持向后兼容
      .replace('{minPoints}', '50') // 保持向后兼容
      .replace('{maxPoints}', '300'); // 保持向后兼容
  }

  /**
   * 创建自定义积分计算的提示词（仅包含任务数据）
   */
  private createCustomPrompt(request: PointsCalculationRequest): string {
    const { taskTitle, taskRecord = '', dailyPay = 1000, userGoals = [], userCompetenciesToDevelop = [] } = request;
    
    return `任务标题：${taskTitle}

任务记录：${taskRecord || '无任务记录'}

日薪参数：${dailyPay}元/天

用户目标：${userGoals.join(', ')}

  用户要去习得的能力：${userCompetenciesToDevelop.join(', ')}

请基于以上信息进行积分评估。`;
  }
  
    
  
    /**
     * 估算 token 成本
     */
    private estimateTokenCost(text: string, provider: string): number {
      const tokenCount = Math.ceil(text.length / 4); // 粗略估算
      
      switch (provider) {
        case 'deepseek':
          return tokenCount * 0.00000028; // $0.28/1M tokens
        default:
          return 0;
      }
    }
  
    /**
     * 计算每日任务完成奖励
     */
    calculateDailyBonusPoints(completedCount: number, totalCount: number): number {
      const completionRate = completedCount / totalCount;
      
      if (completionRate >= 1.0) {
        return 200; // 全部完成奖励
      } else if (completionRate >= 0.8) {
        return 100; // 80%以上完成奖励
      } else if (completionRate >= 0.5) {
        return 50; // 50%以上完成奖励
      }
      
      return 0;
    }
  }