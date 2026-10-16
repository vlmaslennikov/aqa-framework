import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { AppModule } from '@/app.module';

// Works with real NestJS controllers, Prisma and LOCAL PostgreSQL, while avoiding real Supabase requests.
// The inline guard is still applied if someone bypasses npm's preflight script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertQaDatabase } = require('../qa-db-guard.cjs') as {assertQaDatabase: (env?: NodeJS.ProcessEnv) => boolean};

export interface Actor { id: string; email: string; token: string; roomId: string }

export async function openQaHarness() {
  assertQaDatabase();
  const objects = new Map<string, { size: number }>();
  const storageMock = {
    createUploadUrl: jest.fn(async (key: string) => `https://storage.invalid/test/${key}`),
    createViewUrl: jest.fn(async (key: string) => `https://storage.invalid/preview/${key}`),
    createDownloadUrl: jest.fn(async (key: string) => `https://storage.invalid/download/${key}`),
    getObjectInfo: jest.fn(async (key: string) => objects.get(key) ?? null),
    removeObject: jest.fn(async () => undefined),
    removeObjects: jest.fn(async () => undefined),
  };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(StorageService).useValue(storageMock).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const prisma = app.get(PrismaService);
  const emails: string[] = [];
  const http = () => request(app.getHttpServer());

  async function actor(prefix: string): Promise<Actor> {
    const email = `qa-${prefix}-${randomUUID()}@example.test`;
    emails.push(email);
    const res = await http().post('/auth/register').send({ email, name: 'QA Test', password: 'qa-strong-password-123' });
    if (res.status !== 201 || !res.body.accessToken) {
      throw new Error(`QA actor registration failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const room = await prisma.dataRoom.findFirstOrThrow({ where: { ownerId: user.id } });
    return { id: user.id, email, token: res.body.accessToken as string, roomId: room.id };
  }

  async function cleanup() {
    try {
      // Every deletion is scoped to users created by this specific run.
      const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
      const ids = users.map(x => x.id);
      if (!ids.length) return;
      const rooms = await prisma.dataRoom.findMany({ where: { ownerId: { in: ids } }, select: { id: true } });
      const roomIds = rooms.map(x => x.id);
      await prisma.share.deleteMany({ where: { createdById: { in: ids } } });
      await prisma.file.deleteMany({ where: { dataRoomId: { in: roomIds } } });
      const folders = await prisma.folder.findMany({ where: { dataRoomId: { in: roomIds } }, select: { id: true, path: true } });
      for (const folder of folders.sort((a,b)=>b.path.length - a.path.length)) {
        await prisma.folder.delete({ where: { id: folder.id } });
      }
      await prisma.dataRoom.deleteMany({ where: { id: { in: roomIds } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await app.close();
    }
  }
  return { app, prisma, http, actor, cleanup, storageMock, objects, emails };
}
export type QaHarness = Awaited<ReturnType<typeof openQaHarness>>;
export const authorization = (a: Actor) => ({ Authorization: `Bearer ${a.token}` });
