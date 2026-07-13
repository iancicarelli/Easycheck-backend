import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import {
  ClassNotFoundException,
  RegistrationAlreadyDisabledException,
  SubjectNotAssignedException,
} from '../../../src/common/exceptions';

describe('CU-07 Deshabilitar el registro de asistencia (TDD)', () => {
  let service: AssistanceService;
  let repository: {
    findClass: jest.Mock;
    findTeaching: jest.Mock;
    updateClassRegistrationStatus: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findClass: jest.fn(),
      findTeaching: jest.fn(),
      updateClassRegistrationStatus: jest.fn(),
    };

    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('TC-CU07-01: deshabilita el registro de una clase que el profesor dicta', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
    repository.findTeaching.mockResolvedValue(true);
    repository.updateClassRegistrationStatus.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
    });

    const result = await service.disableRegistration('11111111-1', 1);

    expect(result).toEqual({
      message: 'Registration disabled successfully',
      classId: 1,
      registrationStatus: 'DISABLED',
    });
    expect(repository.updateClassRegistrationStatus).toHaveBeenCalledWith(
      1,
      'DISABLED',
    );
  });

  it('TC-CU07-02: rechaza cuando el profesor no dicta la asignatura de la clase', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
    repository.findTeaching.mockResolvedValue(false);

    await expect(service.disableRegistration('22222222-2', 1)).rejects.toThrow(
      SubjectNotAssignedException,
    );
    expect(repository.updateClassRegistrationStatus).not.toHaveBeenCalled();
  });

  it('TC-CU07-03: rechaza cuando el registro ya se encuentra deshabilitado', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
    });
    repository.findTeaching.mockResolvedValue(true);

    await expect(service.disableRegistration('11111111-1', 1)).rejects.toThrow(
      RegistrationAlreadyDisabledException,
    );
    expect(repository.updateClassRegistrationStatus).not.toHaveBeenCalled();
  });

  it('TC-CU07-04: rechaza cuando la clase no existe', async () => {
    repository.findClass.mockResolvedValue(null);

    await expect(service.disableRegistration('11111111-1', 99)).rejects.toThrow(
      ClassNotFoundException,
    );
    expect(repository.updateClassRegistrationStatus).not.toHaveBeenCalled();
  });
});
