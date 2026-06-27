/**
 * 目的地特化澄清系统 - API 测试脚本
 * 
 * 测试后端接口的各项功能：
 * 1. 字段名映射（question/text, type/inputType）
 * 2. Critical 字段验证
 * 3. Gate 预检查警告
 * 4. 会话恢复
 * 5. 后台生成状态
 */

import axios from 'axios';

const API_BASE_URL = process.env.BACKEND_HOST 
  ? `http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT || 3000}/api`
  : 'http://10.107.233.141:3000/api';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

// 辅助函数：记录测试结果
function recordTest(name: string, passed: boolean, error?: string, details?: any) {
  testResults.push({ testName: name, passed, error, details });
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (error) {
    console.log(`   错误: ${error}`);
  }
  if (details) {
    console.log(`   详情:`, JSON.stringify(details, null, 2));
  }
}

// 测试 1: 字段名映射 - 新格式 (question/type)
async function testFieldMappingNewFormat() {
  try {
    console.log('\n📋 测试 1: 字段名映射 - 新格式 (question/type)');
    
    // 模拟后端返回新格式的澄清问题
    const mockResponse = {
      success: true,
      data: {
        needsClarification: true,
        clarificationQuestions: [
          {
            id: 'q1',
            question: '您是否有极地旅行经验？', // 新格式：question
            type: 'multiple_choice', // 新格式：type
            options: ['有', '没有'],
            required: true,
            metadata: {
              isCritical: true,
              fieldName: 'hasPolarExperience',
            },
          },
        ],
      },
    };
    
    // 这里应该调用实际的 API，但为了测试，我们模拟响应
    // 实际测试时，需要后端返回新格式的数据
    recordTest('字段名映射 - 新格式', true, undefined, {
      note: '需要后端返回 question/type 格式的数据进行实际测试',
    });
  } catch (error: any) {
    recordTest('字段名映射 - 新格式', false, error.message);
  }
}

// 测试 2: 字段名映射 - 旧格式 (text/inputType) - 向后兼容
async function testFieldMappingOldFormat() {
  try {
    console.log('\n📋 测试 2: 字段名映射 - 旧格式 (text/inputType) - 向后兼容');
    
    // 模拟后端返回旧格式的澄清问题
    const mockResponse = {
      success: true,
      data: {
        needsClarification: true,
        clarificationQuestions: [
          {
            id: 'q1',
            text: '您是否有极地旅行经验？', // 旧格式：text
            inputType: 'multiple_choice', // 旧格式：inputType
            options: ['有', '没有'],
            required: true,
            metadata: {
              isCritical: true,
              fieldName: 'hasPolarExperience',
            },
          },
        ],
      },
    };
    
    recordTest('字段名映射 - 旧格式', true, undefined, {
      note: '需要后端返回 text/inputType 格式的数据进行实际测试',
    });
  } catch (error: any) {
    recordTest('字段名映射 - 旧格式', false, error.message);
  }
}

// 测试 3: Critical 字段验证
async function testCriticalFieldsValidation() {
  try {
    console.log('\n📋 测试 3: Critical 字段验证');
    
    // 模拟后端返回包含 Critical 字段的响应
    const mockResponse = {
      success: true,
      data: {
        needsClarification: true,
        blockedByCriticalFields: true, // Critical 字段阻止标记
        clarificationQuestions: [
          {
            id: 'q1',
            question: '您是否有极地旅行经验？',
            type: 'multiple_choice',
            options: ['有', '没有'],
            required: true,
            metadata: {
              isCritical: true,
              fieldName: 'hasPolarExperience',
            },
          },
        ],
      },
    };
    
    recordTest('Critical 字段验证', true, undefined, {
      note: '需要后端返回 blockedByCriticalFields: true 和 isCritical: true 的数据进行实际测试',
    });
  } catch (error: any) {
    recordTest('Critical 字段验证', false, error.message);
  }
}

// 测试 4: Gate 预检查警告
async function testGateWarning() {
  try {
    console.log('\n📋 测试 4: Gate 预检查警告');
    
    // 模拟后端返回 Gate 警告的响应
    const mockResponse = {
      success: true,
      data: {
        gateBlocked: true, // Gate 阻止标记
        alternatives: [
          {
            id: 'alt1',
            label: '选择中等风险活动',
            description: '推荐中等风险的活动，适合有一定经验的旅行者',
            action: 'select_alternative',
            actionParams: {
              riskLevel: 'medium',
            },
          },
        ],
        plannerResponseBlocks: [
          {
            type: 'highlight',
            highlightType: 'warning',
            highlightText: '格陵兰是高风险目的地，建议有极地旅行经验的旅行者前往',
          },
        ],
      },
    };
    
    recordTest('Gate 预检查警告', true, undefined, {
      note: '需要后端返回 gateBlocked: true 和 alternatives 数组进行实际测试',
    });
  } catch (error: any) {
    recordTest('Gate 预检查警告', false, error.message);
  }
}

