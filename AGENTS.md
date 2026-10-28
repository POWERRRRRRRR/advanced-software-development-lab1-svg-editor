# Repository instructions

This is 高级软件开发技术 Lab1. Preserve phase_cli_1.md as the original assignment.

- Follow doc/engineering/requirements.md and architecture.md. Keep src/domain independent of IO and src/application dependent only on the core.
- Use encapsulated TypeScript classes, one class per file matching its name. New shape/command dispatch belongs only in the two existing factories.
- A failed command must preserve the document, file binding and undo/redo history. Changes require meaningful behavior/regression checks.
- Update requirement traceability, relevant ADRs, defects and engineering log together with changes. Record only actual validation and actual review; disclose unverified claims.
- Run npm run check before completing a change. Use local incremental commits; the user requested a consolidated remote push after completion.
- GitHub Actions was account-blocked while private (RISK-001). After the owner made this repository public, hosted Node 22/24 checks actually passed in run 40622461090. Preserve historical failure evidence; report CI only for the exact verified commit/run, and keep local clean-checkout evidence. Do not infer account billing was fixed.
- Do not rewrite published history or replace the final tag after release. Follow CONTRIBUTING.md for later changes.
