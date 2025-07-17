const dotenv = require('dotenv');
const fs = require('fs');

// 读取 .env 文件
let envConfig = {};
try {
  envConfig = dotenv.parse(fs.readFileSync('.env'));
} catch (e) {
  console.warn('.env 文件未找到或读取失败，将只使用默认环境变量');
}

module.exports = {
  apps: [
    {
      name: "nextjs-ai-chatbot",
      script: "npm",
      args: "start",
      env: {
        ...envConfig
      }
    }
  ]
};
