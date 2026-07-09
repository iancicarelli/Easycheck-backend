import { AssistanceService } from '../../src/assistance/Assistance.service';
import {
  ClassNotFoundException,
  DuplicateAssistanceException,
  InvalidQRException,
  RegistrationDisabledException,
  SubjectNotAssignedException,
} from '../../src/assistance/domain/assistance.errors';
import { QrService } from '../../src/assistance/application/qr.service';

describe('CU-06 Generacion y validacion QR', () => {
  let service: AssistanceService;
  let repository: {
    findTeaching: jest.Mock;
    findClass: jest.Mock;
    assistanceExists: jest.Mock;
    insertAssistance: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findTeaching: jest.fn(),
      findClass: jest.fn(),
      assistanceExists: jest.fn(),
      insertAssistance: jest.fn(),
    };
    service = new AssistanceService(repository as never, new QrService());
  });

  it('genera QR valido para una clase de asignatura dictada por el profesor', async () => {
    repository.findTeaching.mockResolvedValue(true);
    repository.findClass.mockResolvedValue({
      id: 3,
      subjectId: 'INF-301',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });

    const result = await service.generateAssistanceQR(
      '98765432-1',
      'INF-301',
      3,
    );

    expect(result).toEqual({
      qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
      subjectId: 'INF-301',
      classId: 3,
    });
  });

  it('rechaza generar QR si el profesor no dicta la asignatura', async () => {
    repository.findTeaching.mockResolvedValue(false);

    await expect(
      service.generateAssistanceQR('98765432-1', 'INF-999', 3),
    ).rejects.toThrow(SubjectNotAssignedException);
  });

  it('rechaza generar QR si la clase no existe', async () => {
    repository.findTeaching.mockResolvedValue(true);
    repository.findClass.mockResolvedValue(null);

    await expect(
      service.generateAssistanceQR('98765432-1', 'INF-301', 999),
    ).rejects.toThrow(ClassNotFoundException);
  });

  it('registra asistencia con QR valido', async () => {
    repository.findClass.mockResolvedValue({
      id: 3,
      subjectId: 'INF-301',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
    repository.assistanceExists.mockResolvedValue(false);
    repository.insertAssistance.mockResolvedValue({
      id: 10,
      studentRut: '12345678-9',
      classId: 3,
      subjectId: 'INF-301',
      date: new Date(),
      present: true,
    });

    const result = await service.registerAssistanceQR({
      studentRut: '12345678-9',
      classId: 3,
      subjectId: 'INF-301',
      qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
    });

    expect(result).toEqual({
      message: 'Assistance registered successfully',
      recordId: 10,
      studentRut: '12345678-9',
      classId: 3,
    });
  });

  it('rechaza QR vacio o mal formado', async () => {
    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'INF-301',
        qrSignature: '',
      }),
    ).rejects.toThrow(InvalidQRException);

    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'INF-301',
        qrSignature: 'INVALID_SIGNATURE',
      }),
    ).rejects.toThrow(InvalidQRException);
  });

  it('rechaza QR de otra clase o asignatura', async () => {
    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 4,
        subjectId: 'INF-301',
        qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
      }),
    ).rejects.toThrow(InvalidQRException);

    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'ASG-01',
        qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
      }),
    ).rejects.toThrow(InvalidQRException);
  });

  it('rechaza registro duplicado o clase deshabilitada', async () => {
    repository.findClass.mockResolvedValueOnce({
      id: 3,
      subjectId: 'INF-301',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
    repository.assistanceExists.mockResolvedValueOnce(true);

    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 3,
        subjectId: 'INF-301',
        qrSignature: 'easycheck-qr:INF-301:3:98765432-1',
      }),
    ).rejects.toThrow(DuplicateAssistanceException);

    repository.findClass.mockResolvedValueOnce({
      id: 4,
      subjectId: 'INF-301',
      date: new Date(),
      registrationStatus: 'DISABLED',
    });

    await expect(
      service.registerAssistanceQR({
        studentRut: '12345678-9',
        classId: 4,
        subjectId: 'INF-301',
        qrSignature: 'easycheck-qr:INF-301:4:98765432-1',
      }),
    ).rejects.toThrow(RegistrationDisabledException);
  });
});
