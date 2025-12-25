# AGENTS.md - 全栈 TypeScript Monorepo 工程开发规范（默认：Vue3 + Vite + TailwindCSS v4 + ESLint + Prettier + Bun）

本文档用于指导人类开发者与自动化工具（Codex / AGENT）在仓库内协作开发，目标是让任何一个“前后端都用 TypeScript”的全栈项目都具备一致的：目录结构、模块边界、代码风格与质量门禁。

适用范围：本仓库内的 `apps/*`、`packages/*`、`scripts/*`、根目录工程配置。

约束等级：

- **必须/禁止**：强约束，违反即视为不合规。
- **建议**：推荐做法，可在项目初始化时评审后调整，但需更新本文档。

---

# 0. 总则（必须遵守）

1. **安全第一**：任何可能导致数据丢失、历史不可逆、批量破坏性修改的操作，必须先说明影响范围并获得确认。
2. **边界优先**：先定边界（目录/模块/包的职责），再写实现；边界不清会导致长期返工。
3. **最小改动原则**：修复/迭代优先做最小可验证变更，避免“顺手重构”扩大影响面。
4. **全仓 TypeScript**：业务代码必须使用 TypeScript；默认约定为 `src/**` 内**禁止新增** `.js`（配置脚本例外）。
5. **先梳理架构再写代码**：动手前必须明确模块划分、输入输出、数据流向、服务边界、依赖关系。
6. **先跑通再打磨再优化**：遵循 `Make it work → Make it right → Make it fast`（先可用，再正确/可维护，最后才是性能）。

设计时建议用“四象限”快速校准职责边界：

| 概念         | 说明                          | 常见落点（示例）                                        |
| ------------ | ----------------------------- | ------------------------------------------------------- |
| 消费端       | 接收外部输入或依赖注入的入口  | 前端页面事件/路由、后端 Controller、MQ 消费者、定时任务 |
| 生产端       | 产生输出或副作用的出口        | Repository、第三方 API 调用、消息发布、文件写入         |
| 状态（变量） | 存储当前系统信息的数据        | DB、Redis、内存缓存、LocalStorage                       |
| 变换（函数） | 对数据/状态进行处理的核心逻辑 | Service（用例编排）、领域纯函数、校验与映射             |

---

# 1. 技术栈（必须明确）

## 1.1 基线技术栈（默认必须具备）

- 运行时与包管理：`Bun`（Workspace/Monorepo）
- 语言：`TypeScript`（前端 + 后端）
- 代码规范：`ESLint` + `Prettier`
- Monorepo：`apps/`（可运行应用）+ `packages/`（可复用包）

## 1.2 前端默认技术栈（如需更换必须更新本文档）

- 框架：`Vue 3`
- 构建：`Vite`
- 样式：`TailwindCSS v4`
- 状态管理（建议）：`Pinia`
- 路由（Web/H5 建议）：`Vue Router`

## 1.3 后端默认技术栈（默认：NestJS + TypeScript）

- 框架：`NestJS`
- 数据库与 ORM（按项目固化）：`Prisma` / `TypeORM`（或其他等价方案）
- API 风格（按项目固化）：默认 `REST`；如采用 `GraphQL/RPC` 必须在项目文档中明确并同步调整目录与分层约定

若后端不使用 NestJS，也必须保持“模块化 + 分层”的职责边界，并在本文档中同步更新 `apps/server` 目录模板与第 5 章约束。

## 1.4 依赖版本策略与文档查询（必须遵守）

- **前后端所有依赖默认必须使用“最新稳定版本（stable）”**（以合并当下的最新稳定版为准），避免使用过旧版本导致安全/兼容问题。
- 任何依赖变更（新增/升级/移除）必须同时满足：
  - 明确兼容性：与当前 `Vue/Vite/Tailwind/TypeScript/NestJS/Bun` 版本组合兼容；
  - 明确用法：对照对应版本官方文档确认 API/参数/行为；
  - 可验证：至少通过 `lint` + `typecheck`，涉及逻辑变更则补 `test`，并提交更新后的 `bun.lock`；
  - 可追溯：如影响启动/脚本/env/本地依赖，则按 `11.2` 同步更新 `README.md`（或其链接的文档）。
- **不确定依赖用法/参数/版本差异时禁止“猜”**：
  - 人工开发：必须查官方文档/Release Notes；
  - AGENT 协作：必须通过 `Context7` 等 MCP 文档工具查询对应依赖版本的用法，禁止凭记忆编造 API。
- `packages/shared`（跨端共享）禁止引入只适用于浏览器或只适用于 Node 的依赖；如确有需要，必须拆分为独立包或在边界层隔离（避免污染跨端依赖图）。
- 如因兼容性不得不锁定非最新版本：必须在 `README.md` 或 `docs/` 记录原因、影响范围与升级计划（建议关联 Issue/任务）。

