import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// Supabase pooler (Supavisor) drops idle connections, so a query hitting a
// stale connection fails with P1017 (or P1001 on a pooler blip). The retry
// below reconnects transparently; the keepalive ping keeps the connection warm.
const RETRYABLE_CODES = new Set(['P1001', 'P1017']);
const MAX_ATTEMPTS = 3;
const KEEPALIVE_MS = 30_000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private keepalive?: ReturnType<typeof setInterval>;

  withRetry(): PrismaService {
    return this.$extends({
      query: {
        $allOperations: async ({ model, operation, query, args }) => {
          for (let attempt = 1; ; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              if (
                !(error instanceof Prisma.PrismaClientKnownRequestError) ||
                !RETRYABLE_CODES.has(error.code) ||
                attempt >= MAX_ATTEMPTS
              ) {
                throw error;
              }
              this.logger.warn(
                `${error.code} on ${model ?? 'raw'}.${operation}, retry ${attempt}/${MAX_ATTEMPTS - 1}`,
              );
              await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
            }
          }
        },
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
    this.keepalive = setInterval(() => {
      this.$queryRaw`SELECT 1`.catch(() => undefined);
    }, KEEPALIVE_MS);
    this.keepalive.unref();
  }

  async onModuleDestroy() {
    if (this.keepalive) {
      clearInterval(this.keepalive);
    }
    await this.$disconnect();
  }
}
