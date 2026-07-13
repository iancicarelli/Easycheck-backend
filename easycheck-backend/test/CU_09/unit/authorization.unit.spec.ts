import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminGuard } from '../../../src/subject/Admin.guard';

describe('CU-09 Autorización de registro de asignatura (TDD)', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  interface MockRequest {
    headers: { authorization?: string };
    user?: { role?: string };
  }

  const mockContext = (request: MockRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  it('TC-CU09-05: sin token retorna 401', () => {
    const context = mockContext({ headers: {} });

    expect.assertions(2);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      expect((e as UnauthorizedException).getStatus()).toBe(401);
    }
  });

  it('TC-CU09-06: con rol no administrativo retorna 403', () => {
    const context = mockContext({
      headers: { authorization: 'Bearer token-valido' },
      user: { role: 'profesor' },
    });

    expect.assertions(2);
    try {
      guard.canActivate(context);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((e as ForbiddenException).getStatus()).toBe(403);
    }
  });
});
