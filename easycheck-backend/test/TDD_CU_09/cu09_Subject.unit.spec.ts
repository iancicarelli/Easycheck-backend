import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  MissingFieldsException,
  SubjectAlreadyExistsException,
} from '../../src/subject/domain/subject.errors';
import { AdminGuard } from '../../src/subject/Admin.guard';
import { Subject } from '../../src/subject/Subject.repository';
import { SubjectService } from '../../src/subject/Subject.service';

describe('CU-09 Registro de nueva asignatura', () => {
  let service: SubjectService;
  let repository: {
    findByCode: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findByCode: jest.fn(),
      save: jest.fn((subject: Subject) => Promise.resolve(subject)),
    };
    service = new SubjectService(repository);
  });

  it('registra una asignatura con datos validos', async () => {
    repository.findByCode.mockResolvedValue(null);

    const result = await service.createSubject({
      code: 'INF-301',
      name: 'Ingenieria de Software',
      career: 'Ingenieria Informatica',
    });

    expect(repository.save).toHaveBeenCalledWith({
      code: 'INF-301',
      name: 'Ingenieria de Software',
      career: 'Ingenieria Informatica',
    });
    expect(result).toEqual({
      message: 'Asignatura registrada correctamente',
      subject: {
        code: 'INF-301',
        name: 'Ingenieria de Software',
        career: 'Ingenieria Informatica',
      },
    });
  });

  it('normaliza espacios antes de validar y guardar', async () => {
    repository.findByCode.mockResolvedValue(null);

    await service.createSubject({
      code: ' INF-302 ',
      name: ' Arquitectura de Software ',
      career: ' Ingenieria Informatica ',
    });

    expect(repository.findByCode).toHaveBeenCalledWith('INF-302');
    expect(repository.save).toHaveBeenCalledWith({
      code: 'INF-302',
      name: 'Arquitectura de Software',
      career: 'Ingenieria Informatica',
    });
  });

  it('rechaza asignatura con campos obligatorios vacios', async () => {
    await expect(
      service.createSubject({ code: ' ', name: '', career: '' }),
    ).rejects.toThrow(MissingFieldsException);
  });

  it('rechaza asignatura duplicada por codigo', async () => {
    repository.findByCode.mockResolvedValue({
      code: 'INF-301',
      name: 'Ingenieria de Software',
      career: 'Ingenieria Informatica',
    });

    await expect(
      service.createSubject({
        code: 'INF-301',
        name: 'Ingenieria de Software',
        career: 'Ingenieria Informatica',
      }),
    ).rejects.toThrow(SubjectAlreadyExistsException);
  });

  it('rechaza caracteres no permitidos', async () => {
    repository.findByCode.mockResolvedValue(null);

    await expect(
      service.createSubject({
        code: 'INF-301',
        name: 'Calculo#1@',
        career: 'Ingenieria Informatica',
      }),
    ).rejects.toThrow('Caracteres no permitidos');
  });
});

describe('CU-09 AdminGuard', () => {
  let guard: AdminGuard;

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

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('permite token mock con rol administrador', () => {
    const context = mockContext({
      headers: { authorization: 'Bearer mock-token-11222333-4-administrador' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza solicitud sin token', () => {
    expect(() => guard.canActivate(mockContext({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza token mock con rol no administrativo', () => {
    const context = mockContext({
      headers: { authorization: 'Bearer mock-token-98765432-1-profesor' },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
