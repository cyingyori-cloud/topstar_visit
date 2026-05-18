# TopStar Visit AI Agent Scaffold

这个目录是在原型基础上补的一版”真实 Agent”骨架：

- 前端：继续使用现有 React + Zustand 聊天界面
- 后端：本地 Node 服务，调用 OpenAI Responses API
- Skills：先以本地 business tools 形式实现
- 知识库：拓斯达行业 Know-How 文档，AI 回答时自动注入上下文
- Fallback：如果没有配置 OpenAI 或 agent 服务不可用，会自动退回原有规则引擎

## 目录

- `src/services/agent.ts`
  前端请求 agent 服务
- `server/agent-server.mjs`
  本地 agent 运行时
- `src/stores/appStore.ts`
  聊天入口，优先走 agent，失败时退回 fallback
- `knowledge/`
  拓斯达行业知识库（docx 已转换为 markdown）

## 运行

1. 安装依赖

```bash
npm install
```

2. 启动 agent 服务

```bash
OPENAI_API_KEY=你的key npm run dev:agent
```

如果上游是 OpenAI-compatible `chat/completions`，例如 AIHub：

```bash
OPENAI_API_KEY=你的key \
OPENAI_BASE_URL=https://your-provider.example/v1/chat/completions \
OPENAI_API_MODE=chat_completions \
OPENAI_MODEL=你的模型名 \
npm run dev:agent
```

可选环境变量：

- `KNOWLEDGE_DIR`
  知识库目录，默认 `./knowledge`
- `OPENAI_MODEL`
  默认 `gpt-5.5`
- `OPENAI_BASE_URL`
  默认 `https://api.openai.com/v1`，如果是 OpenAI-compatible 平台可改成对应地址
- `OPENAI_API_MODE`
  支持 `responses` 或 `chat_completions`
- `PORT`
  默认 `8788`
- `MCP_CONFIG_PATH`
  指向远端 MCP 配置文件，例如 `./server/mcp-config.local.json`
- `MCP_ENABLED`
  `true/false`
- `MCP_BASE_URL`
  远端 MCP 域名，例如 `https://your-domain.com`
- `MCP_TRANSPORT`
  支持 `streamable-http`、`mcp-call`、`simple-http`
- `MCP_TOOL_MAP`
  JSON 字符串，声明本地 skill 到远端 tool 的映射

3. 启动前端

```bash
npm run dev
```

如果你是文件直开或以后换部署地址，也可以加：

```bash
VITE_AGENT_BASE_URL=http://127.0.0.1:8788
```

## 现在已经接入的 skill/tool

- `skill_visit_board_summary`
- `skill_customer_snapshot`
- `skill_visit_frequency`
- `skill_industry_cases`
- `skill_knowledge_lookup`
- `skill_pocc_visit_prep`

## 远端 MCP 预留接法

项目已经加入远端 MCP 适配层：

- 配置样例：
  [server/mcp-config.example.json](/Users/cying/Documents/codeX/.tmp_topstar_visit_ai_3/server/mcp-config.example.json)
- 适配器实现：
  [server/mcp-client.mjs](/Users/cying/Documents/codeX/.tmp_topstar_visit_ai_3/server/mcp-client.mjs)

建议你后续这样补配置：

1. 复制一份配置

```bash
cp server/mcp-config.example.json server/mcp-config.local.json
```

2. 填入真实值

- `baseUrl`
- `transport`
- `auth`
- `toolMap`

3. 启动时指定

```bash
OPENAI_API_KEY=你的key MCP_CONFIG_PATH=./server/mcp-config.local.json npm run dev:agent
```

当前这版远端适配器已经支持：

- `streamable-http`
  通过 `/mcp` 做 `initialize`、`tools/list`、`tools/call`
- `mcp-call`
  通过 `/mcp/call` 做 JSON-RPC 调用
- `simple-http`
  通过 `/mcp/tools/:toolName` 直接调用

还未真正接入远端 SSE 调用执行：

- `/mcp/sse`
- `/mcp/messages?sessionId=...`

但配置项和兼容方向已经预留好了，后续如果你给的是 Fxiaoke 风格 SSE 地址，我会把这块补上。

## 后续把地址给我时，最有用的信息

- MCP 根地址
- 传输方式：`/mcp`、`/mcp/call`、`/mcp/tools/:name`、或带 `/mcp/sse`
- 认证方式：Bearer、X-API-Key、自定义 Header
- 远端工具列表
- 哪些工具允许写操作

## 下一步建议

1. 把 `filtered*` mock 数据替换成真实 CRM/数据库查询
2. 把 `knowledgeItems` 换成检索式知识库
3. 把 `create_visit_task` 之类写操作做成带审批的 tool
4. 如需跨系统复用，再把 tools 抽成 MCP server
