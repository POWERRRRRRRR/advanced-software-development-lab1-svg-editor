# 高级软件开发技术 · Lab1 SVG 编辑器

TypeScript 面向对象 SVG 命令行编辑器，提供六种图形、嵌套容器、全部编辑命令、撤销重做、真实 SVG 读写和常见 SVG 导入规范化。

仓库：<https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor>（公开，无需邀请即可查看）。当前发行版本：`v0.2.1`（公开仓库说明与交付文件整理）。课程交付仍定位于 `final` 标签（0.1.0），标签保持不变。

## 安装运行

要求 Node.js **22.13+**，建议 Node.js 24。

```sh
npm ci
npm run cli
```

```text
svg> init 800 600
svg> create g scene
svg> create rect r1 20 30 160 60 #4a90d9 in scene
svg> create text label 40 65 "开始" in scene
svg> move scene 30 0
svg> undo
svg> tree
svg> save demo.svg
```

Ctrl-D（EOF）或 Ctrl-C 结束交互。SVG 可直接在浏览器打开。

```sh
# 回放两节点流程图，保存 flowchart.svg
npm run cli < examples/flowchart.commands
# 编译后运行
npm run build
npm start
```

## 浏览器实时预览（发布后扩展）

在 `main` 或冻结标签 `v0.2.1` 对应版本运行：

```sh
npm run preview
# 等价：npm run cli -- --preview
# 编译后：npm run build && npm start -- --preview
```

打开终端输出的 `http://127.0.0.1:端口/会话地址/`，保持 CLI 运行，再在终端输入：

```text
init 800 480
create rect r 80 90 240 100 #3974ce
create text title 100 140 "实时预览，无需先保存"
set title fill white
move r 60 0
undo
redo
```

浏览器约每 300ms 检查变化，直接显示内存画布，无需 save 或手动刷新。init/read、所有成功编辑、undo/redo 和画布尺寸变更都会同步。失败命令保留原画面；查询与查看页面不改变撤销历史。页面支持适应窗口/原尺寸和多个页面同时查看。

**预览不等于保存。** 需要文件时仍执行 `save demo.svg`，save 仍按课程规则清空历史。Ctrl-C/Ctrl-D 退出后服务关闭，浏览器提示连接中断并保留最后画面；重新启动会生成新地址，请打开新链接。仅本机可访问，不提供浏览器内编辑和外部文件自动监听。输入重定向脚本在 EOF 后退出，因此要持续预览，请使用交互终端。

当前扩展版本（含 clear）已通过 71 项测试及 Node 22/24 干净检出检查，实时预览另经本机 Chrome 实际验收。本扩展不在课程 `final` 标签中；实现和验证见[扩展报告](doc/engineering/extensions/live-preview.md)。

## 命令与约定

| 类别 | 命令                                   |
| ---- | -------------------------------------- |
| 文档 | init / read / save / canvas            |
| 编辑 | create / delete / move / scale / set   |
| 层级 | group / ungroup / addto / front / back |
| 查询 | tree / show / help                     |
| 界面 | clear                                  |
| 历史 | undo / redo                            |

在 `svg>` 输入 `clear`（无参数）可以清理终端显示，再继续输入命令；浏览器画布、文件绑定和 undo/redo 历史保持不变。未创建画布也可用。它不重置会话或刻意清除上下键输入历史；脚本回放/输出重定向时不输出清屏控制码。旧进程不会自动加载更新，使用新增命令前请保存需要保留的作品，再重启 CLI。详见 [clear 验收报告](doc/engineering/extensions/cli-clear.md)。

输入 `help` 查看全部语法，完整规范见 [课程附件](phase_cli_1.md)。`create box` 属后续插件阶段，首版明确拒绝。

带空格参数用双引号；支持引号和反斜线转义。仅整行首个非空字符为 `#` 时是注释，`#ffffff` 等颜色保留。脚本中的错误写 stderr 并继续处理，最终退出 1；全部成功退出 0。

成功的 init/read/save/canvas 修改设立历史屏障；查询和失败命令不改变历史。失败命令保护文档、绑定路径和历史。附件要求根级容器不可 ungroup，首版遵循该规则。

## 验证与证据

```sh
npm run check           # 类型、规范、格式、测试、构建
npm run benchmark       # 100/1000/10000 图形的快照/历史实验
npm run visual:check    # 需要本地 Chrome；CHROME_BIN 可指定程序路径
```

课程 `final` 基线：63 项测试通过；本地干净检出在 Node.js 22.23.4、24.22.1 下验证通过，包含编译入口冒烟。原/规范化变换样例由隔离 Chrome 渲染，PNG 字节完全一致。详细证据见[验证报告](doc/engineering/verification.md)。

**GitHub Actions 历史状态：私有仓库阶段曾因账户账单/消费额度无法启动。** 公开后已实际通过 Node 22/24 托管检查（[运行 40622461090，提交 db0b43f](https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor/actions/runs/40622461090)）。每次发布的具体版本验证以[发布记录](doc/engineering/release.md)为准；历史限制与本地替代验证见 ADR-005。

## SVG 兼容范围

支持 rect/circle/ellipse/line/text/g，规定的几何和绘制属性；另外支持嵌套 translate/正等比 scale、默认 viewBox 映射、受支持行内样式和继承，以及 font-size/font-family/font-weight/text-anchor。长度支持数值及 px。

导入规范化保留当前外观和容器结构。旋转、非等比缩放、path、外部 CSS、tspan、相对长度与其他未列出的绘制特性明确报错，不静默丢弃。SVG 数字实体、中文、CDATA 和文字空白有回归验证。保存拒绝覆盖符号链接。

快照历史以可靠恢复为目标，每次编辑复制文档。实测 10000 图形的 20 次历史约增加 108 MiB 堆内存；不承诺无限历史或任意规模。结果只代表记录的本机环境。

版本变化见 [CHANGELOG.md](CHANGELOG.md)，冻结验证与已知限制见[发布记录](doc/engineering/release.md)。

## 文档与示例

- **[课程提交文件：doc/README.md](doc/README.md)**：包含仓库地址、完整架构方案、过程记录、自查和质量证据。
- [需求矩阵](doc/engineering/requirements.md)、[架构与图](doc/engineering/architecture.md)、[ADR](doc/engineering/adr.md)、[缺陷](doc/engineering/defects.md)、[工程日志](doc/engineering/log.md)、[验证报告](doc/engineering/verification.md)、[发布与复盘](doc/engineering/release.md)。
- [开发流程](CONTRIBUTING.md)；[流程图 SVG](examples/flowchart.svg)、[带变换的原图](examples/transforms.svg)、[规范化结果](examples/transforms-normalized.svg)。

仓库已公开，老师可直接通过链接查看代码、提交历史和标签，无需协作者邀请。课程平台仍需上传 **doc/README.md** 一份（文件名 README.md），不是只推送 GitHub。完整文件取舍见[公开发布检查记录](doc/engineering/publication-audit.md)。
