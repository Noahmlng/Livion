import React, { useState } from 'react';
import { PointsService, PointsCalculationRequest, PointsCalculationResponse } from '../services/PointsService';

interface TestCase {
  id: string;
  taskTitle: string;
  taskRecord: string;
}

const DEFAULT_TEST_CASES: TestCase[] = [
  {
    id: '1',
    taskTitle: '和 Dian 聊天，真的很开心！！！',
    taskRecord: ''
  },
  {
    id: '2',
    taskTitle: '找 Adventure X 的 Team，必须是个 Super cool Project，最好是硬件',
    taskRecord: ''
  },
  {
    id: '3',
    taskTitle: '到底我们还要找什么样的 Usecase 去进一步验证 PMF，有哪些画像和 Usecase 是我们希望接触到的，要给到楚航这个目标来引进',
    taskRecord: ''
  },
  {
    id: '4',
    taskTitle: '拆解一份现有项目的整体架构和 Tools 列表',
    taskRecord: ''
  },
  {
    id: '5',
    taskTitle: '更新一版新的 System Prompt ，有效的前提下，尽可能少的 tokens',
    taskRecord: ''
  },
  {
    id: '6',
    taskTitle: 'OpenAI Product Leader: The 4D Method to Build AI Products That Users Actually Want',
    taskRecord: ''
  },
  {
    id: '7',
    taskTitle: '确认下一个版本的 Prototype 要设计的内容 和 下一个产品版本解决的问题，以及最重要的，这个版本要重点收集的反馈',
    taskRecord: ''
  },
  {
    id: '8',
    taskTitle: '《20个月赚130亿》Youtube创始人陈士骏自传',
    taskRecord: `打开这本书的目录，就感觉受到了同类 Builder感召
"我想跟大家说，这里总有一群怪人，他们即使已经赚了上亿的钱，家里的房间多得数不过来，但他们还是回到硅谷，在小城租下一间狭窄的办公室，然后绞尽脑汁地工作，每周工作接近100个小时，或者是，即使身患病痛，也要坚持到底，珍惜人生时光"

🌟 有什么需求 / usecase，是我急切地想找人，两种人：
1. 神奇的外包，我跟这人快速说一下要什么，他来帮我搞定，最好是合作密切的，能一下懂我的需求，做出来我满意的东西；
2. 可靠聪明、不抢功的下属，教他一次，就可以把我自己不想干的活给干了，甚至自己就能主动把活给做美了，当然，功劳还是我的；
-> 如果是从这个角度出发，那公司买是一种思路，用户自己上来自己用完全是另外一个出发点啊，我做事效率很高，肯定是希望别人夸我的成果啊，而不是说 "切，你就是用的 cursor 罢了，cursor 好牛逼"……

技能包？专家提供对话、回答问题、和出 SOP

命名：看下那个大师的技巧
- 两个音节
- 两个短词语最好有意义

如果现在让我来做齐思，我一定会重新思考到底是什么让一个 for 创业者的内容，在一个平台上聚集被发出，它得先有创业者圈子里的内容，再有讨论。所以这几层内容是怎么来的：
1. 创业路上的沟沟坎坎，工具经验帖 —— 开公司、融资、员工、管理、产品、收入、增长、客户……；
2. 第一时间发现好东西；
3. 关于最新科技动态的讨论；
4. 内幕八卦的讨论；
5. 学习和成长的高质量材料；
我会去研究这些内容都是谁发起的？他什么时候会发起？他发起的时候会考虑什么？之前在哪发过？为什么在那发？有持续发吗？发了之后什么会刺激他持续发？更具体，会刺激他持续在那发/跟那个人/跟那群人说？`
  },
  {
    id: '9',
    taskTitle: '针对 对话助手做KOL search 这个case，起底了解应该给数据、怎么给know-how、泛化性',
    taskRecord: `https://chatgpt.com/c/6870fa0d-37f4-800c-8e25-3042fcbeed1e

包括未来怎么获取呢？

找哲宁推荐一些东西看，怎么对这块有感觉
先问下 GPT，让哲宁和博哥帮我过一遍 list 也行

别忘了实操带来的手感

甚至我可以做个小 Benchmark 来对比这个对话助手的效果？

明天去公司继续干，我喜欢沉浸在问题里，周末我没有必要很强烈的感知，it's a normal day, but I got more blocks of time.`
  }
];

