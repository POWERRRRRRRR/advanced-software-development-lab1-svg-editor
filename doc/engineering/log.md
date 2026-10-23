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
