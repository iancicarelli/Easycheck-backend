import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AssistanceController } from '../../src/assistance/Assistance.controller';
import { StudentAttendanceNotFoundException } from '../../src/assistance/domain/assistance.errors';
import { AssistanceService } from '../../src/assistance/Assistance.service';
import { MockTokenService } from '../../src/auth/application/mock-token.service';

describe('CU-04 Mostrar asistencia del alumno autenticado', () => {
  let controller: AssistanceController;
  let service: {
    getStudentAttendanceByRut: jest.Mock;
  };

  beforeEach(() => {
    service = {
      getStudentAttendanceByRut: jest.fn(),
    };
    controller = new AssistanceController(
      service as unknown as AssistanceService,
      new MockTokenService(),
    );
  });

  it('retorna asistencia general del estudiante autenticado', async () => {
    service.getStudentAttendanceByRut.mockResolvedValue([
      {
        subjectName: 'Arquitectura de Software',
        attendedClasses: 1,
        totalClasses: 2,
        attendancePercentage: 50,
      },
    ]);

    const result = await controller.getAuthenticatedStudentAttendance(
      'Bearer mock-token-12345678-9-estudiante',
    );

    expect(service.getStudentAttendanceByRut).toHaveBeenCalledWith(
      '12345678-9',
    );
    expect(result).toEqual([
      {
        subjectName: 'Arquitectura de Software',
        attendedClasses: 1,
        totalClasses: 2,
        attendancePercentage: 50,
      },
    ]);
  });

  it('rechaza solicitudes sin token', async () => {
    await expect(
      controller.getAuthenticatedStudentAttendance(undefined),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza tokens mal formados', async () => {
    await expect(
      controller.getAuthenticatedStudentAttendance('Bearer token-invalido'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza tokens con rol distinto de estudiante', async () => {
    await expect(
      controller.getAuthenticatedStudentAttendance(
        'Bearer mock-token-98765432-1-profesor',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('retorna 404 cuando el estudiante autenticado no existe', async () => {
    service.getStudentAttendanceByRut.mockRejectedValue(
      new StudentAttendanceNotFoundException('87654321-0'),
    );

    await expect(
      controller.getAuthenticatedStudentAttendance(
        'Bearer mock-token-87654321-0-estudiante',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
