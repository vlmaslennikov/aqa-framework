import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const runner = resolve(fileURLToPath(new URL('../../scripts/scanrepo.mjs', import.meta.url)));
for (const exitCode of [0, 1, 2]) {
  test(`ScanRepo wrapper stores evidence and preserves exit ${exitCode}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'vdr-scanrepo-test-'));
    try {
      mkdirSync(join(dir, 'bin'));
      const fake = join(dir, 'bin', 'npx');
      writeFileSync(fake, `#!/bin/sh\nprintf '{"score":24.5,"verdict":"LOW"}\\n'\nexit ${exitCode}\n`, {mode:0o755});
      const child = spawnSync(process.execPath, [runner], {
        cwd: dir, encoding: 'utf8',
        env: { ...process.env, PATH: `${join(dir,'bin')}:${process.env.PATH}`, SCANREPO_REPOSITORY:'github.com/evo9/virtual-data-room' },
      });
      assert.equal(child.status, exitCode, child.stderr);
      const meta=JSON.parse(readFileSync(join(dir, 'reports/scanrepo/metadata.json'), 'utf8'));
      assert.equal(meta.exitCode,exitCode);
      assert.equal(meta.parsedJson,true);
      assert.equal(meta.target,'github.com/evo9/virtual-data-room');
      assert.match(meta.note,/not verified/i);
      const scan=JSON.parse(readFileSync(join(dir, 'reports/scanrepo/scan.json'), 'utf8'));
      assert.equal(scan.score,24.5);
    } finally { rmSync(dir, {recursive:true,force:true}); }
  });
}
