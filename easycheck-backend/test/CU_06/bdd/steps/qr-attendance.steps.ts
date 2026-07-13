import { defineFeature, loadFeature } from 'jest-cucumber';
import { createAssistanceContext } from '../../../SHARED/assistance-context';

const feature = loadFeature('test/CU_06/bdd/features/qr-attendance.feature');

defineFeature(feature, (test) => {
  test('Estudiante genera QR y el lector registra asistencia', ({
    given,
    when,
    then,
  }) => {
    const context = createAssistanceContext();

    given('el estudiante esta matriculado en una clase habilitada', () => {
      context.data.seedStudent('11111111-1', 'Estudiante Uno');
      context.data.seedEnrollment('11111111-1', 'ASG-01');
      context.data.seedClass({
        id: 1001,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
    });

    when('genera su QR y el lector lo valida', async () => {
      const generated = await context.service.generateStudentQr(
        '11111111-1',
        1001,
      );
      await context.service.registerAssistanceQR({
        qrToken: generated.qrToken,
      });
    });

    then('la asistencia queda registrada una sola vez', async () => {
      await expect(
        context.data.assistanceExists('11111111-1', 1001),
      ).resolves.toBe(true);
    });
  });
});
