import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import {
  StudentNotEnrolledException,
  StudentNotFoundException,
} from '../../../src/common/exceptions';

describe('CU-04 asistencia del estudiante autenticado', () => {
  let repository: {
    findStudent: jest.Mock;
    findStudentAttendanceByRut: jest.Mock;
  };
  let service: AssistanceService;

  beforeEach(() => {
    repository = {
      findStudent: jest.fn().mockResolvedValue({
        rut: '11111111-1',
        name: 'Estudiante Uno',
      }),
      findStudentAttendanceByRut: jest.fn().mockResolvedValue([
        {
          subjectName: 'ASG-01',
          attendedClasses: 1,
          totalClasses: 2,
        },
      ]),
    };
    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('calcula la asistencia de la asignatura solicitada', async () => {
    await expect(
      service.getCurrentStudentSubjectAttendance('11111111-1', 'ASG-01'),
    ).resolves.toEqual({
      studentRut: '11111111-1',
      subjectId: 'ASG-01',
      attendedClasses: 1,
      totalClasses: 2,
      attendancePercentage: 50,
    });
  });

  it('rechaza un estudiante que no existe', async () => {
    repository.findStudent.mockResolvedValue(null);
    await expect(
      service.getCurrentStudentSubjectAttendance('99999999-9', 'ASG-01'),
    ).rejects.toThrow(StudentNotFoundException);
  });

  it('rechaza una asignatura en la que no esta matriculado', async () => {
    await expect(
      service.getCurrentStudentSubjectAttendance('11111111-1', 'INF-999'),
    ).rejects.toThrow(StudentNotEnrolledException);
  });

  it('retorna porcentaje cero cuando no existen clases', async () => {
    repository.findStudentAttendanceByRut.mockResolvedValue([
      { subjectName: 'ASG-01', attendedClasses: 0, totalClasses: 0 },
    ]);
    await expect(
      service.getCurrentStudentSubjectAttendance('11111111-1', 'ASG-01'),
    ).resolves.toMatchObject({ attendancePercentage: 0 });
  });
});
