# 工程日志

## 阶段 0：需求与工程基线（2026-10-23）

输入：课程附件和本次对话。仓库最初只有附件，无代码、无提交；私有远端已由前序操作创建并关联。

用户明确要求采用正规软件团队的开发记录与质量流程，并选择增加常见 SVG 兼容。基于此建立需求验收矩阵、四层架构、ADR 和发布门槛。所有代码、测试与文档由 Codex 实施；不存在外部审批。

实际环境：macOS，Node.js v26.7.0，npm 11.19.0。兼容目标为 Node.js 22/24，稍后由 CI 验证。

本阶段建立配置与文档，功能尚未实现。验证结果、提交与 Issue/PR 链接在实际发生后追加。

### 基线验证中的实际问题

- EXP-001：npm 安装发现 TypeScript 7.0.2 与 typescript-eslint 8.72.0 的 peer 范围（<6.1）不兼容。未使用强制安装，改选兼容的 TypeScript 6.0.x，并以锁文件固化。
- GitHub 连接器可识别账号，但对新私有仓库创建 Issue 返回 404。转用本机已授权的 gh CLI 维护该仓库，不更改隐私或权限。

基线本地验证：类型检查、ESLint、Prettier、架构测试和构建已通过（仅验证当前工程骨架，不代表功能完成）。Issue：[#1](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/issues/1)。

## 阶段 1：领域模型（2026-10-23）

实现 Shape/GeometryShape、六种图形、统一工厂与 SvgDocument；封装属性，使用多态复制和容器递归。分组以最近公共父级与原绘制顺序处理，拒绝祖先后代混选；附件要求根级容器不可解组。

实际检查：`npm run check` 通过，10 项测试（含架构检查）。覆盖所有叶子几何、白名单、数值拒绝、克隆隔离、id/环、分组/解组/归属/顺序。Code review：Codex 自查，无独立人工评审。工作项 #2。

### RISK-001：远端 CI 未启动

基线运行 39943255667 的两个 job 无执行步骤。GitHub check annotations 明确提示账户付款失败或消费额度需要提高。未修改账户账单或仓库可见性；远端 CI 不能标为通过。后续以本地 Node 22/24 全套检查补充可复现证据，发布报告披露此环境限制。

### BUG-001：编辑命令的异步失败契约

命令测试实际发现：EditCommand.execute 使用 Promise.resolve(session.edit(...))，参数求值时同步抛错，违反声明的 Promise 失败契约。改成 async 方法，由 Promise rejection 统一传递失败；保留测试以覆盖重复 id、未知属性和递归溢出。文档与历史原子性设计无需改变。

## 阶段 2：命令与历史（2026-10-23）

实现 19 条命令的独立类、CommandFactory、EditorSession、History 和持久化/展示端口。成功 IO 清除旧历史并设屏障，失败不修改会话；查询返回文档副本避免泄漏历史引用。

验证：`npm run check` 通过，26 项测试。所有编辑操作均检查执行→撤销→重做后的完整结构与属性一致；递归处理中途溢出、失败读写、失败编辑和新编辑清空 redo 均覆盖。BUG-001（#9）已修复并回归。自查：领域无 IO 依赖，命令按独立类实现。阶段工作项 #3；领域阶段已通过 PR #7 合并。

EXP-002：实际运行 XMLParser/XMLBuilder 探针，preserveOrder 保留 g 内文本与 rect 顺序；parseTagValue=false、trimValues=false 保留中文/前后空白，CDATA 与实体解码后正确合并；XMLBuilder 正确转义 & 和 <。后续转为持久化回归测试。

## 阶段 3：SVG 与文件持久化（2026-10-23）

实现有序 XML codec、显式 id 预扫描、六种图形共享工厂、样式继承与支持子集规范化、translate/正等比 scale/viewBox 映射。XML 使用紧凑输出，避免 pretty print 给 text 插入额外空白。原子保存先创建同目录唯一临时文件、写入并 sync，然后 rename；覆盖时保留权限。

实际测试注入 partial-write 和 rename 失败，原目标内容保持 original，目录无临时残留；实际测试缺失目录、只读目标、非法 SVG 与失败后 redo。自查还发现显式 font-size=inherit 不能直接交给数值解析，先移除原始 presentation 属性并从已解析样式重建，增加对应回归用例。

阶段检查：`npm run check` 通过，54 项测试。已覆盖全部图形顺序/实体/中文/空白往返、未来显式 id 冲突、嵌套变换和文字线宽、CSS 继承、box 降级，以及明确拒绝不支持特性。无第三方人工评审。工作项 #4，命令阶段 PR #10 已合并。

## 阶段 4：CLI 与附件集成验收（2026-10-23）

实现 Tokenizer、TreePresenter、CliController、Repl 和 Main 装配。交互终端提示 svg>；脚本无提示符，错误写 stderr、继续执行且最终退出 1，EOF 正常退出。解析保留中文、空字符串、引号/反斜线、#颜色和引号内 in。

实际验证：`npm run check` 通过，60 项测试。真实子进程直接从未改动附件提取第 6 节 19 条和第 6.1 节版本 A 14 条命令回放。前者产生附件预期两条错误并退出 1，demo.svg 包含 5 元素且 c1=130、标题已撤销；后者退出 0、保存 8 元素、节点移动已撤销、标签为“处理数据 v2”。示例脚本也经 npm run cli 实际执行生成文件。

展示测试检查树分支、内联属性、子树与父级明细；错误保持单行，解析失败不破坏 redo。无独立人工评审。工作项 #5；持久化阶段 PR #11 已合并。

### 工作流调整（用户指示）

用户要求后续先在本地开发、分步提交，完成后再集中推送；此后阶段保留本地提交与记录，不再逐次推送。已有远端 PR/历史保留。

## 阶段 5：发布前实验与自查（2026-10-23）

- 实际 PTY 运行 npm run cli，检查 init、中文 text、tree、undo/redo、重复 svg> 提示和 Ctrl-D 正常退出。
- EXP-003：实际快照基准（7 次 clone 取中位，20 次编辑并保留历史，完整撤销/重做断言），100/1000/10000 图形编辑平均约 0.24/1.50/15.18 ms，20 次历史堆增长约 1.22/11.15/108.39 MiB。原始结果 evidence/benchmark.json；不视为 SLA。
- EXP-004：Browser 技能启动受工具环境限制而失败，尚未选中浏览器。依据可用本地 Chrome CLI，使用独立临时 profile 渲染原 SVG、规范化 SVG 和流程图；由 Codex 直接查看截图。原/规范化 PNG 字节完全相同（3814 字节），见 evidence/visual-diff.json。没有读取用户浏览器 profile。
- PlantUML 源最初单行 package 成员写法经真正渲染发现语法错误，改为多行声明；在线 PlantUML 成功生成 architecture.svg（保留 architecture.puml 可复现）。本地未安装 Java，因此没有声称本地 Java 渲染通过。
- 导入边界探针发现 BUG-002/003，修复及回归见 defects.md；另补全 SVG transform 列表逗号分隔，保存覆盖符号链接明确拒绝，避免替换链接本身。
- 初步 Node 22.23.4 全套 60 项检查通过；修复完成后将按最终提交重新进行干净检出 Node 22/24 验证并保存日志。

### 干净检出与交付整理

ReleaseCheck 从本地提交 1941abbbafe55964d2a9568bec9f6876fedf849a 创建全新 clone，npm ci 后在 Node 22.23.4 与 24.22.1 都通过 63 项测试、类型/规范/格式/构建及编译入口冒烟；未跳过测试。原始安装和两运行时日志提交到 evidence。

完成根 README 与可独立阅读的课程 doc/README（包含原始需求地址、完整架构/PlantUML、模式、变化点、过程、自查、实际质量证据）、追踪矩阵、验证和发布复盘。AGENTS/CONTRIBUTING 固化后续开发要求。所有功能缺陷已修复，外部 CI 账户风险保持开放。最后仅补文档与证据，发布通过 final 注解标签定位实际提交，不内嵌文档自身哈希。

## 阶段 6：发布后实时预览（2026-10-27）

用户要求提交当前版本、打标签后开分支实现实时预览。实际核对：工作区干净，远端 main 与本地同为 1d6b3fd，远端 final 已指向该提交；无需空提交或重打标签。由 final 创建 feat/live-preview，保留课程版本。先记录 REQ-15、ADR-006 和验收计划，选择只读本机浏览器预览，随后分步实现、验证和集中推送。当前无独立评审人员。
