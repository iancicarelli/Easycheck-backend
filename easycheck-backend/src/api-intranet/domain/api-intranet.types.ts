export type IntranetRole =
  | 'ESTUDIANTE'
  | 'PROFESOR'
  | 'DIRECTOR_CARRERA'
  | 'ADMINISTRADOR';

export interface IntranetUser {
  rut: string;
  institutionalEmail: string;
  fullName: string;
  role: IntranetRole;
  simulatedPassword: string;
}

export interface IntranetSubject {
  externalId: string;
  code: string;
  name: string;
  career: string;
}

export interface IntranetSnapshot {
  users: IntranetUser[];
  subjects: IntranetSubject[];
  enrollments: { studentRut: string; subjectCode: string }[];
  teachings: { professorRut: string; subjectCode: string }[];
  classes: {
    id: number;
    subjectCode: string;
    date: string;
    registrationStatus: 'ENABLED' | 'DISABLED';
  }[];
}