---

# 2. 目录结构（必须遵守）

本仓库是一个 Monorepo 的全栈项目：前端与后端都用 TypeScript。目录结构的核心是把“可运行应用（apps）”与“可复用共享包（packages）”清晰分离。

## 2.1 根目录：Monorepo 整体架构（上帝视角）

```text
<project-root>/
├── .vscode/                 #（可选）统一的工作区设置
├── apps/                    # 【应用区】存放具体可运行项目
│   ├── client/              # 前端项目（Vue 3 + Vite）
│   ├── admin/               # 管理后台（Vue 3 + Vite）
│   └── server/              # 后端项目（NestJS）
├── packages/                # 【共享区】存放跨应用复用的公共包
│   ├── shared/              # 前后端通用的纯 TS（DTOs/Types/Utils）
│   ├── ui/                  #（必须）跨应用复用的 UI 组件库（纯 UI）
│   ├── eslint-config/       #（必须）统一的 ESLint 配置包
│   ├── tsconfig/            #（必须）统一的 TSConfig 配置包
│   └── vite-config/         #（必须）统一的 Vite 配置包
├── content/                 # 【内容库】Markdown 文章正文（默认本地存储）
├── sql/                     # 数据库脚本（schema/seed，按模块拆分）
├── scripts/                 # 仓库级脚本（检查、生成、发布等）
├── openspec/                # Spec-Driven 规范与变更记录
├── docker-compose.yml       # 本地基础设施编排（Postgres/Redis）
├── .gitignore
├── bun.lock                 # Bun 依赖锁文件
├── package.json             # 根配置：workspaces + 统一脚本
├── tsconfig.base.json       # TS 基础配置（子项目继承）
└── turbo.json               #（可选）Turborepo 任务编排
```

强约束：

- `apps/*` 可以依赖 `packages/*`
- `packages/*` 可以依赖其他 `packages/*`（需避免循环依赖）
- **禁止** `packages/*` 依赖 `apps/*`
- **禁止** 通过相对路径跨包引用源码（例如 `../../packages/shared/src/...`），必须通过包名导入

根目录 `package.json` 必须声明 Workspaces（示例）：

```json
{
  "name": "my-monorepo",
  "workspaces": ["apps/*", "packages/*"]
}
```

## 2.2 前端目录详解（`apps/client`）

技术栈：Vue 3 + TypeScript + Vite + Pinia（建议）+ TailwindCSS v4

设计理念：**领域驱动（Domain Driven）**。把复杂业务按“模块（modules）”聚合，而不是按文件类型分散。

```text
apps/client/
├── public/
├── src/
│   ├── api/                 # API 基础配置（fetch/axios 实例、拦截器等）
│   │   ├── client.ts        # 请求实例（拦截器/鉴权/错误处理）
│   │   └── index.ts
│   ├── assets/              # 静态资源
│   ├── styles/              # 全局样式（Tailwind 入口、全局 tokens）
│   │   └── index.css        # Tailwind 指令与全局样式入口
│   ├── components/          # 【通用】非业务组件（如 BaseButton）
│   ├── composables/         # 【通用】组合式函数（如 useDark、useWindow）
│   ├── layouts/             # 页面布局（MainLayout、AuthLayout）
│   ├── modules/             # 【核心】业务模块（与后端 modules 尽量对应）
│   │   └── <module>/
│   │       ├── components/  # 模块私有组件（仅该模块复用）
│   │       ├── api.ts       #（可选）模块 API 封装
│   │       ├── store.ts     # 模块状态（Pinia）
│   │       ├── types.ts     #（可选）模块局部类型（优先使用 packages/shared）
│   │       ├── views/       # 模块页面（路由页面/视图）
│   │       └── routes.ts    # 模块路由定义
│   ├── router/              # 路由入口（聚合所有 modules 的 routes）
│   │   ├── guard.ts         # 路由守卫（权限/鉴权）
│   │   └── index.ts         # 聚合所有 modules 的 routes
│   ├── store/               # 全局状态（App 配置、Theme 等）
│   ├── utils/               # 前端专用工具函数
│   ├── App.vue
│   └── main.ts
├── env.d.ts
├── index.html
├── package.json             # 依赖中以 workspace 引入 shared/ui
└── vite.config.ts
```

## 2.3 后端目录详解（`apps/server`）

技术栈：NestJS + TypeScript（数据库层按项目固化：Prisma/TypeORM 等）

设计理念：**模块化架构**。业务按 `modules/` 聚合；横切能力集中在 `common/`。

