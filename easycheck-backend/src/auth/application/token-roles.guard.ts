import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRole, TokenPayload } from '../domain/auth.types';
import { MockTokenService } from './mock-token.service';
import { USERS_REPOSITORY_PORT } from '../../users/application/user-registration.ports';
import type { UsersRepositoryPort } from '../../users/application/user-registration.ports';
import type { UserRole } from '../../users/domain/user-role.enum';

const ALLOWED_ROLES = 'allowed-auth-roles';

export const AllowedRoles = (...roles: AuthRole[]) =>
  SetMetadata(ALLOWED_ROLES, roles);

export interface TokenAuthenticatedRequest {
  headers: Record<string, string | undefined>;
  user?: TokenPayload;
}

@Injectable()
export class TokenRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: MockTokenService,
    @Inject(USERS_REPOSITORY_PORT)
    private readonly users: UsersRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<TokenAuthenticatedRequest>();
    const authorization = request.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/.exec(authorization);
    const payload = match ? this.tokens.parse(match[1]) : null;
    if (!payload) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const account = await this.users.findByRut(payload.rut);
    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cuenta inexistente o inactiva');
    }
    if (this.toAuthRole(account.role) !== payload.role) {
      throw new UnauthorizedException(
        'El rol del token no coincide con la cuenta',
      );
    }

    const allowed = this.reflector.getAllAndOverride<AuthRole[]>(
      ALLOWED_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (allowed?.length && !allowed.includes(payload.role)) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta acciÃ³n',
      );
    }

    request.user = payload;
    return true;
  }

  private toAuthRole(role: UserRole): AuthRole {
    const roles: Record<UserRole, AuthRole> = {
      ESTUDIANTE: 'estudiante',
      PROFESOR: 'profesor',
      DIRECTOR_CARRERA: 'director',
      ADMINISTRADOR: 'administrador',
    };
    return roles[role];
  }
}
