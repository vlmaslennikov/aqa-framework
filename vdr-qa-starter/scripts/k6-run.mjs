/** Guarded performance runner: Docker (default) or explicitly requested native k6.
 * Read-only API traffic. Never point this at the shared VDR demo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateFixture, validateLocalTarget, validateProfile, HEAVY } from '../performance/k6/policy.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const STATE = path.resolve(ROOT, '../virtual-data-room-main/apps/api/test/qa-perf/.qa-perf-state.json');
const FORBIDDEN_OVERRIDES = ['K6_VUS', 'K6_DURATION', 'K6_STAGES', 'K6_ITERATIONS', 'K6_SCENARIOS', 'K6_OUT', 'K6_CLOUD_TOKEN', 'K6_HOSTS', 'K6_NO_THRESHOLDS'];
export const DEFAULT_IMAGE = 'grafana/k6:latest';

export function validateK6Image(name) {
  if (typeof name !== 'string' || !/^grafana\/k6(?::[A-Za-z0-9_.-]+|@sha256:[a-f0-9]{64})$/.test(name)) {
    throw new Error('K6_DOCKER_IMAGE must be an official grafana/k6:<tag> or grafana/k6@sha256:<digest>');
  }
  return name;
}
export function prepare(profile, env = process.env, statePath = STATE) {
  validateProfile(profile, env);
  for (const key of FORBIDDEN_OVERRIDES) {
    if (env[key] !== undefined && env[key] !== '') throw new Error(`${key} must be unset; this QA runner enforces bounded local workloads`);
  }
  const base = validateLocalTarget(env.K6_BASE_URL || 'http://127.0.0.1:3100');
  if (env.QA_INTEGRATION_ACK !== 'I_OWN_THIS_LOCAL_DB') {
    throw new Error('Source the guarded apps/api/test/.env.test before k6: QA_INTEGRATION_ACK missing');
  }
  const dbGuard = path.resolve(ROOT, '../virtual-data-room-main/apps/api/test/qa-db-guard.cjs');
  const guard = spawnSync(process.execPath, [dbGuard], { cwd: ROOT, env, encoding: 'utf8' });
  if (guard.status !== 0) throw new Error('Local PostgreSQL guard failed: ' + (guard.stderr || guard.stdout).trim());
  const fixture = validateFixture(JSON.parse(fs.readFileSync(statePath, 'utf8')));
  if (profile === 'volume' && fixture.fileCount < 3000) throw new Error('Volume needs a medium/large/xlarge fixture (>=3000 files)');
  if (profile === 'scalability' && !/^[\w.-]{2,40}$/.test(env.K6_SCALE_LABEL || '')) {
    throw new Error('Scalability comparison requires K6_SCALE_LABEL (identifies allocated backend resources)');
  }
  return { base, fixture };
}

// Only the allowlisted keys reach the container. No DATABASE_URL or Supabase secrets.
export function k6ContainerEnv(base, profile, fixture, env = process.env) {
  return {
    K6_BASE_URL: base,
    K6_PROFILE: profile,
    K6_LOCAL_QA_ACK: env.K6_LOCAL_QA_ACK,
    ...(env.K6_HEAVY_ACK ? { K6_HEAVY_ACK: env.K6_HEAVY_ACK } : {}),
    K6_ROOM_ID: fixture.roomId,
    K6_FOLDER_ID: fixture.folderId,
    K6_FILE_ID: fixture.fileId,
    K6_PERF_EMAIL: fixture.email,
    K6_PERF_PASSWORD: fixture.password,
    HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '',
    http_proxy: '', https_proxy: '', all_proxy: '',
    NO_PROXY: 'localhost,127.0.0.1,::1', no_proxy: 'localhost,127.0.0.1,::1',
  };
}
export function buildDockerArgs({ image, envFile, root, outputDir, summaryFile, userId, groupId }) {
  validateK6Image(image);
  if (!/^[-\w.]+\.json$/.test(summaryFile)) throw new Error('Invalid output JSON basename');
  const args = [
    'run', '--rm', '--init', '--network', 'host',
    '--env-file', envFile,
    '--mount', `type=bind,src=${path.join(root, 'performance/k6')},dst=/work,readonly`,
    '--mount', `type=bind,src=${outputDir},dst=/results`,
  ];
  if (Number.isInteger(userId) && Number.isInteger(groupId)) args.push('--user', `${userId}:${groupId}`);
  args.push(image, 'run', '--summary-export', `/results/${summaryFile}`, '/work/readonly.js');
  return args;
}
function checkBinary(binary, args, hint) {
  const check = spawnSync(binary, args, { encoding: 'utf8' });
  if (check.error || check.status !== 0) throw new Error(`${hint}: ${check.stderr?.trim() || check.error?.message || check.stdout?.trim() || 'unknown failure'}`);
}
function secretEnvFile(k6env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vdr-k6-env-'));
  fs.chmodSync(dir, 0o700);
  const file = path.join(dir, 'env.list');
  try {
    const lines = Object.entries(k6env).map(([key, value]) => {
      if (typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new Error(`Invalid container environment value: ${key}`);
      return `${key}=${value}`;
    });
    fs.writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
    return { file, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
  } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e; }
}
async function launch(binary, args, env) {
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: ROOT, env, stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 128 : 1)));
  });
}
async function main() {
  const profile = process.argv[2] || 'smoke';
  const { base, fixture } = prepare(profile);
  const execution = process.env.K6_EXECUTION || 'docker';
  if (!['docker', 'native'].includes(execution)) throw new Error('K6_EXECUTION must be docker or native');
  const image = validateK6Image(process.env.K6_DOCKER_IMAGE || DEFAULT_IMAGE);
  const out = path.join(ROOT, 'reports', 'performance');
  fs.mkdirSync(out, { recursive: true });
  const label = profile === 'scalability' ? `-${process.env.K6_SCALE_LABEL}` : '';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFile = `${profile}${label}-${stamp}.json`;
  const summary = path.join(out, summaryFile);
  console.log(`[k6] executor=${execution}, profile=${profile}, origin=${base}, seed=${fixture.size}`);
  console.log(`[k6] report: ${summary}`);
  if (HEAVY.includes(profile)) console.log('[k6] HEAVY workload explicitly acknowledged (isolated QA host only).');
  const runtimeEnv = k6ContainerEnv(base, profile, fixture);
  let status;
  if (execution === 'docker') {
    // Host networking is required on Linux because the guarded URL is 127.0.0.1.
    checkBinary('docker', ['info', '--format', '{{.ServerVersion}}'], 'Docker daemon unavailable (check permissions and service)');
    checkBinary('docker', ['image', 'inspect', image], `k6 Docker image missing; run make k6-install (${image})`);
    const tmp = secretEnvFile(runtimeEnv);
    try {
      const args = buildDockerArgs({ image, envFile: tmp.file, root: ROOT, outputDir: out, summaryFile,
        userId: process.getuid?.(), groupId: process.getgid?.() });
      console.log('[k6] Docker host networking: 127.0.0.1 inside container is local Ubuntu host.');
      status = await launch('docker', args, process.env);
    } finally { tmp.cleanup(); }
  } else {
    checkBinary('k6', ['version'], 'Native k6 executable missing');
    status = await launch('k6', ['run', '--summary-export', summary, path.join(ROOT, 'performance/k6/readonly.js')],
      { ...process.env, ...runtimeEnv });
  }
  if (!fs.existsSync(summary)) {
    console.error('[k6] No JSON summary was produced; run is NOT confirmed (FAIL).');
    process.exitCode = status || 1;
    return;
  }
  console.log(`[k6] saved: ${summary}\n[k6] analyze: node scripts/k6-analyze.mjs "${summary}"`);
  if (status !== 0) { console.error(`[k6] failed with exit=${status}; do not call this PASS.`); process.exitCode = status; }

}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('[k6] ' + err.message); process.exitCode = 1; });
}
