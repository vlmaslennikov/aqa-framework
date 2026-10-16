import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DEFAULT_DATA_ROOM_NAME } from '@/data-rooms/data-rooms.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let user: { id: string; email: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, passwordHash, name: dto.name.trim() },
        });
        await tx.dataRoom.create({
          data: { name: DEFAULT_DATA_ROOM_NAME, ownerId: created.id },
        });
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }

    return { accessToken: this.signToken(user.id, user.email) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return { accessToken: this.signToken(user.id, user.email) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
