import { defineFeature, loadFeature } from 'jest-cucumber';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature('test/CU_08/bdd/features/edit-attendance.feature');

defineFeature(feature, (test) => {
  test('Profesor corrige asistencia durante la ventana de edicion', ({
    given,
    when,
    then,
  }) => {
    const context = createAssistanceContext();

    given('la clase esta cerrada y tiene una asistencia registrada', () => {
      context.data.seedTeaching('22222222-2', 'ASG-01');
      context.data.seedClass({
        id: 1001,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'DISABLED',
      });
      context.data.seedAssistance({
        id: 10,
        studentRut: '11111111-1',
        classId: 1001,
        subjectId: 'ASG-01',
        date: new Date(),
        present: true,
      });
    });

    when('el profesor habilita edicion y corrige la asistencia', async () => {
      await context.service.enableEditing('22222222-2', 1001);
      await context.service.editAssistance('22222222-2', 10, false);
    });

    then('el registro cambia sin reabrir nuevos registros', async () => {
      await expect(context.data.findAssistanceById(10)).resolves.toMatchObject({
        present: false,
      });
      await expect(context.data.findClass(1001)).resolves.toMatchObject({
        registrationStatus: 'DISABLED',
        editingStatus: 'ENABLED',
      });
    });
  });
});