```text
apps/server/
├── src/
│   ├── common/              # 【通用】切面与工具（AOP/横切关注点）
│   │   ├── decorators/      # 自定义装饰器（如 @User/@Public）
│   │   ├── filters/         # 异常过滤器（统一异常映射）
│   │   ├── guards/          # 守卫（鉴权/权限）
│   │   ├── interceptors/    # 拦截器（统一返回值/日志等）
│   │   └── pipes/           # 管道（参数校验/转换）
│   ├── config/              # 环境变量与配置（集中加载与校验）
│   ├── database/            # 数据库相关（Prisma/TypeORM/迁移/种子等）
│   │   ├── prisma/          #（可选）Prisma schema/客户端
│   │   └── seeds/           #（可选）种子数据
│   ├── modules/             # 【核心】业务模块（与前端 modules 尽量对应）
│   │   └── <module>/
│   │       ├── dto/         # 入参/出参 DTO（校验与类型）
│   │       ├── strategies/  #（可选）认证策略（JWT/Local 等）
│   │       ├── <module>.controller.ts
│   │       ├── <module>.service.ts
│   │       └── <module>.module.ts
│   ├── app.module.ts        # 根模块（组装所有子模块）
│   └── main.ts              # 入口文件
├── test/                    # E2E 测试
├── package.json
└── tsconfig.json
```

## 2.4 共享包目录详解（`packages/shared`）

`packages/shared` 是 Monorepo 的“灵魂”：前后端共享 DTO/Types/Utils，避免同一类型在两端重复定义。

```text
packages/shared/
├── src/
│   ├── constants/           # 共享常量（如错误码、阈值）
│   ├── types/               # 共享类型定义
│   │   ├── models/          # 数据模型类型（User、Post 等）
│   │   └── api/             # API 请求/响应类型（LoginRequest 等）
│   └── utils/               # 前后端通用的纯工具函数
├── package.json
└── tsconfig.json
```

## 2.5 目录说明文件与 agents 目录（建议）

为提升团队协作效率与 AI 辅助质量，建议在“边界目录”内补齐目录说明与自动化资产。

建议范围：

- `apps/*`
- `packages/*`
- `apps/client/src/modules/*`
- `apps/server/src/modules/*`

建议约定：

- `claude.md`：该目录的“说明书”（给人和 AI 看），至少包含：职责边界、对外接口、依赖关系、如何运行/测试、常见坑位。
- `agents/`（可选）：该目录的自动化/提示词/代理工作流资产（如提示词模板、任务清单、脚本入口说明）。**禁止**在其中存放业务源码，避免边界混乱。

## 2.6 命名索引（建议：变量名/领域词汇表）

当项目规模增长或出现跨端大量共享字段时，建议维护一个“命名索引文件”，用于统一领域词汇、减少同义词与歧义，便于搜索与重构（尤其是 AI 辅助重构）。

建议位置（二选一）：

- `docs/命名索引.md`
- `openspec/命名索引.md`

建议格式（示例）：

| 名称        | 中文含义 | 类型（字段/变量/概念） | 出现位置（文件路径）                       | 备注/频率 |
| ----------- | -------- | ---------------------- | ------------------------------------------ | --------- |
| userId      | 用户 ID  | 字段                   | `packages/shared/src/types/models/user.ts` | 高        |
| accessToken | 访问令牌 | 字段                   | `apps/client/src/modules/auth/api.ts`      | 中        |

---

## 2.7 内容目录（Markdown 文章）（强约束）

本项目的博客文章正文以 **Markdown 文件**形式存储在本地磁盘（默认仓库根目录 `content/`），通过环境变量 `CONTENT_ROOT_DIR` 配置。

强约束：

1. **正文不入库**：数据库仅保存“文章元数据 + `content_path`（相对路径）”，禁止在数据库或对象存储中保存文章正文内容。
2. **路径安全**：服务端读取 Markdown 时必须做路径归一化与越权校验，确保 `content_path` 解析后仍位于 `CONTENT_ROOT_DIR` 之下，防止路径穿越。
3. **默认组织**：文章文件建议放在 `content/posts/<slug>.md`，文件名与 `slug` 保持一致（`kebab-case`），便于搜索与自动化处理。
4. **生产落地**：生产环境必须把 `CONTENT_ROOT_DIR` 挂载到持久化卷；如需切换到对象存储/数据库等方案，必须在 `openspec/` 提交变更提案并评审通过后执行。

# 3. packages 约定（可放什么 / 禁止放什么）

`packages/` 的定位是“跨应用复用”，默认不承载具体业务流程。它解决的是：复用、统一、沉淀基础能力。

## 3.1 允许放在 `packages/` 的内容（推荐分类）

- `packages/shared`：前后端通用的纯 TS（DTOs/Types/Utils）
  - 允许：共享类型、DTO、常量、纯函数工具（前后端都可用）
  - 禁止：业务流程编排（登录/下单/支付等用例）、网络请求、持久化逻辑
  - 禁止：浏览器/Node 专属 API（如 `window/document/process`），除非明确拆分为不同包并在本文档中约定
  - **ESM 模块解析（强约束）**：`packages/shared` 使用 `moduleResolution: NodeNext`，与 NestJS 后端保持一致。**所有导入语句必须使用 `.js` 扩展名**（如 `export * from "./types/index.js"`），否则 NodeNext 模块解析会失败。详见 `.agent/workflows/shared-package.md`
