# 验证计划与实际报告

日期：2026-10-23。执行者：Codex；方式为实现者自查、自动断言、实际 CLI/文件实验和直接查看渲染图，不包含独立人工审批。

## 验证版本与结果

候选提交：`1941abbbafe55964d2a9568bec9f6876fedf849a`。ReleaseCheck 从该提交创建全新本地 Git 克隆，在克隆内 npm ci，然后执行全套检查与编译入口冒烟。

| 环境                               | 安装                   | 类型/规范/格式 | 测试               | 构建与编译 CLI   |
| ---------------------------------- | ---------------------- | -------------- | ------------------ | ---------------- |
| macOS arm64 / Node 22.23.4         | npm ci 成功            | 通过           | 63/63 通过，无跳过 | 通过             |
| 同一干净检出 / Node 24.22.1        | 使用同一锁文件安装结果 | 通过           | 63/63 通过，无跳过 | 通过             |
| 开发环境 Node 26.7.0               | 锁文件依赖             | 通过           | 63/63 通过         | 通过             |
| GitHub-hosted Ubuntu / Node 22、24 | 未执行                 | 未执行         | 未执行             | 账户阻止任务启动 |

证据：[干净检出元数据](evidence/clean-checkout.json)、[安装日志](evidence/install.log)、[Node 22](evidence/node-22.log)、[Node 24](evidence/node-24.log)、[编译入口 22](evidence/node-22-compiled.log)、[编译入口 24](evidence/node-24-compiled.log)。

验证的生产源码 tree：`a3e8b6a1af74abcb0b649a46adc416c2a44957ba`；测试 tree：`f05a7833343a77bdb2532429df676204db80c609`。发布最后的文档/证据提交不改变这两棵 tree；final 注解消息记录实际发布 SHA。这样验证结果可对应到真实代码，不在文档中尝试嵌入自身提交哈希。

## 测试范围与失败实验

| 层次 | 实际场景                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 领域 | 五类叶子与容器，位置/尺寸、白名单、数字/半径、唯一 id、父子关系、循环、LCA 分组、绘制顺序、克隆隔离                                    |
| 命令 | 全部编辑类型 execute/undo/redo 后完整树与属性一致，递归中途溢出回滚，IO 屏障、失败 IO 保留 redo、新编辑清空 redo、查询不入历史         |
| SVG  | 顺序与层级、中文/空白/实体/CDATA、缺 id 及未来显式 id、嵌套变换和 viewBox、行内/继承样式、字号与线宽、ellipse 默认半径、不支持特性拒绝 |
| 文件 | 同目录原子覆盖、权限保留、缺失路径、只读目标；注入部分写入/rename 失败，断言原文件 unchanged 且无临时残留；拒绝覆盖符号链接            |
| CLI  | 真实进程提取并回放附件两个会话，检查 stderr、退出码与 SVG 内容；空字符串、转义、#颜色、quoted in、带空格路径与错误继续                 |
| 架构 | AST 检查生产依赖方向、类名/文件名、一类一文件、无 switch 与过程式自由函数；人工复核仅两处类型/命令名称分派                             |

缺陷 BUG-001/002/003 的复现、原因与回归保存在 [defects.md](defects.md)，没有删除失败测试掩盖问题。

## 真实交互与视觉验收

实际 PTY 输入 init、中文 text、tree、undo、redo，再 Ctrl-D，提示符与退出正常。

Browser 技能启动因工具运行环境限制失败，尚未选中浏览器；改用已安装 Chrome 155.0.8059.86 的 headless CLI，以独立临时 profile 渲染。截图由 Codex 直接查看：

- [流程图](evidence/flowchart.png)：蓝/橙节点、中文和连线正常，节点移动已撤销，右侧标签为“处理数据 v2”。
- [原始变换](evidence/transforms.png)与[规范化变换](evidence/transforms-normalized.png)：截图 PNG 字节完全相同（3814 字节），即像素完全一致；[比较记录](evidence/visual-diff.json)。
- [组件图](evidence/architecture.png)：645×626 的 PlantUML 图完整可读；图源和渲染 SVG 一并保留。

[视觉环境记录](evidence/visual.json)。`npm run visual:check` 可复现；该步骤需要本地 Chrome，不作为无浏览器环境下 npm run check 的隐式依赖。

## 性能实验 EXP-003

命令：`npm run benchmark -- doc/engineering/evidence/benchmark.json`。Node 26.7.0/macOS arm64；每组 7 次 clone（未丢弃 warm-up），20 次编辑保留历史，显式 GC 后读取堆增量，并断言 20 次 undo/redo 恢复正确。

| 图形数（另含 scene 容器） | clone 中位 ms | 编辑平均 ms | undo 平均 ms | redo 平均 ms | 20 次历史堆增长 MiB |
| ------------------------- | ------------- | ----------- | ------------ | ------------ | ------------------- |
| 100                       | 0.32          | 0.24        | 0.13         | 0.13         | 1.22                |
| 1000                      | 1.07          | 1.50        | 0.98         | 0.93         | 11.15               |
| 10000                     | 10.89         | 15.18       | 10.16        | 10.14        | 108.39              |

[原始 JSON](evidence/benchmark.json)。这是一次本机实验而非性能 SLA；快照每条历史 O(n) 空间，长历史的内存开销作为 TECH-02 公开记录。

## 依赖检查与外部限制

本次 `npm audit --json` 已知漏洞 total=0，[原始结果](evidence/audit.json)。依赖锁文件随代码提交；审计只是当前记录，不代表未来永远没有漏洞。

RISK-001：[托管运行 39943255667](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/actions/runs/39943255667) 的 check annotations 提示账户付款失败或消费额度限制，两个任务没有执行步骤。没有改账单、仓库可见性或声称 CI 通过。ADR-005 规定本次用实际本地交叉版本证据替代，账户恢复后可重跑 workflow_dispatch。Linux 托管执行仍未验证。

## 已知边界

支持子集和歧义处理以需求矩阵为准。未实现旋转/非等比缩放/path/tspan/外部 CSS/相对长度/非默认 preserveAspectRatio 等；遇到相关输入明确失败。保存目标符号链接拒绝。快照与递归树未承诺任意规模、无限历史或任意深度。未做多人协同、插件加载或 GUI 验收，因为不属于本阶段。

## 发布后实时预览扩展验证（2026-10-27）

以上 63 项与既有 evidence 文件保留为 final 基线证据。feat/live-preview 候选提交 216945367ec5e35af4b5f2cd538b3dd58def8ad4 新增 5 项集成测试，Node 22.23.4 / 24.22.1 干净检出均通过全部 68 项及编译预览入口冒烟；真实 Chrome 检查无需 save 的显示、移动、undo/redo、尺寸切换、退出断线。独立证据目录 [evidence/live-preview](evidence/live-preview/clean-checkout.json)，完整 [扩展验收报告](extensions/live-preview.md)。不替换课程 final，不声称托管 CI 或未验证浏览器通过。

## clear 扩展验证（2026-10-27）

候选 824b04abafc9c5ea2d9b5e39f69eaa6d2576c96b 新增 3 项 clear 行为测试，总计 71 项。Node 22.23.4/24.22.1 在独立干净 clone 中全部通过 check 与编译入口冒烟；实际 PTY 清屏后 HTTP 预览响应字节相同，redo 正常、额外参数失败不清屏。详见 [clear 报告](extensions/cli-clear.md) 和 [原始运行汇总](evidence/cli-clear/clean-checkout.json)。本次无新增独立人工评审或托管 CI 成功结论。
