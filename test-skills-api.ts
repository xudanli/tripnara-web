/**
 * Skills 架构 API 接口兼容性测试脚本
 * 
 * 使用方法：
 * 1. 确保后端服务正在运行（端口 3000）
 * 2. 运行: ts-node test-skills-api.ts
 * 或者: node --loader ts-node/esm test-skills-api.ts
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_TRIP_ID = 'test-123';

// 测试数据
const mockRoutePlan = {
  tripId: TEST_TRIP_ID,
  routeDirectionId: 'route-1',
  segments: [
    {
      segmentId: 'seg-1',
      dayIndex: 0,
      distanceKm: 10,
      ascentM: 500,
      slopePct: 5,
      metadata: {
        fromPlaceId: 'place-1',
        toPlaceId: 'place-2',
      },
    },
  ],
};

const mockWorldContext = {
  physical: {
    demEvidence: [],
    roadStates: [],
    hazardZones: [],
    ferryStates: [],
    countryCode: 'IS',
    month: 7,
  },
  human: {
    maxDailyAscentM: 1000,
    rollingAscent3DaysM: 2000,
    maxSlopePct: 20,
    weatherRiskWeight: 0.5,
    bufferDayBias: 'MEDIUM' as const,
    riskTolerance: 'MEDIUM' as const,
  },
  routeDirection: {
    id: 'route-1',
    nameCN: '测试路线',
    nameEN: 'Test Route',
    countryCode: 'IS',
  },
};

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

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

// 验证响应格式的工具函数
function validateSafetyResponse(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push('响应数据为空');
    return { valid: false, errors };
  }

  // 检查必需字段
  if (typeof data.allowed !== 'boolean') {
    errors.push('缺少或无效的 allowed 字段（应为布尔值）');
  }

  if (!Array.isArray(data.violations)) {
    errors.push('缺少或无效的 violations 字段（应为数组）');
  } else {
    // 验证 violations 数组中的项
    data.violations.forEach((v: any, idx: number) => {
      if (!v.explanation && typeof v.explanation !== 'string') {
        errors.push(`violations[${idx}].explanation 字段无效`);
      }
    });
  }

  // 检查 decisionLog 字段（Skills 架构新增）
  if (data.decisionLog !== undefined) {
    if (!Array.isArray(data.decisionLog)) {
      errors.push('decisionLog 字段存在但类型不正确（应为数组）');
    } else {
      // 验证 decisionLog 数组中的项
      data.decisionLog.forEach((log: any, idx: number) => {
        if (!['ABU', 'DR_DRE', 'NEPTUNE'].includes(log.persona)) {
          errors.push(`decisionLog[${idx}].persona 字段无效（应为 ABU/DR_DRE/NEPTUNE）`);
        }
        if (!['ALLOW', 'REJECT', 'ADJUST', 'REPLACE'].includes(log.action)) {
          errors.push(`decisionLog[${idx}].action 字段无效（应为 ALLOW/REJECT/ADJUST/REPLACE）`);
        }
        if (!log.explanation || typeof log.explanation !== 'string') {
          errors.push(`decisionLog[${idx}].explanation 字段无效`);
        }
        if (!log.timestamp || typeof log.timestamp !== 'string') {
          errors.push(`decisionLog[${idx}].timestamp 字段无效`);
        }
      });
    }
  } else {
    logWarning('decisionLog 字段不存在（可能后端还未更新到 Skills 架构）');
  }

  return { valid: errors.length === 0, errors };
}

// 测试 1: 安全检查接口
async function testValidateSafety() {
  logTest('1. 安全检查接口 (POST /decision/validate-safety)');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}/decision/validate-safety`,
      {
        tripId: TEST_TRIP_ID,
        plan: mockRoutePlan,
        worldContext: mockWorldContext,
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const duration = Date.now() - startTime;

    // 验证状态码
    if (response.status === 200) {
      logSuccess(`接口响应状态码: ${response.status}`);
    } else {
      logError(`接口响应状态码不正确: ${response.status}（期望 200）`);
      return false;
    }

    // 验证响应结构
    if (response.data && response.data.success === true && response.data.data) {
      logSuccess('响应包含 success 和 data 字段');

      const validation = validateSafetyResponse(response.data.data);
      if (validation.valid) {
        logSuccess('响应数据格式验证通过');
        logSuccess(`  - allowed: ${response.data.data.allowed}`);
        logSuccess(`  - violations: ${response.data.data.violations?.length || 0} 项`);
        logSuccess(`  - decisionLog: ${response.data.data.decisionLog?.length || 0} 项`);
      } else {
        logError('响应数据格式验证失败:');
        validation.errors.forEach(err => logError(`  - ${err}`));
        return false;
      }
    } else {
      logError('响应格式不正确（缺少 success 或 data 字段）');
      return false;
    }

    // 验证性能
    if (duration < 5000) {
      logSuccess(`响应时间: ${duration}ms（< 5秒）`);
    } else {
      logWarning(`响应时间: ${duration}ms（> 5秒，可能较慢）`);
    }

    return true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      logError('无法连接到后端服务，请确认后端服务是否在运行（端口 3000）');
    } else if (error.response) {
      logError(`接口返回错误: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        logError(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      logError('请求超时（> 10秒）');
    } else {
      logError(`请求失败: ${error.message}`);
    }
    return false;
  }
}

// 测试 2: 节奏调整接口
async function testAdjustPacing() {
  logTest('2. 节奏调整接口 (POST /decision/adjust-pacing)');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}/decision/adjust-pacing`,
      {
        tripId: TEST_TRIP_ID,
        plan: mockRoutePlan,
        worldContext: mockWorldContext,
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const duration = Date.now() - startTime;

    if (response.status === 200) {
      logSuccess(`接口响应状态码: ${response.status}`);
    } else {
      logError(`接口响应状态码不正确: ${response.status}`);
      return false;
    }

    if (response.data && response.data.success === true && response.data.data) {
      logSuccess('响应包含 success 和 data 字段');
      logSuccess(`  - success: ${response.data.data.success}`);
      logSuccess(`  - changes: ${response.data.data.changes?.length || 0} 项`);
      if (response.data.data.decisionLog) {
        logSuccess(`  - decisionLog: ${response.data.data.decisionLog.length} 项`);
      } else {
        logWarning('decisionLog 字段不存在');
      }
    } else {
      logError('响应格式不正确');
      return false;
    }

    if (duration < 8000) {
      logSuccess(`响应时间: ${duration}ms（< 8秒）`);
    } else {
      logWarning(`响应时间: ${duration}ms（> 8秒）`);
    }

    return true;
  } catch (error: any) {
    if (error.response) {
      logError(`接口返回错误: ${error.response.status}`);
      if (error.response.data) {
        logError(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else {
      logError(`请求失败: ${error.message}`);
    }
    return false;
  }
}

// 测试 3: 节点替换接口
async function testReplaceNodes() {
  logTest('3. 节点替换接口 (POST /decision/replace-nodes)');

  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${API_BASE_URL}/decision/replace-nodes`,
      {
        tripId: TEST_TRIP_ID,
        plan: mockRoutePlan,
        worldContext: mockWorldContext,
        unavailableNodes: [
          {
            nodeId: 'node-1',
            reason: 'closed',
          },
        ],
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const duration = Date.now() - startTime;

    if (response.status === 200) {
      logSuccess(`接口响应状态码: ${response.status}`);
    } else {
      logError(`接口响应状态码不正确: ${response.status}`);
      return false;
    }

    if (response.data && response.data.success === true && response.data.data) {
      logSuccess('响应包含 success 和 data 字段');
      logSuccess(`  - success: ${response.data.data.success}`);
      logSuccess(`  - replacements: ${response.data.data.replacements?.length || 0} 项`);
      if (response.data.data.decisionLog) {
        logSuccess(`  - decisionLog: ${response.data.data.decisionLog.length} 项`);
      } else {
        logWarning('decisionLog 字段不存在');
      }
    } else {
      logError('响应格式不正确');
      return false;
    }

    if (duration < 10000) {
      logSuccess(`响应时间: ${duration}ms（< 10秒）`);
    } else {
      logWarning(`响应时间: ${duration}ms（> 10秒）`);
    }

    return true;
  } catch (error: any) {
    if (error.response) {
      logError(`接口返回错误: ${error.response.status}`);
      if (error.response.data) {
        logError(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else {
      logError(`请求失败: ${error.message}`);
    }
    return false;
  }
}

// 测试 4: 错误处理
async function testErrorHandling() {
  logTest('4. 错误处理测试');

  try {
    // 测试缺少必需参数
    try {
      await axios.post(
        `${API_BASE_URL}/decision/validate-safety`,
        {
          tripId: TEST_TRIP_ID,
          // 缺少 plan 和 worldContext
        },
        {
          timeout: 5000,
        }
      );
      logError('缺少必需参数时应该返回错误，但请求成功');
      return false;
    } catch (error: any) {
      if (error.response && error.response.status >= 400) {
        logSuccess(`缺少必需参数时正确返回错误: ${error.response.status}`);
        if (error.response.data && !error.response.data.success) {
          logSuccess('错误响应包含 success: false');
        }
      } else {
        logError('缺少必需参数时未返回预期的错误响应');
        return false;
      }
    }

    return true;
  } catch (error: any) {
    logError(`错误处理测试失败: ${error.message}`);
    return false;
  }
}

// 测试 5: 历史决策接口（需要真实的 tripId）
async function testHistoryInterfaces() {
  logTest('5. 历史决策接口测试（需要真实的 tripId）');

  // 这些接口需要真实的 tripId 和认证，这里只做接口可用性检查
  logWarning('历史决策接口测试需要真实的 tripId 和认证，跳过具体测试');
  log('  - GET /trips/:id/persona-alerts - 需要认证和真实 tripId');
  log('  - GET /trips/:id/decision-log - 需要认证和真实 tripId');
  
  return true;
}

// 主测试函数
async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('前端 Skills 测试检查清单 - API 兼容性测试', 'blue');
  log('='.repeat(60), 'blue');
  log(`API 基础URL: ${API_BASE_URL}`, 'blue');

  const results: Record<string, boolean> = {};

  results['validateSafety'] = await testValidateSafety();
  results['adjustPacing'] = await testAdjustPacing();
  results['replaceNodes'] = await testReplaceNodes();
  results['errorHandling'] = await testErrorHandling();
  results['historyInterfaces'] = await testHistoryInterfaces();

  // 总结
  logTest('测试总结');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;

  log(`总计: ${total} 项测试`, 'cyan');
  logSuccess(`通过: ${passed} 项`);
  if (failed > 0) {
    logError(`失败: ${failed} 项`);
  }

  const failedTests = Object.entries(results)
    .filter(([_, passed]) => !passed)
    .map(([name, _]) => name);

  if (failedTests.length > 0) {
    log('\n失败的测试:', 'red');
    failedTests.forEach(test => logError(`  - ${test}`));
  }

  log('\n' + '='.repeat(60), 'blue');
  if (failed === 0) {
    log('✅ 所有测试通过！', 'green');
  } else {
    log('❌ 部分测试失败，请检查后端接口实现', 'red');
  }
  log('='.repeat(60) + '\n', 'blue');
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`测试运行失败: ${error.message}`);
    process.exit(1);
  });
}

export { runAllTests, testValidateSafety, testAdjustPacing, testReplaceNodes };

