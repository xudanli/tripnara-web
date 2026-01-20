/**
 * 决策评估接口完整测试脚本
 * 
 * 测试流程：
 * 1. 创建新行程
 * 2. 测试 generate 操作（生成方案）
 * 3. 测试 compare 操作（对比方案）
 * 4. 测试 commit 操作（提交方案）
 * 5. 测试 adjust 操作（调整方案）
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行（端口 3000）
 * 2. 确保已登录并获取 accessToken
 * 3. 运行: ts-node test-decision-evaluation.ts
 * 或者: node --loader ts-node/esm test-decision-evaluation.ts
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ''; // 从环境变量或 sessionStorage 获取

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  log(`\n${'='.repeat(70)}`, 'cyan');
  log(`测试: ${name}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

function logSection(name: string) {
  log(`\n${'-'.repeat(70)}`, 'blue');
  log(`${name}`, 'blue');
  log('-'.repeat(70), 'blue');
}

// 存储测试过程中创建的 ID
let createdTripId: string | null = null;
let createdPlanId: string | null = null;
let createdPlanIds: string[] = [];

// ==================== 1. 创建新行程 ====================

async function createTrip(): Promise<string> {
  logTest('1. 创建新行程');

  if (!ACCESS_TOKEN) {
    log('⚠️  警告: 未设置 ACCESS_TOKEN，请先登录获取 token', 'yellow');
    log('   设置方式: export ACCESS_TOKEN="your-token-here"', 'yellow');
    log('   或从浏览器 sessionStorage 中获取 accessToken', 'yellow');
    throw new Error('ACCESS_TOKEN 未设置');
  }

  try {
    const tripData = {
      destination: 'JP', // 日本
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30天后
      endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 37天后（7天行程）
      totalBudget: 50000, // 50000 CNY
      travelers: [
        {
          age: 30,
          role: 'primary',
        },
      ],
      pace: 'moderate' as const,
      preferences: ['culture', 'food'] as const,
    };

    logSection('请求信息');
    log(`URL: ${API_BASE_URL}/trips`, 'blue');
    log(`方法: POST`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(tripData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/trips`,
      tripData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    logSection('响应结果');
    log('✅ 行程创建成功！', 'green');
    log(`状态码: ${response.status}`, 'green');
    
    const tripId = response.data.data?.id || response.data.id;
    if (tripId) {
      createdTripId = tripId;
      log(`行程 ID: ${tripId}`, 'green');
      log('\n响应数据:', 'green');
      console.log(JSON.stringify(response.data, null, 2));
      return tripId;
    } else {
      log('⚠️  响应中未找到行程 ID', 'yellow');
      console.log(JSON.stringify(response.data, null, 2));
      throw new Error('未找到行程 ID');
    }
  } catch (error: any) {
    log('\n❌ 创建行程失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log('无法连接到后端服务', 'red');
      log('请确认后端服务是否运行在 http://localhost:3000', 'red');
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// ==================== 2. 测试 Generate 操作 ====================

async function testGenerate(tripId: string): Promise<string> {
  logTest('2. 测试 Generate 操作（生成方案）');

  try {
    const requestData = {
      context: {
        destination: {
          country: 'JP',
        },
        days: 7,
        travelMode: 'public_transit' as const,
        constraints: {
          budget: {
            total: 50000,
            currency: 'CNY',
          },
        },
      },
      tripId: tripId,
      userAction: 'generate' as const,
    };

    logSection('请求信息');
    log(`URL: ${API_BASE_URL}/planning-workbench/execute`, 'blue');
    log(`方法: POST`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/planning-workbench/execute`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 60000, // 60秒超时（生成方案可能需要较长时间）
      }
    );

    logSection('响应结果');
    log('✅ Generate 操作成功！', 'green');
    log(`状态码: ${response.status}`, 'green');
    
    const planId = response.data.data?.planState?.plan_id;
    if (planId) {
      createdPlanId = planId;
      createdPlanIds.push(planId);
      log(`方案 ID: ${planId}`, 'green');
    }

    // 显示关键信息
    const data = response.data.data || response.data;
    if (data.planState) {
      log(`\n方案状态:`, 'green');
      log(`  - Plan ID: ${data.planState.plan_id}`, 'green');
      log(`  - Plan Version: ${data.planState.plan_version}`, 'green');
      log(`  - Status: ${data.planState.status}`, 'green');
    }

    if (data.uiOutput?.consolidatedDecision) {
      log(`\n综合决策:`, 'green');
      log(`  - Status: ${data.uiOutput.consolidatedDecision.status}`, 'green');
      log(`  - Summary: ${data.uiOutput.consolidatedDecision.summary}`, 'green');
    }

    if (data.uiOutput?.personas) {
      log(`\n三人格评估:`, 'green');
      if (data.uiOutput.personas.abu) {
        log(`  - Abu: ${data.uiOutput.personas.abu.verdict}`, 'green');
      }
      if (data.uiOutput.personas.drdre) {
        log(`  - Dr.Dre: ${data.uiOutput.personas.drdre.verdict}`, 'green');
      }
      if (data.uiOutput.personas.neptune) {
        log(`  - Neptune: ${data.uiOutput.personas.neptune.verdict}`, 'green');
      }
    }

    log('\n完整响应数据:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    return planId || '';
  } catch (error: any) {
    log('\n❌ Generate 操作失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log('无法连接到后端服务', 'red');
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// ==================== 3. 测试 Compare 操作 ====================

async function testCompare(tripId: string, planId1: string, planId2?: string) {
  logTest('3. 测试 Compare 操作（对比方案）');

  try {
    // 如果没有第二个方案，先再生成一个
    if (!planId2) {
      log('生成第二个方案用于对比...', 'yellow');
      planId2 = await testGenerate(tripId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    }

    const requestData = {
      context: {
        destination: {
          country: 'JP',
        },
        days: 7,
        travelMode: 'public_transit' as const,
      },
      tripId: tripId,
      userAction: 'compare' as const,
      existingPlanState: {
        plan_id: planId1,
      },
    };

    logSection('请求信息');
    log(`URL: ${API_BASE_URL}/planning-workbench/execute`, 'blue');
    log(`方法: POST`, 'blue');
    log(`对比方案: ${planId1} vs ${planId2}`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/planning-workbench/execute`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 60000,
      }
    );

    logSection('响应结果');
    log('✅ Compare 操作成功！', 'green');
    log(`状态码: ${response.status}`, 'green');

    const data = response.data.data || response.data;
    if (data.comparison) {
      log(`\n对比结果:`, 'green');
      console.log(JSON.stringify(data.comparison, null, 2));
    }

    log('\n完整响应数据:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    log('\n❌ Compare 操作失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// ==================== 4. 测试 Commit 操作 ====================

async function testCommit(planId: string, tripId: string) {
  logTest('4. 测试 Commit 操作（提交方案）');

  try {
    const requestData = {
      tripId: tripId,
      options: {
        partialCommit: false,
      },
    };

    logSection('请求信息');
    log(`URL: ${API_BASE_URL}/planning-workbench/plans/${planId}/commit`, 'blue');
    log(`方法: POST`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/planning-workbench/plans/${planId}/commit`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    logSection('响应结果');
    log('✅ Commit 操作成功！', 'green');
    log(`状态码: ${response.status}`, 'green');

    const data = response.data.data || response.data;
    if (data) {
      log(`\n提交结果:`, 'green');
      log(`  - Trip ID: ${data.tripId}`, 'green');
      log(`  - Plan ID: ${data.planId}`, 'green');
      log(`  - Committed At: ${data.committedAt}`, 'green');
      if (data.changes) {
        log(`  - Changes:`, 'green');
        log(`    - Added: ${data.changes.added}`, 'green');
        log(`    - Modified: ${data.changes.modified}`, 'green');
        log(`    - Removed: ${data.changes.removed}`, 'green');
      }
    }

    log('\n完整响应数据:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    log('\n❌ Commit 操作失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// ==================== 5. 测试 Adjust 操作 ====================

async function testAdjust(tripId: string, planId: string) {
  logTest('5. 测试 Adjust 操作（调整方案）');

  try {
    const requestData = {
      context: {
        destination: {
          country: 'JP',
        },
        days: 7,
        travelMode: 'public_transit' as const,
        constraints: {
          budget: {
            total: 60000, // 调整预算
            currency: 'CNY',
          },
        },
      },
      tripId: tripId,
      userAction: 'adjust' as const,
      existingPlanState: {
        plan_id: planId,
      },
    };

    logSection('请求信息');
    log(`URL: ${API_BASE_URL}/planning-workbench/execute`, 'blue');
    log(`方法: POST`, 'blue');
    log(`基于方案: ${planId}`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/planning-workbench/execute`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 60000,
      }
    );

    logSection('响应结果');
    log('✅ Adjust 操作成功！', 'green');
    log(`状态码: ${response.status}`, 'green');

    const data = response.data.data || response.data;
    if (data.planState) {
      log(`\n调整后的方案:`, 'green');
      log(`  - Plan ID: ${data.planState.plan_id}`, 'green');
      log(`  - Plan Version: ${data.planState.plan_version}`, 'green');
      log(`  - Status: ${data.planState.status}`, 'green');
    }

    if (data.uiOutput?.consolidatedDecision) {
      log(`\n综合决策:`, 'green');
      log(`  - Status: ${data.uiOutput.consolidatedDecision.status}`, 'green');
      log(`  - Summary: ${data.uiOutput.consolidatedDecision.summary}`, 'green');
    }

    log('\n完整响应数据:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    return data.planState?.plan_id || '';
  } catch (error: any) {
    log('\n❌ Adjust 操作失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// ==================== 主函数 ====================

async function main() {
  log('\n🚀 决策评估接口完整测试', 'magenta');
  log(`API Base URL: ${API_BASE_URL}`, 'blue');
  log(`Access Token: ${ACCESS_TOKEN ? '已设置' : '未设置'}`, ACCESS_TOKEN ? 'green' : 'yellow');

  if (!ACCESS_TOKEN) {
    log('\n⚠️  请先设置 ACCESS_TOKEN', 'yellow');
    log('   设置方式: export ACCESS_TOKEN="your-token-here"', 'yellow');
    log('   或从浏览器 sessionStorage 中获取 accessToken', 'yellow');
    process.exit(1);
  }

  try {
    // 1. 创建新行程
    const tripId = await createTrip();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

    // 2. 测试 Generate 操作
    const planId1 = await testGenerate(tripId);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒

    // 3. 测试 Compare 操作（可选，需要第二个方案）
    try {
      await testCompare(tripId, planId1);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log('\n⚠️  Compare 操作跳过（可能需要多个方案）', 'yellow');
    }

    // 4. 测试 Commit 操作
    try {
      await testCommit(planId1, tripId);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log('\n⚠️  Commit 操作跳过（可能需要先提交方案）', 'yellow');
    }

    // 5. 测试 Adjust 操作
    try {
      await testAdjust(tripId, planId1);
    } catch (error) {
      log('\n⚠️  Adjust 操作跳过', 'yellow');
    }

    log('\n✅ 所有测试完成！', 'green');
    log(`\n创建的测试数据:`, 'cyan');
    log(`  - Trip ID: ${tripId}`, 'cyan');
    log(`  - Plan IDs: ${createdPlanIds.join(', ')}`, 'cyan');
    log(`\n可以在前端访问: /dashboard/plan-studio?tripId=${tripId}`, 'cyan');
  } catch (error: any) {
    log('\n❌ 测试失败', 'red');
    log(`错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('未处理的错误:', error);
    process.exit(1);
  });
}

export { createTrip, testGenerate, testCompare, testCommit, testAdjust };
