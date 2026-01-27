/**
 * 测试准备度 API 是否可用
 * 使用方法：在浏览器控制台运行此脚本，或使用 node 运行（需要配置环境变量）
 */

// 配置
const API_BASE_URL = window.__CONFIG__?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api';
const TRIP_ID = new URLSearchParams(window.location.search).get('tripId') || prompt('请输入 tripId:');

if (!TRIP_ID) {
  console.error('❌ 需要 tripId 才能测试');
  process.exit(1);
}

console.log('🧪 开始测试准备度 API...');
console.log('📋 配置:', { API_BASE_URL, TRIP_ID });

// 测试函数
async function testReadinessAPI() {
  const results = {
    getTripReadiness: null,
    check: null,
    getPersonalizedChecklist: null,
    getRiskWarnings: null,
  };

  // 1. 测试 GET /readiness/trip/:id
  console.log('\n1️⃣ 测试 GET /readiness/trip/:id');
  try {
    const response = await fetch(`${API_BASE_URL}/readiness/trip/${TRIP_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || ''}`,
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.success) {
      console.log('✅ GET /readiness/trip/:id 成功');
      console.log('📊 响应数据:', data);
      results.getTripReadiness = { success: true, data: data.data };
    } else {
      console.error('❌ GET /readiness/trip/:id 失败:', data);
      results.getTripReadiness = { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ GET /readiness/trip/:id 异常:', error);
    results.getTripReadiness = { success: false, error: error.message };
  }

  // 2. 测试 POST /readiness/check
  console.log('\n2️⃣ 测试 POST /readiness/check');
  try {
    // 先获取 trip 信息
    const tripResponse = await fetch(`${API_BASE_URL}/trips/${TRIP_ID}`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || ''}`,
      },
      credentials: 'include',
    });
    const tripData = await tripResponse.json();
    
    if (tripData.success && tripData.data) {
      const checkDto = {
        destinationId: tripData.data.destination || 'IS',
        traveler: {
          nationality: 'CN',
        },
        trip: {
          startDate: tripData.data.startDate,
          endDate: tripData.data.endDate,
        },
      };
      
      const response = await fetch(`${API_BASE_URL}/readiness/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(checkDto),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        console.log('✅ POST /readiness/check 成功');
        console.log('📊 响应数据:', data);
        results.check = { success: true, data: data.data };
      } else {
        console.error('❌ POST /readiness/check 失败:', data);
        results.check = { success: false, error: data };
      }
    } else {
      console.warn('⚠️ 无法获取 trip 信息，跳过 check API 测试');
      results.check = { success: false, error: '无法获取 trip 信息' };
    }
  } catch (error) {
    console.error('❌ POST /readiness/check 异常:', error);
    results.check = { success: false, error: error.message };
  }

  // 3. 测试 GET /readiness/personalized-checklist
  console.log('\n3️⃣ 测试 GET /readiness/personalized-checklist');
  try {
    const response = await fetch(`${API_BASE_URL}/readiness/personalized-checklist?tripId=${TRIP_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || ''}`,
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.success) {
      console.log('✅ GET /readiness/personalized-checklist 成功');
      console.log('📊 响应数据:', data);
      results.getPersonalizedChecklist = { success: true, data: data.data };
    } else {
      console.error('❌ GET /readiness/personalized-checklist 失败:', data);
      results.getPersonalizedChecklist = { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ GET /readiness/personalized-checklist 异常:', error);
    results.getPersonalizedChecklist = { success: false, error: error.message };
  }

  // 4. 测试 GET /readiness/risk-warnings
  console.log('\n4️⃣ 测试 GET /readiness/risk-warnings');
  try {
    const response = await fetch(`${API_BASE_URL}/readiness/risk-warnings?tripId=${TRIP_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('accessToken') || ''}`,
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.success) {
      console.log('✅ GET /readiness/risk-warnings 成功');
      console.log('📊 响应数据:', data);
      results.getRiskWarnings = { success: true, data: data.data };
    } else {
      console.error('❌ GET /readiness/risk-warnings 失败:', data);
      results.getRiskWarnings = { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ GET /readiness/risk-warnings 异常:', error);
    results.getRiskWarnings = { success: false, error: error.message };
  }

  // 总结
  console.log('\n📊 测试结果总结:');
  console.log('='.repeat(50));
  const successCount = Object.values(results).filter(r => r?.success).length;
  const totalCount = Object.keys(results).length;
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失败: ${totalCount - successCount}/${totalCount}`);
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([key, result]) => {
    if (result?.success) {
      console.log(`✅ ${key}: 成功`);
    } else {
      console.log(`❌ ${key}: 失败 -`, result?.error?.message || result?.error || '未知错误');
    }
  });

  return results;
}

// 如果在浏览器环境中，直接运行
if (typeof window !== 'undefined') {
  testReadinessAPI().then(results => {
    console.log('\n💾 测试结果已保存到 window.readinessTestResults');
    window.readinessTestResults = results;
  });
}

// 如果在 Node 环境中，导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testReadinessAPI };
}
