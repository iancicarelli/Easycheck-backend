import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AssistanceController } from '../../src/assistance/Assistance.controller';
import { SubjectNotAssignedException } from '../../src/assistance/domain/assistance.errors';
import { AssistanceService } from '../../src/assistance/Assistance.service';
import { MockTokenService } from '../../src/auth/application/mock-token.service';

describe('CU-05 Mostrar asistencia de estudiantes de asignatura para profesor', () => {
  let controller: AssistanceController;
  let service: {
    getStudentAttendanceByRut: jest.Mock;
    getStudentsAssistanceBySubject: jest.Mock;
  };

  beforeEach(() => {
    service = {
      getStudentAttendanceByRut: jest.fn(),
      getStudentsAssistanceBySubject: jest.fn(),
    };
    controller = new AssistanceController(
      service as unknown as AssistanceService,
      new MockTokenService(),
    );
  });

  it('retorna asistencia de estudiantes para la asignatura del profesor autenticado', async () => {
    service.getStudentsAssistanceBySubject.mockResolvedValue([
      {
        rut: '12345678-9',
        name: 'Ana Garcia',
        classesAttended: 1,
        totalClasses: 2,
        assistancePercentage: 50,
      },
    ]);

    const result = await controller.getAuthenticatedProfessorSubjectAttendance(
      'INF-301',
      'Bearer mock-token-98765432-1-profesor',
    );

    expect(service.getStudentsAssistanceBySubject).toHaveBeenCalledWith(
      '98765432-1',
      'INF-301',
    );
    expect(result).toEqual([
      {
        rut: '12345678-9',
        name: 'Ana Garcia',
        classesAttended: 1,
        totalClasses: 2,
        assistancePercentage: 50,
      },
    ]);
  });

  it('rechaza solicitudes sin token', async () => {
    await expect(
      controller.getAuthenticatedProfessorSubjectAttendance('INF-301'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza tokens mal formados', async () => {
    await expect(
      controller.getAuthenticatedProfessorSubjectAttendance(
        'INF-301',
        'Bearer token-invalido',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza tokens con rol distinto de profesor', async () => {
    await expect(
      controller.getAuthenticatedProfessorSubjectAttendance(
        'INF-301',
        'Bearer mock-token-12345678-9-estudiante',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('retorna 404 cuando el profesor no dicta la asignatura', async () => {
    service.getStudentsAssistanceBySubject.mockRejectedValue(
      new SubjectNotAssignedException('98765432-1', 'INF-999'),
    );

    await expect(
      controller.getAuthenticatedProfessorSubjectAttendance(
        'INF-999',
        'Bearer mock-token-98765432-1-profesor',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
