/**
 * 行程详情页接口测试脚本
 * 在浏览器控制台执行此脚本进行接口测试
 * 
 * 使用方法:
 * 1. 打开行程详情页
 * 2. 打开浏览器开发者工具 (F12)
 * 3. 切换到 Console 标签页
 * 4. 复制此脚本并执行
 * 5. 调用: await testTripDetailAPIs('your-trip-id')
 */

async function testTripDetailAPIs(tripId) {
  if (!tripId) {
    console.error('❌ 请提供 tripId');
    console.log('使用方法: await testTripDetailAPIs("your-trip-id")');
    return;
  }

  const baseUrl = '/api/trips';
  const tests = [];
  
  console.log(`🧪 开始测试行程详情页接口 (Trip ID: ${tripId})`);
  console.log('='.repeat(60));

  // 测试1: 获取行程详情
  try {
    const res = await fetch(`${baseUrl}/${tripId}`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id', 
      success, 
      status: res.status,
      hasData: !!data.data,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log('✅ 行程详情:', {
        id: data.data.id,
        name: data.data.name,
        days: data.data.TripDay?.length || 0
      });
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id', success: false, error: e.message });
  }

  // 测试2: 获取建议列表
  try {
    const res = await fetch(`${baseUrl}/${tripId}/suggestions?status=new`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/suggestions', 
      success, 
      status: res.status,
      count: success ? data.data.items?.length || 0 : 0,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log(`✅ 建议列表: ${data.data.items?.length || 0} 条`);
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/suggestions', success: false, error: e.message });
  }

  // 测试3: 获取建议统计
  try {
    const res = await fetch(`${baseUrl}/${tripId}/suggestions/stats`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/suggestions/stats', 
      success, 
      status: res.status,
      stats: success ? {
        abu: data.data.byPersona?.abu?.total || 0,
        drdre: data.data.byPersona?.drdre?.total || 0,
        neptune: data.data.byPersona?.neptune?.total || 0
      } : null,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log('✅ 建议统计:', data.data.byPersona);
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/suggestions/stats', success: false, error: e.message });
  }

  // 测试4: 获取证据
  try {
    const res = await fetch(`${baseUrl}/${tripId}/evidence?limit=3&offset=0`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/evidence', 
      success, 
      status: res.status,
      count: success ? data.data.items?.length || 0 : 0,
      total: success ? data.data.total || 0 : 0,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log(`✅ 证据列表: ${data.data.items?.length || 0}/${data.data.total || 0} 条`);
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/evidence', success: false, error: e.message });
  }

  // 测试5: 获取指标
  try {
    const res = await fetch(`${baseUrl}/${tripId}/metrics`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/metrics', 
      success, 
      status: res.status,
      hasMetrics: success ? !!data.data.fatigueScore : false,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log('✅ 行程指标:', {
        fatigue: data.data.fatigueScore,
        buffer: data.data.bufferTotal
      });
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/metrics', success: false, error: e.message });
  }

  // 测试6: 获取冲突
  try {
    const res = await fetch(`${baseUrl}/${tripId}/conflicts`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/conflicts', 
      success, 
      status: res.status,
      count: success ? (Array.isArray(data.data) ? data.data.length : 0) : 0,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log(`✅ 冲突列表: ${Array.isArray(data.data) ? data.data.length : 0} 条`);
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/conflicts', success: false, error: e.message });
  }

  // 测试7: 获取行程状态
  try {
    const res = await fetch(`${baseUrl}/${tripId}/state`);
    const data = await res.json();
    const success = data.success && !!data.data;
    tests.push({ 
      name: 'GET /trips/:id/state', 
      success, 
      status: res.status,
      hasState: success ? !!data.data : false,
      error: success ? null : (data.error?.message || '未知错误')
    });
    if (success) {
      console.log('✅ 行程状态: 已获取');
    }
  } catch (e) {
    tests.push({ name: 'GET /trips/:id/state', success: false, error: e.message });
  }

  // 输出测试结果表格
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总:');
  console.table(tests.map(t => ({
    '接口': t.name,
    '状态': t.success ? '✅ 成功' : '❌ 失败',
    'HTTP状态': t.status || '-',
    '错误信息': t.error || '-'
  })));

  // 统计
  const successCount = tests.filter(t => t.success).length;
  const totalCount = tests.length;
  console.log(`\n📈 测试统计: ${successCount}/${totalCount} 通过`);

  return tests;
}

// 导出函数（如果作为模块使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testTripDetailAPIs };
}

// 使用示例
console.log(`
📝 使用说明:
1. 获取当前页面的 tripId:
   const tripId = window.location.pathname.match(/\\/trips\\/([^/]+)/)?.[1];
   
2. 执行测试:
   await testTripDetailAPIs(tripId);
   
3. 或者直接提供 tripId:
   await testTripDetailAPIs('your-trip-id');
`);

