import { AssistanceService } from '../../../src/assistance/Assistance.service';
import { QrTokenService } from '../../../src/assistance/qr-token.service';
import {
  AssistanceRecordNotFoundException,
  EditingAlreadyEnabledException,
  RegistrationMustBeDisabledException,
  SubjectNotAssignedException,
} from '../../../src/common/exceptions';

describe('CU-08 Habilitar la edición del registro de asistencia (TDD)', () => {
  let service: AssistanceService;
  let repository: {
    findClass: jest.Mock;
    findTeaching: jest.Mock;
    updateClassRegistrationStatus: jest.Mock;
    updateClassEditingStatus: jest.Mock;
    findAssistanceById: jest.Mock;
    updateAssistancePresence: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findClass: jest.fn(),
      findTeaching: jest.fn(),
      updateClassRegistrationStatus: jest.fn(),
      updateClassEditingStatus: jest.fn(),
      findAssistanceById: jest.fn(),
      updateAssistancePresence: jest.fn(),
    };

    service = new AssistanceService(repository as never, new QrTokenService());
  });

  it('TC-CU08-01: habilita edicion sin reabrir nuevos registros', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
      editingStatus: 'DISABLED',
    });
    repository.findTeaching.mockResolvedValue(true);
    repository.updateClassEditingStatus.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
      editingStatus: 'ENABLED',
    });

    const result = await service.enableEditing('11111111-1', 1);

    expect(result).toEqual({
      message: 'Editing enabled successfully',
      classId: 1,
      editingStatus: 'ENABLED',
      registrationStatus: 'DISABLED',
    });
    expect(repository.updateClassEditingStatus).toHaveBeenCalledWith(
      1,
      'ENABLED',
    );
    expect(repository.updateClassRegistrationStatus).not.toHaveBeenCalled();
  });

  it('TC-CU08-02: exige cerrar el registro antes de habilitar edicion', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'ENABLED',
      editingStatus: 'DISABLED',
    });
    repository.findTeaching.mockResolvedValue(true);

    await expect(service.enableEditing('11111111-1', 1)).rejects.toThrow(
      RegistrationMustBeDisabledException,
    );
    expect(repository.updateClassEditingStatus).not.toHaveBeenCalled();
  });

  it('TC-CU08-03: rechaza habilitar una ventana ya habilitada', async () => {
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
      editingStatus: 'ENABLED',
    });
    repository.findTeaching.mockResolvedValue(true);
    await expect(service.enableEditing('11111111-1', 1)).rejects.toThrow(
      EditingAlreadyEnabledException,
    );
  });

  it('TC-CU08-03: edita el estado de asistencia de un estudiante (presente → ausente)', async () => {
    repository.findAssistanceById.mockResolvedValue({
      id: 10,
      studentRut: '12345678-5',
      classId: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      present: true,
    });
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
      editingStatus: 'ENABLED',
    });
    repository.findTeaching.mockResolvedValue(true);
    repository.updateAssistancePresence.mockResolvedValue({
      id: 10,
      studentRut: '12345678-5',
      classId: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      present: false,
    });

    const result = await service.editAssistance('11111111-1', 10, false);

    expect(result).toEqual({
      message: 'Assistance record updated successfully',
      recordId: 10,
      studentRut: '12345678-5',
      present: false,
    });
    expect(repository.updateAssistancePresence).toHaveBeenCalledWith(10, false);
  });

  it('TC-CU08-04: rechaza la edición cuando el profesor no dicta la asignatura', async () => {
    repository.findAssistanceById.mockResolvedValue({
      id: 10,
      studentRut: '12345678-5',
      classId: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      present: true,
    });
    repository.findClass.mockResolvedValue({
      id: 1,
      subjectId: 'ICC-757',
      date: new Date(),
      registrationStatus: 'DISABLED',
      editingStatus: 'ENABLED',
    });
    repository.findTeaching.mockResolvedValue(false);

    await expect(
      service.editAssistance('22222222-2', 10, false),
    ).rejects.toThrow(SubjectNotAssignedException);
    expect(repository.updateAssistancePresence).not.toHaveBeenCalled();
  });

  it('TC-CU08-05: rechaza la edición cuando el registro de asistencia no existe', async () => {
    repository.findAssistanceById.mockResolvedValue(null);

    await expect(
      service.editAssistance('11111111-1', 99, true),
    ).rejects.toThrow(AssistanceRecordNotFoundException);
    expect(repository.updateAssistancePresence).not.toHaveBeenCalled();
  });
});
