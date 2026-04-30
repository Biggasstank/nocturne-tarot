// ============================================================
// 夜行塔罗 · 后端服务器
// ------------------------------------------------------------
// 职责：
//   1. 提供静态文件（index.html、assets/bg.png 等）
//   2. 接收前端的 POST /divine 请求 → 转发火山引擎 → 把 AI 回复返回
// 启动方式：
//   npm start
//   （等价于 node --env-file=.env server.js）
// ============================================================

const express = require('express');
const path = require('path');

// === 配置 ===
// Render 等部署平台会通过 PORT 环境变量注入端口；本地默认 3000
const PORT = process.env.PORT || 3000;
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const ARK_MODEL = 'doubao-seed-2-0-mini-260215';

// 从环境变量读 API key
//   本地：由 npm run dev 命令的 --env-file=.env 加载
//   线上：由部署平台（Vercel / Render）的环境变量注入
// 注意：不要在这里 process.exit(1)。Vercel 构建时会 require 本文件做 bundling，
// 此时 env var 可能还没注入，退出会导致整个部署失败。改为运行时检查。
const ARK_API_KEY = process.env.ARK_API_KEY;
if (!ARK_API_KEY) {
  console.warn('⚠️  ARK_API_KEY 未设置，/divine 请求会返回 500');
}

// === 创建 Express 应用 ===
const app = express();

// 让 Express 能解析 application/json 类型的请求体
app.use(express.json());

