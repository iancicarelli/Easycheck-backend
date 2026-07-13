import { defineFeature, loadFeature } from 'jest-cucumber';
import type { StudentAssistance } from '../../../../src/assistance/Data.repository';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature(
  'test/CU_05/bdd/features/professor-attendance.feature',
);

defineFeature(feature, (test) => {
  test('Profesor consulta estudiantes de su asignatura', ({
    given,
    when,
    then,
  }) => {
    const context = createAssistanceContext();
    let result: StudentAssistance[] = [];

    given('el profesor imparte una asignatura con estudiantes', () => {
      context.data.seedStudent('11111111-1', 'Estudiante Uno');
      context.data.seedEnrollment('11111111-1', 'ASG-01');
      context.data.seedTeaching('22222222-2', 'ASG-01');
      context.data.seedClass({
        id: 1,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
    });

    when('consulta la asistencia de la asignatura', async () => {
      result = await context.service.getStudentsAssistanceBySubject(
        '22222222-2',
        'ASG-01',
      );
    });

    then('obtiene la lista de estudiantes y sus porcentajes', () => {
      expect(result).toEqual([
        expect.objectContaining({ rut: '11111111-1', assistancePercentage: 0 }),
      ]);
    });
  });
});