- `packages/ui`（必须）：跨应用复用的 UI 组件库（纯展示/交互骨架）
  - 允许：组件内部 UI 状态、无业务语义的交互（例如 Input/Button/Tabs/Navbar/Sidebar/List/Row/Col 等）
  - 禁止：调用业务 API、依赖应用路由/Store、写死业务文案/流程（文案与行为必须通过 `props/slots/emits` 注入）
  - 目录结构（强约束）：必须按职责归类到 `src/base`、`src/data`、`src/feedback`、`src/layout`、`src/media`、`src/navigation`、`src/types`
  - 组件形态（强约束）：每个组件必须“目录化”（至少包含 `index.ts` + `*.vue`；复杂组件必须拆分 `types.ts/composables.ts/utils.ts` 等），禁止把一个组件长期写成单文件巨大 `.vue`
  - 统一出口（强约束）：对外只允许从 `@echo/ui`（即 `packages/ui/src/index.ts`）导入，禁止深层导入组件内部文件
- `packages/eslint-config`（必须）：统一的 ESLint 配置包（建议 ESLint v9 Flat Config）
- `packages/tsconfig`（必须）：统一的 TypeScript `tsconfig` 基础配置包（避免各应用重复定义与漂移）
- `packages/vite-config`（必须）：统一的 Vite 配置包（Vue + TailwindCSS v4 共享配置）

## 3.2 `packages/` 的硬性规则（必须遵守）

- **禁止反向依赖**：`packages/*` 禁止导入 `apps/*` 代码
- **禁止深层导入**：库类包必须提供 `src/index.ts` 作为唯一出口，外部禁止从包内深层路径导入
- **API 最小化**：包对外暴露的导出必须是“最小必要集合”，避免随意暴露内部实现
- **可替换性**：包的对外接口应稳定，内部实现允许替换（避免把实现细节变成公共 API）

---

# 4. 前端组件分层（必须分得清）

本仓库约定前端组件的放置位置必须反映“复用范围/业务语义/耦合度”，避免组件边界失控。

## 4.1 四层定义（强约束）

1. `packages/ui`（跨应用复用，纯 UI）
   - 适合：Button、Modal、Tabs、Empty、Skeleton、Popover 等
   - 特征：无业务语义、只提供交互骨架；通过 `props/slots/emits` 让业务层注入内容与行为
2. `apps/*/src/components`（应用内通用组件，非业务）
   - 适合：仅在当前应用使用的通用组件（如 EmptyState 的业务无关版本）
   - 特征：不包含具体业务域（auth/post/order 等）；必要时可依赖本应用的工程约束（如路由/国际化），但不得承载业务流程
3. `apps/*/src/modules/**/components`（模块私有组件，带业务语义）
   - 适合：只在某个业务模块内复用的组件（如 LoginForm、ArticleCard）
   - 特征：允许出现业务文案/业务枚举/展示规则，但必须限制在该模块边界内
4. `apps/**/src/pages/**/components`（页面私有组件）
   - 适合：仅本页面使用、与页面状态/路由强耦合的组件
   - 若页面采用 `apps/*/src/modules/**/views` 组织，页面私有组件放 `apps/*/src/modules/**/views/**/components`
   - 特征：允许更高耦合与更快迭代，但禁止被其他页面直接复用（需要复用时必须上移到 modules/components 或 apps/\*/src/components）

## 4.2 快速判断规则（建议作为评审清单）

- 是否跨多个 app 复用？
  - 是 → `packages/ui`
  - 否 → 继续判断
- 是否跨多个模块/页面复用（但仅限本 app）？
  - 是 → `apps/*/src/components`
  - 否 → 继续判断
- 是否仅在某个业务模块内复用？
  - 是 → `apps/*/src/modules/**/components`
  - 否 → `apps/**/src/pages/**/components`（页面私有）

## 4.3 UI 基础组件复用（强约束）

1. 在 `apps/*` 的页面/视图中，**禁止**直接复制粘贴实现 `Input/Button/Tabs/Navbar/Sidebar/List/Row/Col` 等“基础 UI 组件骨架”（尤其是成段 Tailwind class）。
2. 一旦出现“跨应用复用”或“同一应用内重复出现（>=2）”，必须抽到 `packages/ui`，并保持 **无业务语义**：文案/跳转/接口调用只能留在业务层。
3. 如确需例外（一次性 Demo/临时 POC），必须在变更说明中写明原因与回收计划，并在 `openspec/` 归档。

## 4.4 packages/ui 组件结构与拆分（强约束）

