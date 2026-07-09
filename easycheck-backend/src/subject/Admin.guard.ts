import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

export const ADMIN_ROLE = 'administrador';

interface AuthenticatedRequest {
  headers?: { authorization?: string };
  user?: { role?: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = request.headers?.authorization;
    if (!token) {
      throw new UnauthorizedException({ message: 'Token no proporcionado' });
    }

    const role = request.user?.role ?? this.roleFromMockToken(token);
    if (role !== ADMIN_ROLE) {
      throw new ForbiddenException({
        message: 'No tiene permisos para realizar esta accion',
      });
    }

    return true;
  }

  private roleFromMockToken(authorization: string): string | undefined {
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token?.startsWith('mock-token-')) {
      return undefined;
    }

    return token.split('-').at(-1);
  }
}
