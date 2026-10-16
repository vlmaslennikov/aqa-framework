import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDockerArgs, validateK6Image, k6ContainerEnv, DEFAULT_IMAGE } from '../../scripts/k6-run.mjs';

const id = 'aa0c1111-2222-4333-8444-555555555555';
const fixture = { roomId: id, folderId: id, fileId: id, email: 'vdr-perf-user@example.invalid', password: 'qa-pwd-123456789012345678901' };

test('Docker k6 uses official image only, no arbitrary registry', () => {
  assert.equal(DEFAULT_IMAGE, 'grafana/k6:latest');
  assert.equal(validateK6Image('grafana/k6:1.5.0'), 'grafana/k6:1.5.0');
  assert.equal(validateK6Image('grafana/k6@sha256:' + 'a'.repeat(64)), 'grafana/k6@sha256:' + 'a'.repeat(64));
  for (const value of ['grafana/k6', 'evil/k6:latest', 'grafana/k6:latest --privileged', 'grafana/k6:latest/../../etc']) {
    assert.throws(() => validateK6Image(value));
  }
});

test('Docker arguments host-network the runner, isolate mounts and report path', () => {
  const args = buildDockerArgs({ image: 'grafana/k6:latest', envFile: '/tmp/k6-ephemeral/env',
    root: '/qa-root', outputDir: '/qa-root/reports/performance', summaryFile: 'smoke-2026-10-16.json', userId: 1000, groupId: 1000 });
  assert.deepEqual(args.slice(0, 8), ['run', '--rm', '--init', '--network', 'host', '--env-file', '/tmp/k6-ephemeral/env', '--mount']);
  assert.ok(args.includes('type=bind,src=/qa-root/performance/k6,dst=/work,readonly'));
  assert.ok(args.includes('type=bind,src=/qa-root/reports/performance,dst=/results'));
  assert.equal(args[args.length - 1], '/work/readonly.js');
  assert.ok(args.includes('/results/smoke-2026-10-16.json'));
  assert.ok(args.includes('1000:1000'));
  assert.ok(!args.includes('--privileged'));
  assert.ok(!args.includes('--network=bridge'));
  assert.throws(() => buildDockerArgs({ image: DEFAULT_IMAGE, envFile: '/tmp/env', root: '/qa', outputDir: '/qa/report', summaryFile: '../out.json' }));
});

test('Only allowlisted k6 environment reaches Docker; DB secrets excluded', () => {
  const payload = k6ContainerEnv('http://127.0.0.1:3100', 'smoke', fixture, {
    K6_LOCAL_QA_ACK: 'I_OWN_THIS_DISPOSABLE_QA_STACK',
    DATABASE_URL: 'postgresql://secret', SUPABASE_SERVICE_ROLE_KEY: 'secret',
  });
  assert.equal(payload.K6_BASE_URL, 'http://127.0.0.1:3100');
  assert.equal(payload.K6_PERF_PASSWORD, fixture.password);
  assert.equal(payload.NO_PROXY, 'localhost,127.0.0.1,::1');
  assert.equal(payload.DATABASE_URL, undefined);
  assert.equal(payload.SUPABASE_SERVICE_ROLE_KEY, undefined);
});