1. **分类存放**：组件必须按职责放入对应目录（`base/data/feedback/layout/media/navigation`），公共类型放 `types/`，避免"所有组件堆在同一层"的熵增。
2. **单组件目录化**：每个组件使用独立目录，例如 `src/base/button/*`、`src/navigation/tabs/*`，并提供：
   - `index.ts`：组件对外出口（默认导出组件 + 导出类型）
   - `*.vue`：UI 实现（仅 UI，不写业务语义）
   - （可选）`types.ts`：公开类型与 Props 类型
   - （可选）`composables.ts` / `utils.ts`：复杂交互与计算逻辑抽离，保持高聚合低耦合
3. **复杂组件必须拆分**：
   - **功能单一原则**：每个组件只负责一件事
   - **最小组件化原则**：降低单个组件的复杂度，提高可维护性

   满足**任一条件**时必须拆分为子组件：

   | 条件             | 说明                                         | 示例                                                    |
   | ---------------- | -------------------------------------------- | ------------------------------------------------------- |
   | **行数 > 150**   | 超过 150 行即视为过于复杂                    | `AdminLayout.vue` 拆分为 `AdminSidebar` + `AdminHeader` |
   | **多个独立区域** | 模板中有 2+ 个功能独立的区块                 | 侧边栏、头部、内容区应各自独立                          |
   | **混合职责**     | 同时包含：状态管理 + 复杂计算 + 多子区域渲染 | —                                                       |
   | **可复用逻辑**   | 逻辑需要被多个组件复用                       | 提取为 composable                                       |

4. **拆分后的组件通信**：
   - 父 → 子：通过 `props` 传递数据
   - 子 → 父：通过 `emits` 触发事件
   - 双向绑定：使用 `defineModel()` 简化 `v-model`
5. **复用优先策略**：`apps/client` 与 `apps/admin` 若出现基础 UI 骨架重复（表单控件、按钮、布局容器、导航骨架等），必须优先补齐/扩展 `packages/ui`，业务层只做"装配（assemble）"。

## 4.5 图标与提示组件规范（强约束）

1. **统一图标库**：全仓只允许使用 `lucide-vue-next（Lucide 图标库）`。
2. **禁止手写 SVG**：业务代码与应用代码中禁止内联/手写 `<svg>` 图标；必须使用 `@echo/ui` 提供的 `UiIcon`。
3. **新增图标流程**：如需新增图标，只能在 `packages/ui/src/base/icon/icons.ts` 注册，并保持语义化命名（例如 `refresh`/`delete`），避免随意缩写。
4. **信息浓缩**：图标按钮默认配合 `UiTooltip` 提示，不在页面中冗余展示长文本，保持界面简洁、以操作为中心。
5. **管理后台优先 icon**：`apps/admin` 的“操作按钮”（编辑/预览/删除/发布/转草稿/刷新等）默认使用 icon-only + `UiTooltip`；文本按钮保留给“取消/确认/保存”等表单语义更强的场景。
6. **icon-only 圆形规范**：纯图标按钮必须使用 `UiButton` 的 `icon-only` 属性，确保按钮为圆形（`rounded-full`）且尺寸一致，避免通过手写 `p-2` 等方式“碰运气”对齐样式。

---

# 5. 后端分层与模块化（必须遵守）

## 5.1 请求处理链路（统一模式）

```text
controller → service → repository/provider →（db/外部服务）
```

约束说明：

- `controller`：只做输入校验、鉴权/上下文读取、调用 service、输出映射（含错误映射）。
- `service`：业务用例编排的唯一归属（规则、状态流转、事务边界等）。
- `repository/provider`：数据访问层或外部依赖封装（SQL/ORM/缓存/外部 SDK），只负责“怎么取/怎么存”。

## 5.2 模块边界（强约束）

- 以“领域/能力”拆分模块，而不是以“技术层”拆分（禁止全仓只有一个 `services/`）。
- 跨模块调用必须通过对方 `service`（或显式导出的 provider）；禁止直接导入对方模块内部的 `repository/dto/entities` 等实现细节。
- 跨模块共享的类型与 Schema：
  - 前后端共享 → 放 `packages/shared`
  - 仅后端共享 → 放 `apps/server/src/common` 或 `apps/server/src/modules/**/dto`

## 5.3 配置与环境变量（强约束）

- 启动时必须对环境变量做校验（建议用 Schema 校验），校验失败必须直接退出启动。
- 禁止在业务代码中到处读取 `process.env`/`Bun.env`；必须集中在 `config/` 层统一加载与导出。

## 5.4 并发、异步与幂等（强约束）

- 必须显式识别共享资源：数据库、Redis、文件系统、第三方接口、消息队列等都属于共享资源，默认按“并发访问”对待。
- 禁止在后端用**进程内可变全局状态**承载业务一致性（多实例部署会失效）；状态应落在 DB/Redis 等可共享存储中。
- 所有“写操作”（写库/发消息/调用第三方）必须可重试：
  - 通过唯一约束/幂等键（Idempotency Key）/事务等手段，保证重复请求不会造成重复副作用。
