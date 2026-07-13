import { SyncApiIntranetService } from '../../../src/api-intranet/application/sync-api-intranet.service';
import { ApiIntranetMockService } from '../../../src/api-intranet/infrastructure/api-intranet-mock.service';
import { DataRepository } from '../../../src/assistance/Data.repository';
import { SubjectRepository } from '../../../src/subject/Subject.repository';
import { InMemoryInstitutionalIdentityService } from '../../../src/users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../../../src/users/infrastructure/in-memory-users.repository';

describe('API Intranet simulada - sincronizacion unitaria', () => {
  let data: DataRepository;
  let subjects: SubjectRepository;
  let users: InMemoryUsersRepository;
  let service: SyncApiIntranetService;

  beforeEach(() => {
    data = new DataRepository();
    subjects = new SubjectRepository();
    users = new InMemoryUsersRepository();
    users.reset();
    service = new SyncApiIntranetService(
      new ApiIntranetMockService(),
      data,
      subjects,
      new InMemoryInstitutionalIdentityService(),
      users,
    );
  });

  it('sincroniza cuentas y datos academicos', async () => {
    await expect(service.synchronize()).resolves.toMatchObject({
      source: 'API_INTRANET_SIMULADA',
      users: 5,
      students: 2,
      professors: 1,
      subjects: 2,
      enrollments: 2,
      teachings: 2,
      classes: 2,
    });
    await expect(users.findByRut('11111111-1')).resolves.toMatchObject({
      role: 'ESTUDIANTE',
      status: 'ACTIVE',
    });
  });

  it('es idempotente al ejecutarse mas de una vez', async () => {
    const first = await service.synchronize();
    const second = await service.synchronize();
    expect(second).toEqual(first);
  });
});
