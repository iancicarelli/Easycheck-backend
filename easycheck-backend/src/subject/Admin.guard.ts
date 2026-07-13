import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: { role?: string };
    }>();
    if (!request.headers?.authorization) {
      throw new UnauthorizedException({ message: 'Token no proporcionado' });
    }
    if (request.user?.role !== 'administrador') {
      throw new ForbiddenException({
        message: 'No tiene permisos para realizar esta acciÃ³n',
      });
    }
    return true;
  }
}