- 并发更新必须有策略：事务、乐观锁/版本号、唯一索引、必要时使用分布式锁（如 Redis Lock）但要控制锁粒度与 TTL。
- 区分“并发（同时发生）”与“异步（不阻塞）”：Node 侧大量逻辑是异步，但请求之间依然并发，必须避免竞态条件与顺序依赖。
- 如引入消息队列（MQ）：默认按“至少一次投递”设计消费者，消费者必须幂等，并准备好重试与死信处理。

---

# 6. 语言、命名与注释规范（必须遵守）

## 6.1 语言规则

- **所有注释与工程文档必须使用中文**。
- 英文专业名词首次出现时需附中文解释（如 `debounce（防抖）`）。

## 6.2 命名规范（强约束）

- 命名必须语义化，禁止出现 `a/b/c/temp/data1` 这类弱语义命名。
- 默认使用英文命名，并遵循英语语法：
  - 变量/字段：名词或名词短语（如 `userId`、`postList`）
  - 函数：动词开头（如 `getUserProfile`、`createPost`）
  - 布尔值：`is/has/can/should` 前缀（如 `isLoading`、`hasPermission`）
- 常量：`UPPER_SNAKE_CASE`（如 `MAX_RETRY_COUNT`）。
- 避免随意缩写；若必须缩写，需在团队命名索引（见 `2.6`）中登记并说明含义。
- 数据边界处做命名映射：
  - 代码内部默认使用 `camelCase`；
  - 如外部 API/数据库使用 `snake_case`，应在 DTO/映射层做转换，避免蛇形命名污染业务逻辑层。
- 文件与目录命名：
  - 目录与普通 TS 文件：默认 `kebab-case` 或框架约定命名（如 NestJS 的 `auth.controller.ts`）。
  - Vue 组件文件：`PascalCase.vue`（如 `UserCard.vue`）。

## 6.3 注释写什么（强约束）

- 注释优先解释“为什么这么做”，其次才是“做了什么”。
- 仅在以下场景必须写注释：
  - 业务规则/边界条件不直观；
  - 性能或兼容性取舍；
  - 复杂流程编排/状态机；
  - 与第三方库/平台限制有关的绕行方案。
- 禁止翻译式注释与过期注释。

## 6.4 推荐注释格式（统一风格）

- 对外暴露的函数/模块：使用 JSDoc（中文）描述职责、输入输出、边界与失败模式。
- Vue 组件：在 `<script setup lang="ts">` 顶部用块注释说明组件职责与对外接口语义。

示例（TS）：

```ts
/**
 * 计算订单总价。
 * 为什么：把计算逻辑从组件中抽离，便于复用与单元测试，避免模板里出现复杂表达式。
 */
export function calculateOrderTotal(items: Array<{ price: number; quantity: number }>) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

---

# 7. TypeScript 规范（必须遵守）

1. **对外边界必须类型明确**：模块对外导出的函数/组件 props/emit 必须有清晰类型。
2. **禁止显式 `any`**：
   - 优先用 `unknown` + 类型收窄，或用泛型/联合类型建模；
   - 若因第三方类型缺失必须临时使用，必须限制在最小范围，并写中文原因与移除条件。
3. **错误处理要结构化**：对外 API 必须明确失败模式（返回结果类型/抛异常/错误码之一），禁止“悄悄吞错”。

允许的例外写法（必须写明原因）：

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 第三方回调类型缺失，待补齐类型后移除
export function handleThirdPartyEvent(payload: any) {
  return payload;
}
```

---

# 8. 样式与 TailwindCSS v4 规范（必须遵守）

1. 以 Tailwind 原子类为主；能用类名表达的，不写自定义 CSS。
2. 自定义 CSS 仅允许用于 Tailwind 覆盖不了的平台限制或少量全局 reset，并必须写中文说明原因与边界。
3. 设计令牌（design tokens）必须集中管理：以 `packages/theme/theme.css` 作为**全仓库唯一主题源文件**，统一维护颜色/圆角/间距/字号等；禁止各 app 私自定义 `@theme` 导致主题分叉。

## 8.1 Theme 包与设计令牌规范（强约束）

> 目标：统一颜色、字号、圆角、间距等设计令牌（design tokens）的来源、分类与命名，保证跨端一致性与可维护性。

- Theme 源文件：`packages/theme/theme.css` 是全仓库唯一的设计令牌来源，使用 TailwindCSS v4 的 `@theme` 声明并生成对应工具类。
- 引入方式（强约束）：所有前端应用必须在入口样式中引入主题：
  - ✅ `apps/*/src/styles/index.css`：`@import "@echo/theme/theme.css";`
  - ❌ 禁止在应用内自行维护另一套 `@theme` token（避免分叉）。
