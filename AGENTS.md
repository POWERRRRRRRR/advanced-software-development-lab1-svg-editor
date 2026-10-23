# Repository instructions

This is 高级软件开发技术 Lab1. Preserve phase_cli_1.md as the original assignment.

- Follow doc/engineering/requirements.md and architecture.md. Keep src/domain independent of IO and src/application dependent only on the core.
- Use encapsulated TypeScript classes, one class per file matching its name. New shape/command dispatch belongs only in the two existing factories.
- A failed command must preserve the document, file binding and undo/redo history. Changes require meaningful behavior/regression checks.
- Update requirement traceability, relevant ADRs, defects and engineering log together with changes. Record only actual validation and actual review; disclose unverified claims.
- Run npm run check before completing a change. Use local incremental commits; the user requested a consolidated remote push after completion.
- GitHub Actions is account-blocked (RISK-001). Do not claim hosted CI passed; use recorded local Node 22/24 clean-checkout validation until the owner resolves account limits.
- Do not rewrite published history or replace the final tag after release. Follow CONTRIBUTING.md for later changes.
