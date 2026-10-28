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

### 实现与首轮验收

新增 EditorSession 只读文档版本、PreviewServer/PreviewPage 和 --preview 启动装配；默认 CLI 不启动 HTTP。新增 5 项集成测试（总计 68），覆盖内存变更、读入、失败/查询/预览对路径历史的隔离、并发请求、304 缓存、只读/跨站边界、编码故障隔离、真实进程 EOF 清理。首轮 npm run check 通过。随后真实 Chrome 打开发现 BUG-004，修复并补 HTTP 回归；最终全套检查结果另记。

真实 PTY + Chrome：空画布提示正确；未执行 save，创建中文/矩形/圆，页面自动显示 800×480 / 5 元素 / 版本 8。move 后版本 9、rect x=180；undo 后版本 10、x=80；失败 move missing 后 redo 成功、版本 11、x=180。切换原尺寸按钮状态正确。Ctrl-C 后进程退出，页面显示断线提示。截图 evidence/live-preview.jpg 为实际浏览器截图。未做独立人工评审，不声称 Safari/Firefox 或 Linux 已验证。

### 最终干净检出验证与自查

从实现提交 216945367ec5e35af4b5f2cd538b3dd58def8ad4 建立独立本地 clone；npm ci 后，Node 22.23.4、24.22.1 的 npm run check 各自通过 68/68 测试、类型/规范/格式/构建，普通及 --preview 编译入口均退出 0。新增 RELEASE_EVIDENCE_DIR 参数将完整安装/检查/冒烟日志归档于 evidence/live-preview，保留 final 历史证据。安装产生依赖安装脚本 allowScripts 提示，但安装与实际构建/检查均成功；没有全局修改安装策略。

完成源码自查：核心依赖约束保持、预览只读、失败渲染隔离、条件请求缓存、退出释放端口；phase_cli_1.md 未修改。没有第二人独立评审。课程 main/final 保持 1d6b3fd；扩展按计划/实现/验收文档分步提交后集中推送。

## 阶段 7：终端 clear（2026-10-27）

用户认可实时预览，要求提交功能并增加仅清理 CLI 显示的 clear。核对实时预览 b526bf8 已与远端一致、草稿 PR #14 已存在；不作空提交。用户手工测试产生 preview-test.svg，保留且不纳入开发提交。REQ-16/ADR-007 定义零参数显示意图，通过命令工厂与多态衔接至 Repl，不操作会话文档或历史；在当前功能分支独立实现、检查后集中推送。

新增 ClearCommand、显示意图传递与交互 Repl 清屏，help 自动包含命令。增加 3 项测试，全套 npm run check 通过 71/71。真实编译入口 PTY 测得 clear 输出清屏序列并重显 svg>；HTTP 预览响应字节不变（revision=4），随后 redo 成功恢复 x=150；clear extra 没有清屏序列，EOF 正常退出。相关需求、ADR、缺陷边界说明、架构与 README 同步更新，无独立人工评审。下一步用候选提交复跑 Node 22/24 干净检出并保存独立证据。

候选 824b04abafc9c5ea2d9b5e39f69eaa6d2576c96b 的独立干净 clone 已在 Node 22.23.4/24.22.1 完成 check（各 71/71）和普通/预览编译入口冒烟。日志保存在 evidence/cli-clear，既有证据不覆盖。最终仅归档文档和证据，再集中推送当前功能分支，并更新草稿 PR #14 的描述以覆盖预览与 clear。main/final 保留，未将用户 preview-test.svg 加入提交，未声称远端 CI 通过。

## 阶段 8：v0.2.0 合并与冻结（2026-10-27）

用户完成手工试用并明确要求推送、将 feat/live-preview 合并 main、创建新标签冻结。核对分支 7651ca0 与远端一致；PR #14 为可合并草稿；main/final 为 1d6b3fd。再次查询最新远端运行 40533683607：Node 22/24 均无 steps，annotations 为账单/额度阻塞。采用既定 ADR-005 本地门槛。先同步 0.2.0 版本、变更记录与发布说明，提交候选并重新运行干净检出验证，再合并与打 v0.2.0。用户 preview-test.svg 保留且不提交，无独立人工代码评审。

候选 d6209fa 的全新本地 clone 已完成 npm ci、Node 22.23.4/24.22.1 全套 check（各 71/71）与普通/预览编译入口冒烟；实际启动输出均为 0.2.0。归档 evidence/v0.2.0，未覆盖历史证据。此次末次提交仅归档验证和发布记录；按用户明确授权将 PR #14 转为可合并状态、保留历史合入 main，再以注解标签 v0.2.0 记录实际冻结提交。发布状态以远端 PR/标签为准。

## 阶段 9：公开仓库交付整理（2026-10-28）

用户已将远端设为 public，授权本地文件审查、修正文档、提交/新标签后推送。实际 API visibility=PUBLIC；起始 main 与 origin/main 同步于 db0b43f，工作区无未提交文件，之前的 preview-test.svg 已不在本地。对 140 个跟踪文件和所有引用可达历史的 215 个唯一 blob 作文件名及常见凭据模式检查，未发现匹配项；此为限定模式检查，不宣称完整安全审计。跟踪文件无 node_modules/dist/.env/私钥/临时文件。根目录 .DS_Store 为可删除系统缓存，已删除；node_modules/dist 保留本地并忽略，历史验收日志/截图/示例保留。修正 DOC-001、记录 REQ-17/ADR-009，以 docs/public-release 分支分步提交 v0.2.1。公开后的 CI 需实际触发验证，不能凭可见性推断恢复。

实际补充检查：10 项本地输出/环境路径应被忽略、7 项源码/示例/验收日志应保留，git check-ignore 均符合预期；所有当前 Markdown 本地链接可解析，附件与 final 字节相同，npm run check 通过 71/71。首次格式化调用显式传入 .gitignore 被 Prettier 报无解析器；文件为纯文本规则，随后通过 Git 原生忽略检查验证，不将该工具参数错误当作程序缺陷。

公开后手动触发运行 40622461090，实际对 db0b43f 的 Ubuntu/Node 22、24 执行 npm ci/check 且成功；记录完整 jobs/steps 响应。更新当前 AGENTS/README 状态，保留原私有阶段失败证据，不声称账单已修复或把旧提交的 CI 当作 v0.2.1 检查。本次最终发布提交推送后将核对它自己的自动 CI。
