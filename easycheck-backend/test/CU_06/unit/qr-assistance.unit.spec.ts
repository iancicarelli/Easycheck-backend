import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import {
  ClassNotFoundException,
  RegistrationDisabledException,
  StudentNotEnrolledException,
} from '../../../src/common/exceptions';

describe('CU-06 generacion de QR del estudiante', () => {
  let repository: {
    findStudent: jest.Mock;
    findClass: jest.Mock;
    isStudentEnrolled: jest.Mock;
  };
  let service: AssistanceService;

  beforeEach(() => {
    repository = {
      findStudent: jest.fn().mockResolvedValue({
        rut: '11111111-1',
        name: 'Estudiante Uno',
      }),
      findClass: jest.fn().mockResolvedValue({
        id: 1001,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      }),
      isStudentEnrolled: jest.fn().mockResolvedValue(true),
    };
    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('genera el QR para una clase en la que esta matriculado', async () => {
    await expect(
      service.generateStudentQr('11111111-1', 1001),
    ).resolves.toMatchObject({
      studentRut: '11111111-1',
      classId: 1001,
      subjectId: 'ASG-01',
    });
  });

  it('rechaza una clase inexistente', async () => {
    repository.findClass.mockResolvedValue(null);
    await expect(service.generateStudentQr('11111111-1', 9999)).rejects.toThrow(
      ClassNotFoundException,
    );
  });

  it('rechaza un estudiante no matriculado', async () => {
    repository.isStudentEnrolled.mockResolvedValue(false);
    await expect(service.generateStudentQr('11111111-1', 1001)).rejects.toThrow(
      StudentNotEnrolledException,
    );
  });

  it('rechaza una clase con registro cerrado', async () => {
    repository.findClass.mockResolvedValue({
      id: 1001,
      subjectId: 'ASG-01',
      date: new Date(),
      registrationStatus: 'DISABLED',
    });
    await expect(service.generateStudentQr('11111111-1', 1001)).rejects.toThrow(
      RegistrationDisabledException,
    );
  });
});
