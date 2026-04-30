// Day 0 最小测试脚本：验证火山引擎 API key 能不能调通
// 运行方式：在 nocturne-tarot 目录下执行
//   node --env-file=.env test-api.js

// ① 从环境变量读 key
const apiKey = process.env.ARK_API_KEY;

// ② 火山方舟 API 地址（OpenAI 兼容格式）
const url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// ③ 你选好的模型 ID（auto routing，不用建接入点）
const model = "doubao-seed-2-0-lite-260215";

async function test() {
  // 简单检查 key 是否填了
  if (!apiKey || apiKey.includes("在这里")) {
    console.error("❌ 请先把 .env 文件里的 ARK_API_KEY 改成你真实的 key");
    return;
  }

  console.log("⏳ 正在和火山引擎打招呼...");

  // ④ 发请求 —— 这就是和大模型"对话"的核心
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,  // 用 key 证明身份
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "user", content: "请用一句话向我打招呼，告诉我你是哪个模型。" }
      ],
    }),
  });

  // ⑤ 处理回复
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ 请求失败 (HTTP ${response.status}):`);
    console.error(errorText);
    return;
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;

  console.log("✅ 调通了！AI 回复：");
  console.log("───────────────────");
  console.log(reply);
  console.log("───────────────────");
  console.log(`（用了 ${data.usage.total_tokens} 个 token）`);
}

test().catch((err) => {
  console.error("❌ 出错了：", err.message);
});
