#!/usr/bin/env python3
"""
测试后端接口连通性脚本
用法:
  python3 test-backend-connection.py
  或设置环境变量:
  BACKEND_HOST=<另一个devbox的IP> BACKEND_PORT=<端口> python3 test-backend-connection.py
"""

import os
import sys
import socket
import urllib.request
import urllib.error
from urllib.parse import urljoin

# 从环境变量读取配置，默认为 vite.config.ts 中的配置
BACKEND_HOST = os.getenv('BACKEND_HOST', '127.0.0.1')
BACKEND_PORT = os.getenv('BACKEND_PORT', '4000')
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"

def test_tcp_connection(host, port):
    """测试TCP连接"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, int(port)))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"   TCP连接测试异常: {e}")
        return False

def test_http_endpoint(url, timeout=5):
    """测试HTTP端点"""
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Backend-Connection-Test/1.0')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            data = response.read(200).decode('utf-8', errors='ignore')
            headers = dict(response.headers)
            return {
                'success': True,
                'status_code': status_code,
                'data': data,
                'headers': headers,
            }
    except urllib.error.HTTPError as e:
        return {
            'success': False,
            'status_code': e.code,
            'error': str(e),
        }
    except urllib.error.URLError as e:
        return {
            'success': False,
            'error': str(e),
        }
    except Exception as e:
        return {
            'success': False,
            'error': f"未知错误: {str(e)}",
        }

def main():
    print("=== 后端接口连通性测试 ===\n")
    print(f"后端服务地址: {BACKEND_URL}\n")
    
    # 测试1: TCP连接
    print("1. 测试TCP连接...")
    if test_tcp_connection(BACKEND_HOST, BACKEND_PORT):
        print(f"   ✅ TCP连接成功 ({BACKEND_HOST}:{BACKEND_PORT})")
    else:
        print(f"   ❌ TCP连接失败 ({BACKEND_HOST}:{BACKEND_PORT})")
        print("   请检查:")
        print(f"   - 后端服务是否正在运行")
        print(f"   - 网络是否可达")
        print(f"   - 防火墙设置")
        print(f"\n   如果后端在另一个devbox上，请设置:")
        print(f"   export BACKEND_HOST=<另一个devbox的IP或主机名>")
        print(f"   export BACKEND_PORT=<后端服务端口>")
        return
    print()
    
    # 测试2: HTTP基本连通性
    print("2. 测试HTTP基本连通性...")
    result = test_http_endpoint(BACKEND_URL)
    if result.get('success'):
        print(f"   ✅ HTTP状态码: {result['status_code']}")
        if result.get('data'):
            print(f"   响应内容: {result['data'][:100]}...")
    else:
        print(f"   ⚠️  HTTP状态码: {result.get('status_code', 'N/A')}")
        if result.get('error'):
            print(f"   错误: {result['error']}")
    print()
    
    # 测试3: 健康检查端点
    print("3. 测试健康检查端点...")
    health_endpoints = ['/health', '/api/health', '/healthz', '/ping', '/status']
    for endpoint in health_endpoints:
        url = urljoin(BACKEND_URL, endpoint)
        result = test_http_endpoint(url)
        if result.get('success') or (result.get('status_code') and result['status_code'] != 404):
            status = result.get('status_code', 'N/A')
            print(f"   ✅ {endpoint}: HTTP {status}")
            if result.get('data'):
                print(f"   响应: {result['data']}")
            break
    print()
    
    # 测试4: API端点
    print("4. 测试API端点...")
    api_endpoints = ['/api', '/api/', '/api/v1', '/api/v1/health']
    for endpoint in api_endpoints:
        url = urljoin(BACKEND_URL, endpoint)
        result = test_http_endpoint(url, timeout=3)
        status = result.get('status_code', 'N/A')
        if result.get('success'):
            print(f"   ✅ {endpoint}: HTTP {status}")
        elif status != 'N/A':
            print(f"   ⚠️  {endpoint}: HTTP {status}")
    
    print("\n=== 测试完成 ===")
    print(f"\n当前配置:")
    print(f"  BACKEND_HOST={BACKEND_HOST}")
    print(f"  BACKEND_PORT={BACKEND_PORT}")
    print(f"\n如需测试另一个devbox，请设置环境变量:")
    print(f"  export BACKEND_HOST=<另一个devbox的IP>")
    print(f"  export BACKEND_PORT=<端口>")
    print(f"  python3 test-backend-connection.py")

if __name__ == '__main__':
    main()

