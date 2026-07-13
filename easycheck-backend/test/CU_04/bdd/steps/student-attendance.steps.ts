import { defineFeature, loadFeature } from 'jest-cucumber';
import type { CurrentStudentAttendanceDto } from '../../../../src/assistance/Assistance.service';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature(
  'test/CU_04/bdd/features/student-attendance.feature',
);

defineFeature(feature, (test) => {
  test('Estudiante consulta una asignatura matriculada', ({
    given,
    when,
    then,
  }) => {
    const context = createAssistanceContext();
    let result: CurrentStudentAttendanceDto;

    given(
      'el estudiante autenticado esta matriculado en una asignatura',
      () => {
        context.data.seedStudent('11111111-1', 'Estudiante Uno');
        context.data.seedEnrollment('11111111-1', 'ASG-01');
        context.data.seedClass({
          id: 1,
          subjectId: 'ASG-01',
          date: new Date(),
          registrationStatus: 'ENABLED',
        });
        context.data.seedAssistance({
          id: 1,
          studentRut: '11111111-1',
          classId: 1,
          subjectId: 'ASG-01',
          date: new Date(),
          present: true,
        });
      },
    );

    when('consulta su asistencia en la asignatura', async () => {
      result = await context.service.getCurrentStudentSubjectAttendance(
        '11111111-1',
        'ASG-01',
      );
    });

    then('obtiene sus clases asistidas y el porcentaje', () => {
      expect(result).toMatchObject({
        attendedClasses: 1,
        totalClasses: 1,
        attendancePercentage: 100,
      });
    });
  });
});
