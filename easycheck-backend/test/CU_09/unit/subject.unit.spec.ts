import { SubjectService } from '../../../src/subject/Subject.service';
import { Subject } from '../../../src/subject/Subject.repository';

describe('CU-09 Registro de nueva asignatura (TDD)', () => {
  let service: SubjectService;
  let repository: {
    findByCode: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findByCode: jest.fn(),
      save: jest.fn(),
    };
    service = new SubjectService(repository);
  });

  it('TC-CU09-01: registra una asignatura con datos válidos', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.save.mockImplementation((subject: Subject) =>
      Promise.resolve(subject),
    );

    const result = await service.createSubject({
      code: 'INF-301',
      name: 'Ingeniería de Software',
      career: 'Ingeniería Informática',
    });

    expect(result).toEqual(
      expect.objectContaining({
        message: 'Asignatura registrada correctamente',
      }),
    );
  });

  it('TC-CU09-02: rechaza el registro cuando faltan datos obligatorios', async () => {
    await expect(
      service.createSubject({ code: '', name: '', career: '' }),
    ).rejects.toThrow('Debe completar los datos obligatorios');
  });

  it('normaliza espacios y marca la asignatura con origen LOCAL', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.save.mockImplementation((subject: Subject) =>
      Promise.resolve(subject),
    );
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
      source: 'LOCAL',
    });
  });

  it('TC-CU09-03: rechaza el registro cuando el código ya existe', async () => {
    repository.findByCode.mockResolvedValue({
      code: 'INF-301',
      name: 'Ingeniería de Software',
      career: 'Ingeniería Informática',
    });

    await expect(
      service.createSubject({
        code: 'INF-301',
        name: 'Ingeniería de Software',
        career: 'Ingeniería Informática',
      }),
    ).rejects.toThrow('El código ingresado ya existe en el sistema');
  });

  it('TC-CU09-04: rechaza el registro cuando el nombre tiene caracteres no permitidos', async () => {
    repository.findByCode.mockResolvedValue(null);

    await expect(
      service.createSubject({
        code: 'INF-301',
        name: 'Cálculo#1@',
        career: 'Ingeniería Informática',
      }),
    ).rejects.toThrow('Caracteres no permitidos');
  });
});
