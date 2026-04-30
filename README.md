# 夜行塔罗 · NocturneTarot

> 一个有占卜师人格的 AI 塔罗占卜网页。问星辰，问月，问你心底的牌。

![夜行塔罗](assets/bg.png)

## 这是什么

一个单页 AI 应用：

- 写下你的问题 → 抽 3 张大阿卡纳塔罗牌（或单张今日运势）
- AI 占卜师"夜枢"凝视牌面，写下半文半白的解读
- 文字流式逐字浮出，配打字机声效
- 占卜结果可一键保存为分享图（朋友圈 / 小红书友好的 4:5 竖版）
- 历史记录存浏览器本地，5 条以内

零代码基础作者，借助 Claude Code 在 7 天内完成的 vibe coding 练手作品。

## 技术栈

- 前端：原生 HTML + CSS + JavaScript（无框架）
- 后端：Node.js + Express
- AI：火山引擎方舟 API（豆包 Doubao Seed 2.0 mini）
- 截图分享：html2canvas

## 本地运行

需要 Node.js ≥ 20。

```bash
# 1. 安装依赖
npm install

# 2. 准备环境变量
cp .env.example .env
# 编辑 .env，填入你的 ARK_API_KEY

# 3. 启动开发服务器
npm run dev

# 4. 浏览器打开
# http://localhost:3000
```

## 部署到 Render

1. Push 到 GitHub
2. Render → New → Web Service → 连接此仓库
3. 设置：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 环境变量 `ARK_API_KEY` = 你的火山方舟 key
4. 部署完成后访问 Render 给的公开链接

## 文件结构

```
nocturne-tarot/
├── index.html         前端整个页面（HTML + CSS + JS）
├── server.js          后端，转发请求到火山引擎
├── package.json       依赖与脚本
├── assets/
│   └── bg.png         背景图（霍格沃茨星空）
├── .env.example       环境变量模板
├── .gitignore         版本控制忽略清单
└── README.md          本文档
```

## 致谢

- 火山引擎方舟 提供 Doubao 模型 API
- Cinzel & Noto Serif SC 字体（Google Fonts）
- 占卜师人设、所有提示词、以及"做减法"的设计选择，都通过 Claude Code 边讨论边完成

## 许可

MIT.
</content>
