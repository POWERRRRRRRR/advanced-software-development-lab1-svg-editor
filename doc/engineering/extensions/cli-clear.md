# CLI clear 扩展（REQ-16）

2026-10-27。实时预览已提交并推送至 feat/live-preview（b526bf8）；本次在同一分支单独提交 clear。保留 main/final，不改用户测试生成的 preview-test.svg。

## 行为与验收计划

- 在 svg> 输入 clear：只清理终端显示并返回提示符，未 init/read 时也可用。
- 不访问文档、不读写文件、不变更绑定路径/revision/撤销重做栈/IO 屏障，浏览器预览内容不变。
- clear extra 报参数错误且不清屏；脚本回放及输出重定向不输出清屏控制码。
- CommandFactory 是唯一命令名称分派处；ClearCommand 通过纯显示意图与适配器交互，应用核心无终端 IO。
- 自动检查控制器状态隔离、HTTP 预览不变、交互 REPL 清屏与继续输入、脚本日志不受污染。真实 PTY 验证清屏、提示符、undo/redo；执行 npm run check 与 Node 22/24 干净检出检查。

## 验证结果

- npm run check 通过：71/71 测试、类型/ESLint/格式检查及构建。
- tests/clear.test.ts 新增 3 项行为测试：无文档调用、重复 clear、参数错误、完整 SVG/版本/保存文件/绑定路径不变、IO 屏障保留、undo/redo 保留、HTTP 预览逐字相同、交互清屏后继续输入、真实脚本输出不含 ANSI。
- 实际编译入口 PTY + HTTP：init 400 300、创建蓝色 card、move/undo 后，预览 revision=4、x=50；clear 输出清屏序列和 svg>，HTTP 响应与清屏前字节一致；redo/show 后 x=150；clear extra 报参数错误且没有清屏序列；EOF 退出 0。
- 自查实际 diff：没有 EditorSession/领域/预览实现改动，显示意图由多态获取，唯一命令名注册仍在工厂。没有独立人工评审。各终端对回滚区擦除的支持可能不同；没有声称所有终端模拟器的滚动记录都已验证。
- Node 22/24 干净检出检查待候选提交后执行，结果与原始日志随后追加。