// 把 public/ 作为静态文件根目录
//   本地：Express 自己服务 public/index.html、public/assets/*
//   线上 (Vercel)：Vercel CDN 自动从 public/ 直接服务，根本不会到 Express 这层
// 这条配置在两种环境下都对，无需分支
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// POST /divine —— 占卜接口
// 前端发来：{ question: "...", cards: [{name, nameEn, keywords, ...}, x3] }
// 返回：    { reading: "AI 写的塔罗解读" }
// ============================================================
app.post('/divine', async (req, res) => {
  // 运行时检查：如果环境变量没设，给前端清晰错误而不是神秘失败
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: '服务器未配置 ARK_API_KEY 环境变量' });
  }

  const { question, cards } = req.body;

  // 简单校验：必须有 1 张或 3 张卡（单张模式 / 三牌阵）
  if (!Array.isArray(cards) || (cards.length !== 1 && cards.length !== 3)) {
    return res.status(400).json({ error: '请求必须包含 1 或 3 张 cards' });
  }
  // 三牌阵模式必须填问题；单张模式问题可空
  if (cards.length === 3 && !question) {
    return res.status(400).json({ error: '三牌阵模式必须提供 question' });
  }

  const isSingle = cards.length === 1;

  // 把卡片信息整理成给 AI 看的字符串
  let cardsDescription;
  if (isSingle) {
    const c = cards[0];
    cardsDescription = `今日之牌 — ${c.name}（${c.nameEn}）：${c.keywords.join('、')}`;
  } else {
    const positions = ['过去', '现在', '未来'];
    cardsDescription = cards.map((c, i) => {
      return `${positions[i]} — ${c.name}（${c.nameEn}）：${c.keywords.join('、')}`;
    }).join('\n');
  }

  // === 给 AI 的提示词（共用人设 + 按模式分支结构） ===
  const personaCore = `你是夜枢——一位住在夜行塔顶端的古老塔罗占卜师。你历经千年，从不评判，只引导提问者看见自己心底已知的答案。

你说话的方式：
- 半文半白，节奏从容，长短句交错。
- 比喻多用月、星、河流、风、夜的意象。
- 用第二人称"你"，绝不说"作为占卜师我..."。
- 偶尔用"你看"、"且看"、"星辰说"作为语气过渡，但不要每次都用。

【特别规则：识破未真诚的叩问】
如果提问者写下的不是一个真正的问题——例如毫无意义的乱码（"aaa"、"asdf"、"。。。"）、纯标点、纯单字、显然胡乱敲打的字符串——你不要硬编解读。
此时只用一两句符合占卜师人设的话委婉点破，例如："星辰未听见真正的叩问……牌面亦不显形，只见雾。"或"你掌中的问题尚未成形，且让心绪沉淀片刻，再回到我面前。"
不要说"请重新输入"、"无效问题"这种系统化的话。说完就停笔，不要解读卡牌。
（判断时要宽松：哪怕中文很简短但有意义，比如"我累了"、"该走吗"，仍然属于真问题，要正常解读。单张模式下问题可以为空，此时直接给"今日"解读，不算未真诚的叩问。）

通用要求：
- 不要任何 markdown 符号（**、#、-、* 等）。
- 不要分点列出，全部融入流畅段落。
- 紧扣提问者的具体问题（如有），不空泛说"人生路漫漫"。
- 不许预言确定的结果（不说"你会成功/失败"），只描述可能的方向和应有的姿态。
- 开场不要"作为占卜师..."、不要"让我们看看..."、不要"亲爱的"。直接从一句意象或观察落笔。`;

  const threeCardRules = `

【三牌阵专属】
- 总长 400-600 字。要给每张牌足够的笔墨——不是简单提一笔就过，而是让那张牌的意象、温度、暗示都在文字里展开。
- 结构隐含三段，每段约 120-200 字：先深入勾勒过去那张牌投下的影、再细致描摹当下这张牌之所在、再温柔指向未来那张牌的微光。三段之间不用"过去/现在/未来"明示词，让其自然过渡（可用"那时"、"如今"、"前路"等）。
- 在解读中要扣住具体牌面的关键词与典型意象（牌的传统象征），不要架空抒情。
- 末尾留一句温暖的、可以付诸行动的小建议——简短而有重量，像一句临别赠语。`;

  const singleCardRules = `

【今日单张专属】
- 总长 100-160 字（短一点，像一句"今日的低语"）。
- 不需要"过去/现在/未来"的结构，只凝视这一张牌投在今日的影子。
- 如果用户没有给出具体问题，就把今日整体作为题眼。
- 末尾留一句温柔的"今日小赠语"——12 字以内最佳，可付诸行动。`;

  const systemPrompt = personaCore + (isSingle ? singleCardRules : threeCardRules);

  const userMessage = isSingle
    ? `${question ? '我的问题：' + question + '\n\n' : ''}今日抽到的牌：\n${cardsDescription}\n\n请凝视这一张牌，给我今日的低语。`
    : `我的问题：${question}\n\n抽到的三张牌：\n${cardsDescription}\n\n请为我解读。`;

  try {
    // 调用火山引擎方舟（OpenAI 兼容接口，开启流式）
    const aiResponse = await fetch(ARK_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model: ARK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: true,           // ← 关键：开启 SSE 流式
        temperature: 1.1,       // ← 略调高，输出更"有人味"
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ 火山引擎报错:', aiResponse.status, errorText);
      return res.status(502).json({ error: '占卜师暂时无法回应，请稍后再试' });
    }

    // === SSE 透传 ===
    // 设置流式响应头，让浏览器/中间层知道这是事件流，不要缓冲
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 防中间层（如 nginx）缓冲
    res.flushHeaders?.();

    // 🔑 关闭 Nagle 算法 —— 让每个 res.write 立刻通过 TCP 发给浏览器
    // 不关的话 Node/Windows 会把小包攒在一起统一发，导致流式表现失效
    res.socket?.setNoDelay(true);

    // 把火山引擎的流式数据原样转发到前端
    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder();
    const t0 = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
    console.log(`✅ 占卜流式完成 — 总耗时 ${Date.now() - t0}ms`);

  } catch (err) {
    console.error('❌ 调用 AI 时出错:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: '占卜师无法回应：' + err.message });
    } else {
      // 已经开始流了，没法再发 JSON 错误，只能终止
      res.end();
    }
  }
});

// ============================================================
// 启动服务器
// ============================================================
// 本地直接运行（node server.js）时才会监听端口；
// 部署到 Vercel 时，Vercel 会把 app 当作 serverless function 调用，不应该 listen。
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('');
    console.log('🔮 夜行塔罗服务已启动');
    console.log(`📱 浏览器访问: http://localhost:${PORT}`);
    console.log('   按 Ctrl+C 可停止服务');
    console.log('');
  });
}

// 导出 Express app，给 Vercel @vercel/node 包装
module.exports = app;