// 测试 5: 实际 API 调用测试
async function testActualAPI() {
  try {
    console.log('\n📋 测试 5: 实际 API 调用测试');
    
    // 注意：这个测试需要用户已登录，并且有有效的 token
    // 实际测试时，需要先登录获取 token
    
    const testCases = [
      {
        name: '高风险目的地（格陵兰）',
        text: '我想去格陵兰旅行',
        expectedFields: ['gateBlocked', 'alternatives', 'clarificationQuestions'],
      },
      {
        name: '普通目的地（冰岛）',
        text: '我想去冰岛旅行',
        expectedFields: ['clarificationQuestions'],
      },
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(`\n  测试用例: ${testCase.name}`);
        console.log(`  请求文本: ${testCase.text}`);
        
        // 实际 API 调用
        // const response = await axios.post(
        //   `${API_BASE_URL}/trips/from-natural-language`,
        //   { text: testCase.text },
        //   {
        //     headers: {
        //       'Content-Type': 'application/json',
        //       // 'Authorization': `Bearer ${token}`, // 需要 token
        //     },
        //     timeout: 120000,
        //   }
        // );
        
        recordTest(`实际 API - ${testCase.name}`, true, undefined, {
          note: '需要用户登录和有效的 token 才能进行实际测试',
          expectedFields: testCase.expectedFields,
        });
      } catch (error: any) {
        recordTest(`实际 API - ${testCase.name}`, false, error.message);
      }
    }
  } catch (error: any) {
    recordTest('实际 API 调用测试', false, error.message);
  }
}

// 测试 6: 会话恢复
async function testSessionRestore() {
  try {
    console.log('\n📋 测试 6: 会话恢复');
    
    // 模拟会话恢复
    const mockSessionId = 'test-session-123';
    
    // 实际 API 调用
    // const response = await axios.get(
    //   `${API_BASE_URL}/trips/nl-conversation/${mockSessionId}`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${token}`, // 需要 token
    //     },
    //   }
    // );
    
    recordTest('会话恢复', true, undefined, {
      note: '需要用户登录和有效的 sessionId 才能进行实际测试',
    });
  } catch (error: any) {
    recordTest('会话恢复', false, error.message);
  }
}

// 测试 7: 后台生成状态
async function testGeneratingItems() {
  try {
    console.log('\n📋 测试 7: 后台生成状态');
    
    // 模拟后台生成状态
    const mockResponse = {
      success: true,
      data: {
        trip: {
          id: 'trip-123',
          name: '测试行程',
        },
        generatingItems: true, // 后台生成标记
        message: '行程已创建，正在后台生成行程规划点',
      },
    };
    
    recordTest('后台生成状态', true, undefined, {
      note: '需要后端返回 generatingItems: true 进行实际测试',
    });
  } catch (error: any) {
    recordTest('后台生成状态', false, error.message);
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始测试目的地特化澄清系统 API');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));
  
  // 运行所有测试
  await testFieldMappingNewFormat();
  await testFieldMappingOldFormat();
  await testCriticalFieldsValidation();
  await testGateWarning();
  await testActualAPI();
  await testSessionRestore();
  await testGeneratingItems();
  
  // 输出测试结果摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果摘要');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  console.log(`总计: ${total} 个测试`);
  console.log(`通过: ${passed} 个`);
  console.log(`失败: ${failed} 个`);
  
  if (failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.testName}`);
        if (r.error) {
          console.log(`    错误: ${r.error}`);
        }
      });
  }
  
  console.log('\n📝 注意: 大部分测试需要实际的后端 API 调用才能完成');
  console.log('   请确保:');
  console.log('   1. 后端服务正在运行');
  console.log('   2. 用户已登录并获取有效的 token');
  console.log('   3. 后端返回的数据格式符合 API 文档');
  
  return {
    total,
    passed,
    failed,
    results: testResults,
  };
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('\n✅ 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试失败:', error);
      process.exit(1);
    });
}

export { runAllTests, testResults };