const DEFAULT_SYSTEM_PROMPT = `作为一个个人任务管理系统的积分评估专家，请基于用户提供的任务信息进行积分评估。

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

export default function PointsTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>(DEFAULT_TEST_CASES);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(testCases[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customRecord, setCustomRecord] = useState('');
  const [dailyRate, setDailyRate] = useState(1000);
  const [userGoals, setUserGoals] = useState<string[]>(['做出代表作', '有好身材和好脸蛋', '有好体力和好精力']);
  const [userCompetenciesToDevelop, setUserCompetenciesToDevelop] = useState<string[]>(['客户需求验证', '创造力', '产品能力']);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PointsCalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const pointsService = new PointsService();

  const handleTestCase = async (testCase: TestCase | null) => {
    if (!testCase && !customTitle) {
      setError('请选择测试用例或输入自定义任务');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: PointsCalculationRequest = {
        taskTitle: testCase ? testCase.taskTitle : customTitle,
        taskRecord: testCase ? testCase.taskRecord : customRecord,
                  dailyPay: dailyRate,
        userGoals: userGoals,
        userCompetenciesToDevelop: userCompetenciesToDevelop,
        customPrompt: systemPrompt !== DEFAULT_SYSTEM_PROMPT ? systemPrompt : undefined
      };

      const response = await pointsService.calculatePoints(request);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算失败');
    } finally {
      setLoading(false);
    }
  };

  const addCustomTestCase = () => {
    if (!customTitle) return;
    
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      taskTitle: customTitle,
      taskRecord: customRecord
    };
    
    setTestCases([...testCases, newTestCase]);
    setSelectedTestCase(newTestCase);
    setCustomTitle('');
    setCustomRecord('');
  };

  const removeTestCase = (id: string) => {
    const updatedCases = testCases.filter(tc => tc.id !== id);
    setTestCases(updatedCases);
    if (selectedTestCase?.id === id) {
      setSelectedTestCase(updatedCases[0] || null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">智能积分系统测试页面</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">⚡ 严格评估系统</h2>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• <strong>严格匹配标准</strong>：奖励系数范围缩小至 0.3-2.0，只有真正匹配的任务才能获得高分</li>
            <li>• <strong>精确时间估算</strong>：AI 根据任务类型参考标准进行精确评估，最高1天</li>
            <li>• <strong>困难积分获取</strong>：基础金额 ÷ 12 ÷ 4 ÷ 2 × 奖励系数，学习奖励上限 50 分</li>
            <li>• <strong>价值导向激励</strong>：只有真正有价值的任务才能获得可观积分，最低5分保障</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：测试用例和输入 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">预设测试用例</h2>
              <div className="space-y-2">
                {testCases.map((testCase) => (
                  <div key={testCase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id={`test-${testCase.id}`}
                        name="testCase"
                        checked={selectedTestCase?.id === testCase.id}
                        onChange={() => setSelectedTestCase(testCase)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`test-${testCase.id}`} className="cursor-pointer">
                        <span className="font-medium">{testCase.taskTitle}</span>
                      </label>
                    </div>
                    <button
                      onClick={() => removeTestCase(testCase.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">自定义测试用例</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务标题
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="输入任务标题"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务记录（思考和笔记）
                  </label>
                  <textarea
                    value={customRecord}
                    onChange={(e) => setCustomRecord(e.target.value)}
                    placeholder="输入任务记录（可选，记录思考和笔记，用于学习奖励评估）"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={addCustomTestCase}
                  disabled={!customTitle}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加为测试用例
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">积分计算参数</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日薪参数（元/天）
                </label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  placeholder="2000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户目标（每行一个，按重要性排序）
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  💡 越靠前的目标权重越高，AI 会优先考虑首要目标的匹配度
                </p>
                <textarea
                  value={userGoals.join('\n')}
                  onChange={(e) => setUserGoals(e.target.value.split('\n').filter(goal => goal.trim()))}
                  placeholder="做出代表作&#10;有好身材和好脸蛋&#10;有好体力和好精力"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重视的能力（每行一个，按重要性排序）
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  💡 越靠前的能力权重越高，AI 会优先考虑首要能力的匹配度
                </p>
                <textarea
                            value={userCompetenciesToDevelop.join('\n')}
          onChange={(e) => setUserCompetenciesToDevelop(e.target.value.split('\n').filter(skill => skill.trim()))}
                  placeholder="客户开发/与客户共创的方式迭代产品&#10;创造&#10;产品能力"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">System Prompt 设置</h2>
              <p className="text-sm text-gray-600 mb-2">
                💡 这里的内容将作为 AI 的系统提示词，包含评估规则和输出格式。具体的任务数据会在用户消息中提供。
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="输入系统提示词（评估规则和输出格式）"
              />
            </div>
          </div>

          {/* 右侧：测试结果 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">当前测试用例</h2>
              {selectedTestCase ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800">{selectedTestCase.taskTitle}</h3>
                  <p className="text-gray-600 mt-2">{selectedTestCase.taskRecord || '无思考和笔记'}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500">请选择一个测试用例或输入自定义任务</p>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => handleTestCase(selectedTestCase)}
                disabled={loading || (!selectedTestCase && !customTitle)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
              >
                {loading ? '计算中...' : '开始测试'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">错误</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-4">积分计算结果</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">获得积分</p>
                      <p className="text-2xl font-bold text-green-600">{result.points}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">基础金额</p>
                      <p className="text-lg font-semibold text-blue-600">¥{result.baseAmount}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">奖励金额</p>
                      <p className="text-lg font-semibold text-purple-600">¥{result.rewardAmount}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm text-gray-600">学习奖励</p>
                      <p className="text-lg font-semibold text-orange-600">+{result.qualityBonus}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">AI计算的奖励系数</p>
                    <p className="text-xl font-bold text-indigo-600">{result.rewardMultiplier || 1}x</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.rewardMultiplier >= 1.8 ? '🎯 与首要目标/能力完美匹配' :
                       result.rewardMultiplier >= 1.3 ? '🎯 与首要目标/能力高度匹配' :
                       result.rewardMultiplier >= 0.8 ? '🎯 与重要目标/能力中度匹配' :
                       result.rewardMultiplier >= 0.5 ? '🎯 与次要目标/能力轻微匹配' :
                       '🎯 与目标/能力基本无关'}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">评估理由</p>
                    <p className="text-gray-800">{result.reasoning}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">API 成本</p>
                    <p className="text-lg font-semibold text-gray-600">${result.cost.toFixed(6)}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">完整JSON响应</p>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}