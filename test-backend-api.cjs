// 测试后端API连通性的Node.js脚本
const http = require('http');
const https = require('https');

const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

console.log('=== 后端API连通性测试 ===\n');
console.log(`后端服务地址: ${BACKEND_URL}\n`);

// 测试函数
function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const url = new URL(path, BACKEND_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200), // 只取前200字符
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: '连接超时',
      });
    });

    req.end();
  });
}

// 执行测试
async function runTests() {
  // 测试1: 基本连通性
  console.log('1. 测试基本连通性...');
  const result1 = await testEndpoint('/', '根路径');
  if (result1.error) {
    console.log(`   ❌ ${result1.error}`);
    console.log('   请检查:');
    console.log(`   - 后端服务是否正在运行 (${BACKEND_HOST}:${BACKEND_PORT})`);
    console.log('   - 网络是否可达');
    console.log('   - 防火墙设置\n');
  } else {
    console.log(`   ✅ HTTP状态码: ${result1.statusCode}`);
    if (result1.data) {
      console.log(`   响应: ${result1.data.substring(0, 100)}...\n`);
    }
  }

  // 测试2: 健康检查端点
  console.log('2. 测试健康检查端点...');
  const healthEndpoints = ['/health', '/api/health', '/healthz', '/ping', '/status'];
  for (const endpoint of healthEndpoints) {
    const result = await testEndpoint(endpoint, endpoint);
    if (!result.error && result.statusCode !== 404) {
      console.log(`   ✅ ${endpoint}: HTTP ${result.statusCode}`);
      if (result.data) {
        console.log(`   响应: ${result.data}\n`);
      }
      break;
    }
  }

  // 测试3: API端点
  console.log('\n3. 测试API端点...');
  const apiEndpoints = ['/api', '/api/', '/api/v1', '/api/v1/health'];
  for (const endpoint of apiEndpoints) {
    const result = await testEndpoint(endpoint, endpoint);
    if (!result.error) {
      console.log(`   ${endpoint}: HTTP ${result.statusCode}`);
    }
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n提示: 如果后端服务在另一个devbox上，请设置环境变量:');
  console.log('  export BACKEND_HOST=<另一个devbox的IP或主机名>');
  console.log('  export BACKEND_PORT=<后端服务端口>');
  console.log('  node test-backend-api.js');
}

runTests().catch(console.error);

