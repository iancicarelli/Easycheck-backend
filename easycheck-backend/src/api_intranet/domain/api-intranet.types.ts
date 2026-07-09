import type { ClassSession } from '../../assistance/Data.repository';
import type { Subject } from '../../subject/domain/subject.types';

export interface ApiIntranetUser {
  rut: string;
  fullName: string;
  role: 'ESTUDIANTE' | 'PROFESOR' | 'ADMINISTRATIVO' | 'DIRECTOR_CARRERA';
  institutionalEmail: string;
}

export interface ApiIntranetEnrollment {
  studentRut: string;
  subjectId: string;
}

export interface ApiIntranetTeaching {
  professorRut: string;
  subjectId: string;
}

export interface ApiIntranetSyncResult {
  message: string;
  users: number;
  subjects: number;
  enrollments: number;
  teachings: number;
  classes: number;
}

export type ApiIntranetSubject = Subject;
export type ApiIntranetClassSession = ClassSession;
