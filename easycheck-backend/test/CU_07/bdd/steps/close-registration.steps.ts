import { defineFeature, loadFeature } from 'jest-cucumber';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature(
  'test/CU_07/bdd/features/close-registration.feature',
);

defineFeature(feature, (test) => {
  test('Profesor cierra nuevos registros de su clase', ({
    given,
    when,
    then,
  }) => {
    const context = createAssistanceContext();

    given('el profesor imparte una clase con registro habilitado', () => {
      context.data.seedTeaching('22222222-2', 'ASG-01');
      context.data.seedClass({
        id: 1001,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
    });

    when('cierra el registro de asistencia', async () => {
      await context.service.disableRegistration('22222222-2', 1001);
    });

    then('la clase deja de aceptar nuevos registros', async () => {
      await expect(context.data.findClass(1001)).resolves.toMatchObject({
        registrationStatus: 'DISABLED',
      });
    });
  });
});
