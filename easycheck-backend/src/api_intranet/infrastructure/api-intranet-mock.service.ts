import { Injectable } from '@nestjs/common';
import {
  ApiIntranetClassSession,
  ApiIntranetEnrollment,
  ApiIntranetSubject,
  ApiIntranetTeaching,
  ApiIntranetUser,
} from '../domain/api-intranet.types';

@Injectable()
export class ApiIntranetMockService {
  getUsers(): ApiIntranetUser[] {
    return [
      {
        rut: '12345678-9',
        fullName: 'Ana Garcia',
        role: 'ESTUDIANTE',
        institutionalEmail: 'a.garcia01@ufromail.cl',
      },
      {
        rut: '23456789-0',
        fullName: 'Carlos Lopez',
        role: 'ESTUDIANTE',
        institutionalEmail: 'c.lopez01@ufromail.cl',
      },
      {
        rut: '34567890-1',
        fullName: 'Maria Perez',
        role: 'ESTUDIANTE',
        institutionalEmail: 'm.perez01@ufromail.cl',
      },
      {
        rut: '98765432-1',
        fullName: 'Profesor EasyCheck',
        role: 'PROFESOR',
        institutionalEmail: 'p.easycheck01@ufromail.cl',
      },
    ];
  }

  getSubjects(): ApiIntranetSubject[] {
    return [
      {
        code: 'ASG-01',
        name: 'Arquitectura de Software',
        career: 'Ingenieria Informatica',
      },
      {
        code: 'INF-301',
        name: 'Ingenieria de Software',
        career: 'Ingenieria Informatica',
      },
    ];
  }

  getEnrollments(): ApiIntranetEnrollment[] {
    return [
      { studentRut: '12345678-9', subjectId: 'ASG-01' },
      { studentRut: '23456789-0', subjectId: 'ASG-01' },
      { studentRut: '34567890-1', subjectId: 'ASG-01' },
      { studentRut: '12345678-9', subjectId: 'INF-301' },
      { studentRut: '23456789-0', subjectId: 'INF-301' },
    ];
  }

  getTeachings(): ApiIntranetTeaching[] {
    return [
      { professorRut: '98765432-1', subjectId: 'ASG-01' },
      { professorRut: '98765432-1', subjectId: 'INF-301' },
    ];
  }

  getClasses(): ApiIntranetClassSession[] {
    return [
      {
        id: 1,
        subjectId: 'ASG-01',
        date: new Date('2026-07-08T12:00:00.000Z'),
        registrationStatus: 'ENABLED',
      },
      {
        id: 2,
        subjectId: 'ASG-01',
        date: new Date('2026-07-10T12:00:00.000Z'),
        registrationStatus: 'ENABLED',
      },
      {
        id: 3,
        subjectId: 'INF-301',
        date: new Date('2026-07-09T14:00:00.000Z'),
        registrationStatus: 'ENABLED',
      },
      {
        id: 4,
        subjectId: 'INF-301',
        date: new Date('2026-07-11T14:00:00.000Z'),
        registrationStatus: 'DISABLED',
      },
    ];
  }
}
