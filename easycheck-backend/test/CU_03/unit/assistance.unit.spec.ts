import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import { StudentNotFoundException } from '../../../src/common/exceptions';

interface StudentSubjectAttendance {
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
  attendancePercentage: number;
}

interface Cu03AssistanceService {
  getStudentAttendanceByRut(rut: string): Promise<StudentSubjectAttendance[]>;
}

describe('CU-03 Mostrar asistencia por estudiantes (TDD)', () => {
  let service: AssistanceService & Cu03AssistanceService;
  let repository: {
    findStudent: jest.Mock;
    findStudentAttendanceByRut: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findStudent: jest.fn(),
      findStudentAttendanceByRut: jest.fn(),
    };

    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('TC-CU03-01: rechaza la consulta cuando el RUT ingresado no es valido', async () => {
    await expect(
      service.getStudentAttendanceByRut('rut-invalido'),
    ).rejects.toThrow(
      'El RUT ingresado no es válido. Ingrese el RUT nuevamente.',
    );
  });

  it('TC-CU03-02: muestra la asistencia del estudiante en sus asignaturas inscritas', async () => {
    repository.findStudent.mockResolvedValue({
      rut: '12345678-5',
      name: 'Ana Garcia',
    });
    repository.findStudentAttendanceByRut.mockResolvedValue([
      {
        subjectName: 'Ingeniería de Software',
        attendedClasses: 8,
        totalClasses: 10,
      },
    ]);

    const result = await service.getStudentAttendanceByRut('12345678-5');

    expect(result).toEqual([
      {
        subjectName: 'Ingeniería de Software',
        attendedClasses: 8,
        totalClasses: 10,
        attendancePercentage: 80,
      },
    ]);
  });

  it('TC-CU03-03: rechaza la consulta cuando el estudiante no existe', async () => {
    repository.findStudent.mockResolvedValue(null);

    await expect(
      service.getStudentAttendanceByRut('12345678-5'),
    ).rejects.toThrow(StudentNotFoundException);
  });

  it('TC-CU03-04: retorna porcentaje 0 cuando una asignatura no tiene clases registradas', async () => {
    repository.findStudent.mockResolvedValue({
      rut: '12345678-5',
      name: 'Ana Garcia',
    });
    repository.findStudentAttendanceByRut.mockResolvedValue([
      {
        subjectName: 'Ingeniería de Software',
        attendedClasses: 0,
        totalClasses: 0,
      },
    ]);

    const result = await service.getStudentAttendanceByRut('12345678-5');

    expect(result).toEqual([
      {
        subjectName: 'Ingeniería de Software',
        attendedClasses: 0,
        totalClasses: 0,
        attendancePercentage: 0,
      },
    ]);
  });
});