- Monorepo 扫描范围（强约束）：必须显式声明 UI 源码扫描目录，确保 `packages/ui` 内的 Tailwind 类名能被生成：
  - ✅ `apps/*/src/styles/index.css`：`@source "../../../../packages/ui/src/**/*.{html,js,ts,jsx,tsx,vue}";`
- 分级分类（强约束）：`@theme` 内必须按以下大类分区，并保持顺序与可读性：
  1. 字体族：`--font-*`
  2. 颜色：`--color-*`
  3. 圆角：`--radius-*`
  4. 间距 / 尺寸：`--spacing-*`（驱动 `w-* / h-* / p-* / m-* / size-*` 等工具类）
  5. 字体（字号/行高）：`--text-*`（字号 token 必须配套 `--text-xxx--line-height`）
- 命名规则（强约束）：
  - 仅表达**设计语义**，不得出现任何业务域、页面名（如 `post/order/dashboard` 等）。
  - 采用小写 kebab-case，语义要通用可复用（如 `--text-heading-sm`、`--color-app-bg`、`--color-border-strong`）。
  - 需要表达强弱层级时，使用 `-weak/-weaker/-strong` 等语义后缀，禁止使用无语义的数字后缀（除非色阶本身就是设计语言的一部分且经过评审）。
- 使用优先级（强约束）：
  - 开发页面/组件时，颜色、字号、圆角、间距等**必须优先使用 theme 生成的 Tailwind 语义类**（例如 `bg-app-bg`、`text-heading`、`border-border`、`h-control-md`）。
  - **禁止**在模板中直接写硬编码设计值（含 `text-[#...]`、`bg-[#...]`、`text-[...]`、`w-[...]` 等任意值类）；如确因平台限制无法覆盖，必须在代码旁用中文注释说明原因与边界，并同步补充或评审 token。
  - 允许逐步收敛存量样式，但**新增或修改的代码必须遵守本规范**。
- 新增 / 调整 token 流程：
  1. 先在 `packages/theme/theme.css` 中查找是否已有可复用的语义 token；
  2. 若没有，新增通用 token（并补齐 line-height/配套 token），按分类放置；
  3. 在业务/组件中使用对应 Tailwind 语义类（`text-xxx`、`bg-xxx`、`rounded-xxx`、`h-xxx` 等）。

---

# 9. ESLint / Prettier（必须遵守）

1. ESLint 负责正确性与最佳实践；Prettier 负责格式化，避免规则冲突。
2. 禁用规则必须最小范围，并写中文原因；禁止整文件 `eslint-disable`（除非评审通过且在文件头说明边界）。
3. 建议根目录提供统一脚本（按需落地）：
   - `bun lint` / `bun lint:fix`
   - `bun format` / `bun format:check`
   - `bun typecheck`
   - `bun test`
4. **共享配置强约束**：`eslint/tsconfig/vite` 等工程配置必须集中封装为 `packages/*` 共享配置包（例如：`packages/eslint-config`、`packages/tsconfig`、`packages/vite-config`），`apps/*` 禁止复制粘贴独立维护同类配置；如确需例外，必须在 `openspec/` 记录原因、影响范围与回收计划。

---

# 10. 变更流程与危险操作确认机制（必须遵守）

## 10.1 变更最小闭环

- 改动清晰：能说明“为什么改、改了什么、影响什么”
- 可验证：至少通过 lint/类型检查/构建（或等价验证手段）
- 可回滚：避免把不相关改动混在一起

## 10.2 危险操作确认（强约束）

以下操作执行前必须先确认：

- 删除文件/目录或大规模目录调整
- 变更 Monorepo 包名/依赖边界/共享配置继承方式
- 批量替换 API、全局格式化、升级关键依赖
- 覆盖 git 历史（如 `git reset --hard`、强推）

建议确认模板（可复制使用）：

```text
危险操作检测
操作类型：xxx
影响范围：xxx
风险等级：低/中/高
潜在后果：xxx

请确认是否继续？（需明确回复：确认/继续）
```

## 10.3 开发流程与节奏（必须遵守）

1. **先理解问题与需求**：明确目标、边界条件、验收标准与风险点。
2. **再梳理架构与数据流**：先画清输入/输出/状态/变换（见第 0 章表格），避免边界不清导致返工。
3. **保持简单（KISS）与避免重复（DRY）**：优先用清晰可读的结构解决问题，避免晦涩技巧与复制粘贴。
4. **小步迭代**：把大需求拆成可独立交付的小变更，每次变更都形成最小闭环（见 `10.1`）。
5. **自动化测试优先**：新增/修改核心逻辑必须补测试（单元/集成择一），避免“未测试代码”长期累积风险。

## 10.4 Git 与版本控制（必须遵守）

