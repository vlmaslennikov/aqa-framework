# ScanRepo integration — limitations, process and prior result

Scanner: https://www.scanrepo.dev/cli. Command: `npm run security:repo`, which executes `npx --yes scanrepo github.com/evo9/virtual-data-room --json --no-publish` by default.

**Prior session reported** LOW 24.5/100, six signals. The exact report JSON, rule IDs, scanned SHA and output transcript are not available in this artifact. The previous review described warnings on long Tailwind strings, sample/test strings and ordinary conditionals, without identifying malicious behavior. Do not claim these as six confirmed security bugs or claim that their verdict covers the current local Work branch.

The workflow is manual (`workflow_dispatch`) so downloading and running a third-party npm CLI is an explicit action. No auto-run in Playwright CI. JSON output, raw output, stderr, local GITHUB_SHA (if known) and scanner exit code are saved under `reports/scanrepo/`. The tool returns 0=low/safe, 1=suspicious/inconclusive/error, 2=dangerous/malicious; nonzero should not be coerced to success.

**Critical limitation:** ScanRepo CLI takes a public GitHub/Bitbucket repository URL and inspects a remote snapshot. It does not audit uncommitted local changes or a private fork. A local Git SHA and scanner report SHA are not equal simply because both appear in the report; verify actual scanned SHA from scanner output. Using it on code received in a coding assignment is an extra supply-chain check, not a product security certification.

**Triage template:** signal ID, filename/line, exact pattern, runtime reachability, false positive rationale/evidence, severity and disposition. Separate malicious-code signals from accidental insecure application code. Never paste tokens, secrets, private documents or signed URLs into public reports.
