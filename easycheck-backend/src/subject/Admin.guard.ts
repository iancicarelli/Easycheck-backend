import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// Rol con permisos para administrar asignaturas.
export const ADMIN_ROLE = 'administrador';

// Token estático de administrador para desarrollo/test (placeholder de JWT).
// Configurable vía la variable de entorno ADMIN_TOKEN.
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'admin-test-token';

interface AuthenticatedRequest {
  headers?: { authorization?: string };
  user?: { role?: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException({ message: 'Token no proporcionado' });
    }

    // Acepta "Bearer <token>" o el token a secas.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== ADMIN_TOKEN) {
      throw new ForbiddenException({
        message: 'No tiene permisos para realizar esta acción',
      });
    }

    // Puebla request.user para mantener el contrato que esperan los handlers.
    request.user = { role: ADMIN_ROLE };
    return true;
  }
}
