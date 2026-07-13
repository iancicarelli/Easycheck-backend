import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import { SubjectNotAssignedException } from '../../../src/common/exceptions';

describe('CU-05 asistencia de una asignatura del profesor', () => {
  let repository: {
    findTeaching: jest.Mock;
    findStudentsAssistanceBySubject: jest.Mock;
  };
  let service: AssistanceService;

  beforeEach(() => {
    repository = {
      findTeaching: jest.fn().mockResolvedValue(true),
      findStudentsAssistanceBySubject: jest.fn().mockResolvedValue([
        {
          rut: '11111111-1',
          name: 'Estudiante Uno',
          classesAttended: 1,
          totalClasses: 2,
          assistancePercentage: 50,
        },
      ]),
    };
    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('retorna estudiantes cuando el profesor imparte la asignatura', async () => {
    await expect(
      service.getStudentsAssistanceBySubject('22222222-2', 'ASG-01'),
    ).resolves.toHaveLength(1);
    expect(repository.findTeaching).toHaveBeenCalledWith(
      '22222222-2',
      'ASG-01',
    );
  });

  it('rechaza una asignatura no impartida por el profesor', async () => {
    repository.findTeaching.mockResolvedValue(false);
    await expect(
      service.getStudentsAssistanceBySubject('22222222-2', 'INF-999'),
    ).rejects.toThrow(SubjectNotAssignedException);
    expect(repository.findStudentsAssistanceBySubject).not.toHaveBeenCalled();
  });
});
