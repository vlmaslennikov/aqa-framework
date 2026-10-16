/** Dedicated LOCAL QA database fixture generator. Requires apps/api/node_modules and safe .env.test. */
'use strict';
const { randomUUID, randomBytes } = require('node:crypto');
const { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const { assertQaDatabase } = require('../qa-db-guard.cjs');
const STATE = path.join(__dirname, '.qa-perf-state.json');
const SIZES = Object.freeze({ small: [12, 120], medium: [300, 3000], large: [1000, 10000], xlarge: [10000, 100000] });
const BATCH = 400;

function assertSeedArgs(args, env = process.env) {
  assertQaDatabase(env);
  if (args.length === 1 && args[0] === 'cleanup') return { cleanup: true };
  if (args.length !== 2 || args[0] !== 'seed' || !SIZES[args[1]]) throw new Error('Usage: node test/qa-perf/seed.cjs seed small|medium|large|xlarge OR cleanup');
  if (args[1] === 'xlarge' && env.QA_PERF_LARGE_ACK !== 'I_ACCEPT_100K_METADATA_ROWS') {
    throw new Error('xlarge requires QA_PERF_LARGE_ACK=I_ACCEPT_100K_METADATA_ROWS');
  }
  return { size: args[1], folders: SIZES[args[1]][0], files: SIZES[args[1]][1] };
}
function writeState(state) {
  mkdirSync(path.dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
function readState() {
  if (!existsSync(STATE)) throw new Error('No QA performance state found: first run seed small.');
  const state = JSON.parse(readFileSync(STATE, 'utf8'));
  if (state.schemaVersion !== 1 || !/^vdr-perf-[\w-]+@example\.invalid$/.test(state.email || '') ||
      !/^[0-9a-f-]{36}$/i.test(state.ownerId || '') || !/^[0-9a-f-]{36}$/i.test(state.roomId || '')) {
    throw new Error('Malformed QA state; refusing cleanup.');
  }
  return state;
}
async function safeCleanup(prisma, state) {
  // Ensure the generated user and room still belong to this exact QA fixture.
  const room = await prisma.dataRoom.findUnique({ where: { id: state.roomId }, select: { ownerId: true } });
  const user = await prisma.user.findUnique({ where: { id: state.ownerId }, select: { email: true } });
  if (!room || !user || room.ownerId !== user.id || user.email !== state.email) {
    throw new Error('QA state no longer matches user/room ownership; cleanup refused.');
  }
  await prisma.file.deleteMany({ where: { dataRoomId: room.id } });
  // Supports root + one level nested, which is the only seeded shape.
  await prisma.folder.deleteMany({ where: { dataRoomId: room.id, parentId: { not: null } } });
  await prisma.folder.deleteMany({ where: { dataRoomId: room.id } });
  await prisma.share.deleteMany({ where: { createdById: user.id } });
  await prisma.dataRoom.delete({ where: { id: room.id } });
  await prisma.user.delete({ where: { id: user.id } });
}
async function seed(prisma, opts) {
  if (existsSync(STATE)) throw new Error('Performance fixture already exists. Run cleanup first; never overwrite state.');
  const runId = randomUUID();
  const ownerId = randomUUID();
  const roomId = randomUUID();
  const email = `vdr-perf-${runId}@example.invalid`;
  const password = randomBytes(24).toString('hex');
  const folders = Array.from({ length: opts.folders }, (_, i) => {
    const id = randomUUID();
    const name = `PERF-${String(i).padStart(6, '0')}`;
    return { id, name, nameLower: name.toLowerCase(), dataRoomId: roomId, parentId: null, path: `${id}/` };
  });
  let ownerCreated = false;
  try {
    const bcrypt = require('bcryptjs');
    await prisma.user.create({ data: { id: ownerId, email, name: 'Local QA Performance Owner', passwordHash: await bcrypt.hash(password, 10) } });
    ownerCreated = true;
    await prisma.dataRoom.create({ data: { id: roomId, name: `QA PERF ${runId}`, ownerId } });
    for (let i = 0; i < folders.length; i += BATCH) await prisma.folder.createMany({ data: folders.slice(i, i + BATCH) });
    let fileId = '';
    const when = new Date();
    for (let i = 0; i < opts.files; i += BATCH) {
      const n = Math.min(BATCH, opts.files - i);
      const rows = Array.from({ length: n }, (_, j) => {
        const idx = i + j;
        const id = randomUUID();
        if (idx === 0) fileId = id;
        const name = `qa-metadata-${String(idx).padStart(7, '0')}.pdf`;
        // Metadata-only fake storage key: NEVER use signed-url endpoints with this fixture.
        return { id, name, nameLower: name.toLowerCase(), dataRoomId: roomId, folderId: folders[idx % 2 === 0 ? 0 : idx % folders.length].id,
          size: 1024 + idx % 1000, mimeType: 'application/pdf', uploadedAt: when, storageKey: `qa-perf-not-a-real-object/${runId}/${id}.pdf` };
      });
      await prisma.file.createMany({ data: rows });
    }
    const state = { schemaVersion: 1, runId, size: opts.size, folderCount: opts.folders, fileCount: opts.files,
      ownerId, roomId, folderId: folders[0].id, fileId, email, password, createdAt: new Date().toISOString(),
      note: 'Isolated metadata-only fixture, no physical PDF objects in Supabase' };
    writeState(state);
    console.log(`QA PERF seed ready: ${opts.size} (${opts.folders} folders, ${opts.files} file metadata rows).`);
    console.log('Credentials stored locally in test/qa-perf/.qa-perf-state.json (mode 0600); never upload this file.');
  } catch (err) {
    if (ownerCreated) {
      try { await safeCleanup(prisma, { roomId, ownerId, email }); }
      catch (e) { console.error('Partial seed cleanup failed: ' + e.message); }
    }
    throw err;
  }
}

async function main() {
  const opts = assertSeedArgs(process.argv.slice(2));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    if (opts.cleanup) {
      const state = readState();
      await safeCleanup(prisma, state);
      unlinkSync(STATE);
      console.log('QA PERF cleanup PASS: removed only the seeded QA owner, room, folders and file metadata.');
    } else await seed(prisma, opts);
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(e => { console.error('QA PERF seed: ' + e.message); process.exitCode = 1; });
module.exports = { assertSeedArgs, SIZES };
