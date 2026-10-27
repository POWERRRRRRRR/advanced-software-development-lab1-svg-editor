# 需求与验收矩阵

基线：`phase_cli_1.md`，2026-10-23。原文保持不变。下面的实现路径均相对 src，测试均相对 tests；正式发布定位为 final 标签。

| ID     | 来源             | 验收条件                                             | 实现位置                                               | 验证证据                                   | 状态                     |
| ------ | ---------------- | ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------ |
| REQ-01 | §2、§6           | REPL、双引号、整行注释、中文、EOF 和错误后继续       | adapters/cli                                           | cli.test.ts                                | 完成                     |
| REQ-02 | §3 文档类        | init/read/save/canvas、默认画布、路径绑定和原子保存  | application/commands + adapters/files                  | commands.test.ts、svg.test.ts              | 完成                     |
| REQ-03 | §4.1             | 六种图形、可选颜色、in 归属、未知类型拒绝            | domain/ShapeFactory + CreateCommand                    | domain.test.ts、commands.test.ts           | 完成                     |
| REQ-04 | §3、§4.1         | delete/move/scale/set、几何白名单、容器统一操作      | domain + application/commands                          | domain.test.ts、commands.test.ts           | 完成                     |
| REQ-05 | §3、§4.2         | group/ungroup/addto/front/back、顺序和环检查         | domain/SvgDocument                                     | domain.test.ts、commands.test.ts           | 完成                     |
| REQ-06 | §4.3             | 命令级历史、新编辑清空 redo、IO 屏障、失败不影响历史 | application/EditCommand、History、EditorSession        | commands.test.ts、svg.test.ts              | 完成                     |
| REQ-07 | §5               | tree 内联属性/子树、show 父级明细、help              | TreePresenter + commands                               | cli.test.ts                                | 完成                     |
| REQ-08 | §2、§4.2         | 唯一大小写敏感 id、缺失 id 警告且避开未来显式 id     | SvgDocument + SvgCodec                                 | domain.test.ts、svg.test.ts                | 完成                     |
| REQ-09 | §2、§4.2         | error 单行、失败不改变文档/路径/历史                 | CliController + EditorSession + FileDocumentRepository | commands.test.ts、svg.test.ts、cli.test.ts | 完成                     |
| REQ-10 | §2.1             | 封装、多态、一类一文件、两处名称分派                 | 四层 src                                               | architecture.test.ts + 源码自查            | 完成                     |
| REQ-11 | §1.2             | 架构、图、模式、依赖、变化点、过程和一致性自查       | doc/README.md + engineering                            | 本文件与架构图渲染                         | 完成                     |
| REQ-12 | §1.1             | 分步历史、私有远端、截止前 final                     | Git 历史与注解标签                                     | 发布阶段创建并推送 final；标签消息记录 SHA | 完成（发布定位见 final） |
| REQ-13 | 用户确认         | 平移/正等比缩放/继承/文字样式/viewBox                | adapters/svg                                           | svg.test.ts + 变换前后 PNG 字节一致        | 完成                     |
| REQ-14 | 用户工程流程要求 | 需求、ADR、实验、缺陷、评审、CI 状态、发布证据       | doc/engineering + CONTRIBUTING + scripts               | 工程记录、PR #7/#10/#11/#12、验证原始日志  | 完成                     |

## 验证版本与提交

候选代码提交：`1941abbbafe55964d2a9568bec9f6876fedf849a`。本地干净克隆中 npm ci 后，Node 22.23.4 与 24.22.1 均完成 63 项测试、类型/规范/格式检查、构建和编译产物冒烟。原始结果见 evidence/clean-checkout.json 与 node-22.log、node-24.log。

托管 CI 因账户账单/额度未启动，RISK-001 保持开放；此限制不被写成 CI 通过。ADR-005 记录替代门槛。需求完成不代表远端环境阻塞已解除。

## 已确定的歧义处理

- `help`、空行和注释无需当前文档。`canvas` 无参数是查询，不设 IO 屏障。
- init 省略宽高时各用默认值；canvas 修改必须给齐宽高。
- group 使用最近公共父级，按原文档先序/绘制顺序收编，在最早选中分支位置插入。重复目标或同时选择祖先后代被拒绝。
- front 对应同级数组末尾（最后绘制），back 对应开头。
- 成功 IO 清空旧历史并锁定；失败 IO 不影响任何会话状态。
- 保存到显式路径后绑定该路径；init 无绑定路径，首次 save 必须给路径。
- 仅首个非空字符为 # 的整行是注释；颜色 # 和引号内 in 均保留。
- 不支持的可绘制 SVG 特性报错，绝不静默丢失。box 标记可降级 g，仍不允许 create box。
- CLI scale 按附件仅缩放几何值；导入 SVG transform 同时缩放线宽和字号以保留外观。
- 脚本回放继续处理错误，存在错误时最终退出码非零；EOF 正常退出，Ctrl-C 结束交互。

- 保存目标必须为普通可写文件或新路径；拒绝符号链接，防止原子重命名替换链接本身。
- 外部 ellipse 单独提供 rx 或 ry 时，另一半径遵循 SVG 默认值回退。

## 发布后扩展（不改变 final 课程基线）

| ID     | 来源                              | 验收条件                                                                            | 实现/验证                                                                                       | 状态                                |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| REQ-15 | 用户：浏览器实时查看，无需先 save | 内存画面自动更新、失败/查询不改状态、历史与路径不受预览影响、本机只读服务、退出清理 | EditorSession、adapters/preview、Main；preview.test.ts + [扩展报告](extensions/live-preview.md) | 完成（68 项检查与实际 Chrome 验收） |

### REQ-16：终端 clear（用户新增）

`clear` 无参数，仅清理交互终端显示并重新显示 svg>；无需文档。不改图形、路径、revision、undo/redo 或 IO 屏障，不停止预览。额外参数失败且不清屏；脚本/重定向模式不输出 ANSI 清屏码。保留命令名称在 CommandFactory 唯一分派，具体清屏 IO 在 Repl。实现与验收结果见 [clear 扩展报告](extensions/cli-clear.md)；完成：71 项测试、Node 22/24 干净检出与实际 PTY/HTTP 检查通过。

## 扩展冻结版本

REQ-15/16 随 v0.2.0 发布，用户已实际试用并于 2026-10-27 明确授权合并和打新标签。课程 REQ-12 的 final 不移动；新版本候选验证、合并与注解标签定位见 [发布记录](release.md)。

v0.2.0 候选 d6209fa 在 Node 22/24 干净检出通过 71 项检查及编译入口；[原始版本证据](evidence/v0.2.0/clean-checkout.json) 与先前功能验证分别保留。实际冻结 SHA 由 v0.2.0 注解标签记录。
