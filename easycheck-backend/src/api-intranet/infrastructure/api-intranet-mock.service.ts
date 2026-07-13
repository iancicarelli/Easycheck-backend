import { Injectable } from '@nestjs/common';
import { IntranetSnapshot } from '../domain/api-intranet.types';

@Injectable()
export class ApiIntranetMockService {
  getSnapshot(): IntranetSnapshot {
    return {
      users: [
        {
          rut: '11111111-1',
          institutionalEmail: 'estudiante1@ufromail.cl',
          fullName: 'Estudiante Uno',
          role: 'ESTUDIANTE',
          simulatedPassword: 'demo',
        },
        {
          rut: '55555555-5',
          institutionalEmail: 'estudiante2@ufromail.cl',
          fullName: 'Estudiante Dos',
          role: 'ESTUDIANTE',
          simulatedPassword: 'demo',
        },
        {
          rut: '22222222-2',
          institutionalEmail: 'profesor@ufrontera.cl',
          fullName: 'Profesor Demo',
          role: 'PROFESOR',
          simulatedPassword: 'demo',
        },
        {
          rut: '33333333-3',
          institutionalEmail: 'director@ufrontera.cl',
          fullName: 'Director Demo',
          role: 'DIRECTOR_CARRERA',
          simulatedPassword: 'demo',
        },
        {
          rut: '44444444-4',
          institutionalEmail: 'admin@ufrontera.cl',
          fullName: 'Administrador Demo',
          role: 'ADMINISTRADOR',
          simulatedPassword: 'demo',
        },
      ],
      subjects: [
        {
          externalId: 'intranet-asg-01',
          code: 'ASG-01',
          name: 'Asignatura Demo',
          career: 'Ingenieria Civil Informatica',
        },
        {
          externalId: 'intranet-inf-301',
          code: 'INF-301',
          name: 'Ingenieria de Software',
          career: 'Ingenieria Civil Informatica',
        },
      ],
      enrollments: [
        { studentRut: '11111111-1', subjectCode: 'ASG-01' },
        { studentRut: '55555555-5', subjectCode: 'INF-301' },
      ],
      teachings: [
        { professorRut: '22222222-2', subjectCode: 'ASG-01' },
        { professorRut: '22222222-2', subjectCode: 'INF-301' },
      ],
      classes: [
        {
          id: 1001,
          subjectCode: 'ASG-01',
          date: '2026-07-01T12:00:00.000Z',
          registrationStatus: 'ENABLED',
        },
        {
          id: 1002,
          subjectCode: 'INF-301',
          date: '2026-07-02T12:00:00.000Z',
          registrationStatus: 'ENABLED',
        },
      ],
    };
  }
}
