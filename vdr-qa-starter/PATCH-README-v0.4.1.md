# Lighthouse v0.4.1 — No usable sandbox fix

This is a **source-only** patch to the standalone v0.4 QA starter. No extra Chrome archive, npm install, or secrets are needed. Work branch sources were not supplied: this does not overwrite the Work branch.

## Install patch into your existing local QA folder

```bash
cd /path/to/vdr-qa-starter
unzip -o /path/to/vdr-qa-lighthouse-fix-v0.4.1.zip
```

Then configure the existing extracted browser and explicitly opt out of sandbox only in an isolated test environment:

```bash
export CHROME_PATH=/absolute/path/to/pw-browsers/chromium-1243/chrome-linux64/chrome
export LHCI_CHROME_NO_SANDBOX=1   # WARNING: Chrome renderer sandbox OFF
npm run test:framework
npm run lighthouse:check
npm run lighthouse:browser-check
```

Try one remote (approved demo) public run to validate plumbing:

```bash
LHCI_ALLOW_REMOTE=1 LHCI_WEB_BASE_URL=https://virtual-data-room-ten.vercel.app LHCI_RUNS=1 npm run lighthouse:public
```

After the first successful audit, use `LHCI_RUNS=3` for a less noisy baseline. For authenticated scans, set the existing `OWNER_EMAIL` and `OWNER_PASSWORD` for disposable test accounts, then `npm run lighthouse:auth` / `npm run lighthouse:flow`.

## Security and evidence

`--no-sandbox` removes browser process isolation. Prefer fixing the host's sandbox or using a disposable isolated test environment; do not globally disable sandbox or browse arbitrary URLs. Do not share raw authorized LHR traces; they can contain URLs and document content.

`reports/lighthouse/<mode>/qa-status.json` now records failures even when `manifest.json` is empty. An empty manifest is **zero completed audits**. Do not classify it as a product defect.

Verified in this assistant environment: 18/18 QA harness unit tests PASS; provided Chromium archive supports headless launch with explicit opt-in, without which browser check fails. Full Lighthouse audits against VDR were not executed from the assistant's network-restricted environment.
