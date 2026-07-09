import { ApiIntranetMockService } from '../../src/api_intranet/api-intranet-mock.service';
import { ApiIntranetSyncService } from '../../src/api_intranet/api-intranet-sync.service';
import { DataRepository } from '../../src/assistance/Data.repository';
import { SubjectRepository } from '../../src/subject/Subject.repository';

describe('API Intranet simulada - sincronizacion academica', () => {
  let dataRepository: DataRepository;
  let subjectRepository: SubjectRepository;
  let service: ApiIntranetSyncService;

  beforeEach(() => {
    dataRepository = new DataRepository();
    subjectRepository = new SubjectRepository();
    service = new ApiIntranetSyncService(
      new ApiIntranetMockService(),
      dataRepository,
      subjectRepository,
    );
  });

  it('sincroniza usuarios, asignaturas, matriculas, docencias y clases', async () => {
    const result = await service.syncAcademicData();

    expect(result).toEqual({
      message: 'Sincronizacion completada',
      users: 3,
      subjects: 2,
      enrollments: 5,
      teachings: 2,
      classes: 4,
    });
    await expect(dataRepository.findStudent('12345678-9')).resolves.toMatchObject(
      {
        rut: '12345678-9',
        name: 'Ana Garcia',
      },
    );
    await expect(subjectRepository.findByCode('ASG-01')).resolves.toMatchObject(
      {
        code: 'ASG-01',
        name: 'Arquitectura de Software',
      },
    );
  });

  it('no duplica datos cuando la sincronizacion se ejecuta mas de una vez', async () => {
    await service.syncAcademicData();

    const result = await service.syncAcademicData();

    expect(result).toMatchObject({
      users: 3,
      subjects: 2,
      enrollments: 5,
      teachings: 2,
      classes: 4,
    });
  });
});
