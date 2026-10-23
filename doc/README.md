# 高级软件开发技术 Lab1 提交文档

Git 仓库：<https://github.com/POWERRRRRRRR/advanced-software-development-lab1-svg-editor>（私有）。

当前为开发阶段，以下内容随真实实现更新；最终版本将包含可直接评分的完整结论。

## 架构方案

采用领域层、应用层、适配层和装配入口。Command 支撑命令与历史，Composite 统一容器和叶子，快照确保失败原子性与结构恢复。模块、PlantUML 图、依赖方向和变化点详见[架构方案](engineering/architecture.md)，选择理由见 [ADR](engineering/adr.md)。最终提交将在本文件内汇总完整方案与图。

## 过程记录

用户明确工程流程与常见 SVG 兼容范围；AI 先核对附件、环境和仓库状态，再建立基线。后续实际实验、缺陷与修正见[工程日志](engineering/log.md)。

## 一致性自查

实现尚未完成，不能提前声明目录或依赖符合设计；各阶段由自动检查与人工自查更新。

## 质量保证手段

建立[需求验收矩阵](engineering/requirements.md)，按领域、命令、持久化、真实 CLI、架构和人工预览分层验证。实际结果见[验证报告](engineering/verification.md)。
