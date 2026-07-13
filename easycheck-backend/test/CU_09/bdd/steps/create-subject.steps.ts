import { defineFeature, loadFeature } from 'jest-cucumber';
import { SubjectRepository } from '../../../../src/subject/Subject.repository';
import { SubjectService } from '../../../../src/subject/Subject.service';

const feature = loadFeature('test/CU_09/bdd/features/create-subject.feature');

defineFeature(feature, (test) => {
  test('Administrador registra una asignatura local', ({
    given,
    when,
    then,
  }) => {
    const repository = new SubjectRepository();
    const service = new SubjectService(repository);

    given('no existe una asignatura con el codigo indicado', async () => {
      await expect(repository.findByCode('INF-301')).resolves.toBeNull();
    });

    when('el administrador registra la nueva asignatura', async () => {
      await service.createSubject({
        code: 'INF-301',
        name: 'Ingenieria de Software',
        career: 'Ingenieria Informatica',
      });
    });

    then('la asignatura queda almacenada con origen local', async () => {
      await expect(repository.findByCode('INF-301')).resolves.toMatchObject({
        source: 'LOCAL',
      });
    });
  });
});
