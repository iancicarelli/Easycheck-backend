import { defineFeature, loadFeature } from 'jest-cucumber';
import type { StudentSubjectAttendanceDto } from '../../../../src/assistance/Assistance.service';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature('test/CU_03/bdd/features/attendance.feature');

defineFeature(feature, (test) => {
  test('Director consulta la asistencia por RUT', ({ given, when, then }) => {
    const context = createAssistanceContext();
    let result: StudentSubjectAttendanceDto[] = [];

    given(
      'existe un estudiante matriculado con una clase asistida de dos',
      () => {
        context.data.seedStudent('11111111-1', 'Estudiante Uno');
        context.data.seedEnrollment('11111111-1', 'ASG-01');
        context.data.seedClass({
          id: 1,
          subjectId: 'ASG-01',
          date: new Date(),
          registrationStatus: 'ENABLED',
        });
        context.data.seedClass({
          id: 2,
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

    when('el director consulta la asistencia del estudiante', async () => {
      result = await context.service.getStudentAttendanceByRut('11111111-1');
    });

    then('obtiene un porcentaje de asistencia de 50', () => {
      expect(result).toEqual([
        expect.objectContaining({ attendancePercentage: 50 }),
      ]);
    });
  });
});