- 禁止把代码只放在本地：任何有效进展必须进入 Git（提交或 PR），确保可追溯与可协作。
- 建议提交粒度小且聚焦：一个提交/PR 尽量只做一类改动（功能/修复/重构不要混在一起）。
- 变更前后应保证基本质量门禁通过：至少 `lint` + `typecheck`，涉及逻辑修改则补 `test`。

---

# 11. README.md 与文档维护（必须遵守）

目标：让新人在 **10 分钟内**完成本地启动；让变更可追溯、可复现、可协作。README 不是“百科全书”，而是**入口与操作手册**；深度设计与细节应沉淀到 `docs/` 或 `openspec/`，并由 README 链接出去。

## 11.1 README.md 必须包含的最小信息（强约束）

- 项目简介（1–3 句）与核心能力边界
- 技术栈概览（前端/后端/基础设施）
- Monorepo 上帝视角目录结构（`apps/*` 与 `packages/*` 的职责）
- 快速开始（依赖、安装、启动、访问地址）
- 常用脚本（`dev/build/test/lint/format/typecheck`）
- 环境变量（必填项、可选项、示例 `.env.example` 或示例片段）
- 本地依赖（DB/Redis/MQ/对象存储等）与启动方式（如 `docker compose`）
- 贡献入口（指向本仓库 `AGENTS.md` 与开发约定）

## 11.2 什么时候必须更新 README.md（强约束）

满足以下任一条件时，提交代码必须**同步更新 README**（或更新 README 指向的文档，并确保链接有效）：

- 新增/删除/重命名 `apps/*` 或 `packages/*`
- 升级关键依赖/工具链（如 `Vue/Vite/NestJS/TypeScript/Tailwind/ESLint/Bun`）并影响使用方式或约束
- 变更本地启动/构建/测试方式（包括根脚本、子项目脚本、Bun/Node 版本要求）
- 新增/删除/重命名关键环境变量，或变更其含义、默认值、是否必填
- 变更对外接口或对外行为（API base、鉴权方式、错误码契约、Webhook、MQ Topic/Queue 等）
- 引入/移除本地依赖（数据库/缓存/队列/对象存储）或改变初始化方式（迁移、seed、权限）
- 调整核心目录结构与模块边界（如 `modules` 组织、shared 拆包、依赖方向变化）

## 11.3 什么时候可以不更新 README.md（但需说明）（建议）

- 仅内部重构，且不影响：运行方式、对外接口、环境变量、目录边界
- 纯 UI/文案/样式变更，且不影响：启动与配置

若不更新 README，PR/提交说明必须包含一句：`文档：无需更新（原因：xxx）`。

## 11.4 降低手动成本：README 自动生成段落（建议）

为减少手工维护成本，README 允许存在“自动生成段落”，由脚本维护；人工仅维护非生成部分。

推荐标记（示例）：

```text
<!-- AUTO-GENERATED:START (scripts) -->
<!-- AUTO-GENERATED:END (scripts) -->
```

建议在根脚本提供（按需落地）：

- `bun docs:readme`：重新生成 README 的自动段落（如 scripts/workspaces/env 清单）
- `bun docs:check`：在 CI 中检查 README 自动段落是否与当前工程配置一致

> 如你需要，我可以下一步把 README 模板与上述脚本一起落地，做到“改配置→自动同步 README”。

---

# 12. Spec-Driven（可选但强烈推荐）

当需求较复杂（跨多个包/多个页面/涉及架构调整）时，建议采用 Spec-Driven 流程沉淀共识：

```text
草案 → 提案 → 对齐 → 实施 → 归档
```

推荐目录：

```text
openspec/
├── project.md
├── specs/
└── changes/
```

---

# 13. 可选：微服务 / Redis / 消息队列

> 本章仅在项目确实引入这些能力时适用；未使用则可忽略。

## 13.1 微服务（Microservices）

- 微服务的目标是：按业务边界（Bounded Context）拆分成可独立开发、独立部署、独立扩容的服务。
- 服务边界必须清晰：跨服务通信只能通过明确的 API/消息契约，禁止“跨库直连”或共享内部实现。
- 优先避免“分布式单体”：拆分带来复杂度（链路追踪、容错、数据一致性），必须有明确收益再拆。

## 13.2 Redis（缓存 / 内存数据库）

- 适用场景：缓存提升读性能、计数/限流、分布式锁、Session/短期状态、队列/延迟任务（按项目选型）。
- 基本原则：所有缓存都要有 TTL；缓存失效与回源策略要明确；避免把 Redis 当成唯一真实数据源。

## 13.3 消息队列（Message Queue, MQ）

- 适用场景：异步任务、解耦、削峰填谷、提升吞吐与稳定性。
- 约束：消息 Schema 必须可版本化；消费者必须幂等（见 `5.4`）；必须考虑重试与死信（DLQ）策略。
