# 发布与复盘

## 课程 0.1.0 历史交付定位

项目：高级软件开发技术 Lab1 Phase 1，版本 0.1.0。

仓库：<https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor>（现已公开；首次发布时为私有）。课程交付定位为注解标签 `final`，发布 SHA 和实际验证摘要写入标签消息。执行 `git show final` 和 `git rev-parse final^{commit}` 可核对。

验证候选：`1941abbbafe55964d2a9568bec9f6876fedf849a`；生产代码和测试的最终 tree 必须与该候选一致。托管 CI 账户环境限制仍存在，按 ADR-005 披露并采用干净检出的本地 Node 22/24 通过证据。

## 交付清单

- 六种图形、19 条命令、嵌套 Composite、Command/Memento 历史、错误原子性。
- SVG 有序读写、自动 id、常见变换与文字样式规范化、原子文件保存。
- 63 项自动测试、架构约束检查、真实附件回放和编译入口冒烟。
- 需求矩阵、架构与 PlantUML 图、ADR、缺陷、工程日志、验证报告、原始日志/截图、复盘和开发约定。
- 可直接上传的 `doc/README.md`（包含仓库地址），安装说明、示例脚本和 SVG。

## 验收结论

本地功能和工程检查通过，干净克隆 npm ci 后 Node 22.23.4、24.22.1 全套通过。变换样例渲染前后 PNG 完全一致，流程图中文/颜色/连接正常。npm audit 本次报告已知漏洞 0。实际证据均在 verification.md 和 evidence 中。

远端环境不在本地结论内：GitHub 托管 CI 没有启动，RISK-001 保持开放。首次发布时仓库为私有，当时需由所有者授予评分访问权限，未擅自邀请任何人。2026-10-28 所有者已改为公开，此授权步骤不再需要。

## 复盘

### 有效的做法

- 从附件建立可验收条目并保留原文，让结构、错误和历史语义有明确基线。
- 先领域后用例、再 IO 和 CLI，使树与历史错误能够在无需终端或真实文件时定位。
- 用实际安装、故障注入、附件回放和渲染证据验证假设，发现工具链兼容、异步契约、实体及默认值问题。
- 清楚标明 AI 自查与外部验证的边界，记录 CI 阻塞和用户要求的工作流调整。

### 需要改进与后续工作

| 编号       | 事项               | 触发条件与处理方向                                                                                |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| RISK-001   | 托管 CI 账户阻塞   | 账号所有者恢复账单/额度后重跑，补充 Linux 证据；不把本地结果伪装为远端成功                        |
| TECH-01    | 两处固定名称注册表 | 后续正式插件阶段再引入注册协议与 box provider，避免首版提前加载插件                               |
| TECH-02    | 快照历史内存       | 大文档/长历史成为真实需求时采用增量命令或持久化结构；以当前 10000 图形/20 次历史约 108 MiB 为基线 |
| TECH-03    | SVG 兼容范围       | 新特性须先补验收样例与失败策略，再扩展 codec；保持不静默丢失                                      |
| PROCESS-01 | 独立人工评审       | 有第二位工程师参与时补正式评审；本次不虚构审批                                                    |

问题表不是对本阶段需求的隐瞒：REQ-01～14 均有实现或流程证据，范围以附件和用户明确扩展为准。final 发布后不移动标签；后续修改使用新提交/版本。

## 发布后扩展：feat/live-preview

2026-10-27 新增本机浏览器实时预览；开发期间课程 final/main 基线不移动。按本地计划、实现、验收归档分步提交，完成后集中推送功能分支。当时尚未合并 main，也未替换课程交付标签；后续 v0.2.0 冻结流程见下。具体候选代码、68 项回归、Node 22/24 干净检出和真实 Chrome 结果见 [扩展报告](extensions/live-preview.md)。

同一功能分支的后续 clear 提交：824b04a。增加仅清理终端显示的 clear，71 项测试和 Node 22/24 干净检出通过，另存 evidence/cli-clear；详情见 [clear 报告](extensions/cli-clear.md)。课程 final 不变；当时功能分支尚未合并 main。

## v0.2.0 冻结发布（2026-10-27）

用户实际试用后认可实时预览与 clear，明确授权提交、集中推送、合并功能分支到 main 并打标签冻结。版本号由 0.1.0 升到 0.2.0，更新 package.json/锁文件根包/CLI Version；没有新增依赖。变更说明见 [CHANGELOG](../../CHANGELOG.md)。

发布范围：REQ-15 本机只读浏览器实时预览、REQ-16 仅清屏 clear，以及相应架构/缺陷/测试/验收证据。课程 final 固定 1d6b3fd，新版本使用独立注解标签 v0.2.0。通过 PR #14 合并，保留逐步提交；不 squash/rebase 或改写已发布历史。候选验证完成后再合并和打标签，实际冻结提交以 git show v0.2.0 与 PR 合并记录为准。

当前托管限制经再次核实：Actions 运行 40533683607 的 Node 22/24 jobs 无执行步骤，check annotations 仍提示付款失败/消费额度限制。RISK-001 未解决，使用 ADR-005 本地交叉版本门槛，不声明 CI 成功。用户 preview-test.svg 不纳入版本。

本次版本候选：`d6209fa14d3825a4090edc12c0e5ef6a1b2df70e`。全新本地 clone，npm ci 后 Node 22.23.4/24.22.1 均通过 check（71/71）、普通/预览编译入口冒烟；四份编译入口日志的启动版本均为 0.2.0。证据在 [evidence/v0.2.0/clean-checkout.json](evidence/v0.2.0/clean-checkout.json) 与同目录完整日志；托管任务无 steps 和账户拒绝的原始响应也归档。之前的课程、预览和 clear 证据保留。

合并与标签前核对最终源码、测试、脚本、配置/锁文件与候选完全相同，仅新增验收文档/证据；不重复声称未实际运行的测试。冻结版本查看 [v0.2.0](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/tree/v0.2.0)，合并记录查看 [PR #14](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/pull/14)。注解标签记载实际 main 提交，不在本文件中嵌入自身哈希。

## v0.2.1：公开仓库说明与交付文件整理（2026-10-28）

远端经 GitHub API 核实为 PUBLIC。更新根 README、课程提交 README 和当前访问说明；历史私有阶段的记录仍保留。修正需求矩阵将“私有远端”写为硬性作业要求的错误，原始附件不改。补充忽略本地测试 SVG、环境文件变体及包管理器调试日志；实际删除根目录 .DS_Store。源码/测试/锁文件/示例/工程证据保留，node_modules/dist 本地保留但不上传；细目见 [公开发布检查记录](publication-audit.md)。

版本同步为 0.2.1。课程 final 和 v0.2.0 保持原提交，新增 v0.2.1 用于冻结本次维护。验证结果在实际完成后归档，不以公开可见性推断 CI 已恢复。

公开后恢复验证：实际 workflow_dispatch 运行 [40622461090](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/actions/runs/40622461090) 对此前 main 提交 db0b43f 执行 Ubuntu 托管 Node 22/24，两任务的 npm ci / npm run check 步骤均成功，原始 [运行响应](evidence/v0.2.1/public-ci-baseline.json) 已归档。RISK-001 对当前公开仓库不再阻塞；没有检查或修改账号账单，不能据此认定私有仓库额度已恢复。此结果不冒充 v0.2.1 新提交的托管结果，最终发布提交的自动 CI 将单独核对。
