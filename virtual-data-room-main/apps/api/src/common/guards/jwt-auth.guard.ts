import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
}

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      request.user = { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers['authorization'];
    if (!header) {
      return undefined;
    }
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
