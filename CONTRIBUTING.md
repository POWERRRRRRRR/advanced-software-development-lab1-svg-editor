# 开发流程

## 开始工作

先读原始附件、需求矩阵、架构、ADR 与当前缺陷/风险；工作项必须能说明输入、目标、验收条件和受影响模块。通过事实调查解决可从仓库查明的问题，重要需求歧义写入决策记录。

## 实现与变更

使用短期分支和清晰的分步提交（feat/fix/test/docs/chore）。按用户最新指示，先本地推进，阶段完成后集中推送。PR 说明问题、结果、需求编号、实际检查和限制；不将自查写成独立人工审批。当前项目没有第二名工程师参与评审。

领域层不依赖 Node、文件或 XML 库；命令操作草稿后提交。只读 DTO 用于边界传输，不能把领域类退化为数据袋。保持一类一文件和多态，不增加类型/命令的散落分派。

## 完成标准

- 需求矩阵可追溯至实现、测试和提交。
- 重要行为或错误修复有有意义的断言和回归用例。
- `npm run check` 通过；设计变化、实验、缺陷和限制已记录。
- 没有意外文件、凭据、生成目录或未解释的依赖方向变化。
- 远端 CI 账户阻塞时，明确记录并在干净检出中本地运行相同检查，不伪造绿灯。

## 发布

```sh
npm ci
npm run check
npm run benchmark
# 本机安装 Chrome 时，CHROME_BIN 可指定其可执行路径
npm run visual:check
# 参数是实际 Node 22/24 可执行文件绝对路径
npm run release:check -- /path/to/node22 /path/to/node24
```

ReleaseCheck 从当前 HEAD 创建干净本地克隆，npm ci 后执行两版本全套检查与编译产物冒烟，日志输出到 doc/engineering/evidence。VisualCheck 使用全新临时 Chrome profile，保存截图并比较变换前后 PNG 字节；不访问个人浏览器数据。

首次课程发布创建注解标签 final。后续发布核对报告、最终提交和交付物，合并功能分支至 main，再创建并推送新的版本标签（例如 v0.2.0）。同步 package.json、package-lock.json 根包和 Version.ts 的版本号。标签消息记录实际发布 SHA 和验证摘要。final 是课程交付标记；已发布的 final 和版本标签都不移动，后续修改使用新提交和新版本。

## 工具与依据

- [Node.js 测试框架](https://nodejs.org/docs/latest-v22.x/api/test.html)
- [Fast XML Parser](https://github.com/NaturalIntelligence/fast-xml-parser)：节点顺序、实体与 CDATA 的行为必须通过本项目回归验证。
- [PlantUML 编码](https://plantuml.com/text-encoding)：architecture.puml 是图源；可用 PlantUML 本地重新生成 SVG。本次本机无 Java，图源经在线渲染验证。

发布后扩展使用 `RELEASE_EVIDENCE_DIR=doc/engineering/evidence/<feature>` 运行 release:check，将新的干净检出日志放入独立目录，避免覆盖 final 的原始验收证据。当前脚本同时检查普通和 --preview 编译入口。
