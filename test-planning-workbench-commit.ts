/**
 * 规划工作台 Commit 接口测试脚本
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行（端口 3000）
 * 2. 确保已登录并获取 accessToken
 * 3. 运行: ts-node test-planning-workbench-commit.ts
 * 或者: node --loader ts-node/esm test-planning-workbench-commit.ts
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || ''; // 从环境变量或 sessionStorage 获取

// 测试数据
const TEST_PLAN_ID = process.env.TEST_PLAN_ID || 'plan-test-123';
const TEST_TRIP_ID = process.env.TEST_TRIP_ID || 'trip-test-123';

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`测试: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

// 测试 Commit Plan 接口
async function testCommitPlan() {
  logTest('POST /planning-workbench/plans/:planId/commit');

  if (!ACCESS_TOKEN) {
    log('⚠️  警告: 未设置 ACCESS_TOKEN，请先登录获取 token', 'yellow');
    log('   设置方式: export ACCESS_TOKEN="your-token-here"', 'yellow');
    log('   或从浏览器 sessionStorage 中获取 accessToken', 'yellow');
    return;
  }

  try {
    const requestData = {
      tripId: TEST_TRIP_ID,
      options: {
        partialCommit: false,
        // commitDays: [1, 2, 3], // 如果 partialCommit=true
      },
    };

    log(`\n请求 URL: ${API_BASE_URL}/planning-workbench/plans/${TEST_PLAN_ID}/commit`, 'blue');
    log(`请求方法: POST`, 'blue');
    log(`请求体:`, 'blue');
    console.log(JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${API_BASE_URL}/planning-workbench/plans/${TEST_PLAN_ID}/commit`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    log('\n✅ 请求成功！', 'green');
    log(`状态码: ${response.status}`, 'green');
    log('\n响应数据:', 'green');
    console.log(JSON.stringify(response.data, null, 2));

    // 验证响应结构
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      log('\n✅ 响应结构验证通过:', 'green');
      log(`  - tripId: ${data.tripId}`, 'green');
      log(`  - planId: ${data.planId}`, 'green');
      log(`  - committedAt: ${data.committedAt}`, 'green');
      if (data.changes) {
        log(`  - changes:`, 'green');
        log(`    - added: ${data.changes.added}`, 'green');
        log(`    - modified: ${data.changes.modified}`, 'green');
        log(`    - removed: ${data.changes.removed}`, 'green');
      }
    } else {
      log('\n⚠️  响应结构不符合预期', 'yellow');
    }

    return response.data;
  } catch (error: any) {
    log('\n❌ 请求失败！', 'red');
    
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log('无法连接到后端服务', 'red');
      log('请确认:', 'red');
      log('  1. 后端服务是否运行在 http://localhost:3000', 'red');
      log('  2. 网络连接是否正常', 'red');
    } else {
      log(`错误: ${error.message}`, 'red');
    }
    
    throw error;
  }
}

// 测试错误情况
async function testCommitPlanErrors() {
  logTest('测试错误情况');

  const testCases = [
    {
      name: '无效的 planId',
      planId: 'invalid-plan-id',
      tripId: TEST_TRIP_ID,
    },
    {
      name: '缺少 tripId',
      planId: TEST_PLAN_ID,
      tripId: '',
    },
    {
      name: '无效的 tripId',
      planId: TEST_PLAN_ID,
      tripId: 'invalid-trip-id',
    },
  ];

  for (const testCase of testCases) {
    log(`\n测试: ${testCase.name}`, 'yellow');
    try {
      await axios.post(
        `${API_BASE_URL}/planning-workbench/plans/${testCase.planId}/commit`,
        { tripId: testCase.tripId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
          },
          timeout: 10000,
        }
      );
      log(`  ⚠️  未返回错误（可能后端未实现验证）`, 'yellow');
    } catch (error: any) {
      if (error.response) {
        log(`  ✅ 返回错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`, 'green');
      } else {
        log(`  ⚠️  网络错误: ${error.message}`, 'yellow');
      }
    }
  }
}

// 主函数
async function main() {
  log('\n🚀 规划工作台 Commit 接口测试', 'cyan');
  log(`API Base URL: ${API_BASE_URL}`, 'blue');
  log(`Test Plan ID: ${TEST_PLAN_ID}`, 'blue');
  log(`Test Trip ID: ${TEST_TRIP_ID}`, 'blue');
  log(`Access Token: ${ACCESS_TOKEN ? '已设置' : '未设置'}`, ACCESS_TOKEN ? 'green' : 'yellow');

  try {
    // 测试正常情况
    await testCommitPlan();

    // 测试错误情况（可选）
    // await testCommitPlanErrors();

    log('\n✅ 所有测试完成！', 'green');
  } catch (error) {
    log('\n❌ 测试失败', 'red');
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

export { testCommitPlan, testCommitPlanErrors };
