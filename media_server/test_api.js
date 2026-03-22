// 测试 Node Media Server API
const http = require('http');

// 测试不同的 payload 格式
const payloads = [
  // 格式1: 标准格式
  {
    name: "格式1 - 标准",
    data: {
      app: "live",
      mode: "static",
      edge: "rtsp://admin:admin123@192.168.1.100:554/stream",
      name: "test_camera"
    }
  },
  // 格式2: 使用 url 参数
  {
    name: "格式2 - URL参数",
    data: {
      app: "live",
      mode: "static", 
      url: "rtsp://admin:admin123@192.168.1.100:554/stream",
      name: "test_camera"
    }
  },
  // 格式3: 简化格式
  {
    name: "格式3 - 简化",
    data: {
      app: "live",
      edge: "rtsp://admin:admin123@192.168.1.100:554/stream",
      name: "test_camera"
    }
  }
];

function testAPI(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload.data);
    const auth = Buffer.from('admin:123456').toString('base64');
    
    const options = {
      hostname: '127.0.0.1',
      port: 8001,
      path: '/api/relay/pull',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Basic ${auth}`
      }
    };

    console.log(`\n=== 测试 ${payload.name} ===`);
    console.log('Payload:', JSON.stringify(payload.data, null, 2));

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应: ${body}`);
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (e) => {
      console.error(`错误: ${e.message}`);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('开始测试 Node Media Server API...\n');
  
  for (const payload of payloads) {
    try {
      await testAPI(payload);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    } catch (e) {
      console.error('测试失败:', e.message);
    }
  }
  
  console.log('\n测试完成！');
}

runTests();
