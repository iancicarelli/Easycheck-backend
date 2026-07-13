import { Inject, Injectable } from '@nestjs/common';
import { DataRepository } from '../../assistance/Data.repository';
import { SubjectRepository } from '../../subject/Subject.repository';
import { USERS_REPOSITORY_PORT } from '../../users/application/user-registration.ports';
import type { UsersRepositoryPort } from '../../users/application/user-registration.ports';
import { UserRole } from '../../users/domain/user-role.enum';
import { InMemoryInstitutionalIdentityService } from '../../users/infrastructure/in-memory-institutional-identity.service';
import type { AuthRole } from '../../auth/domain/auth.types';
import { ApiIntranetMockService } from '../infrastructure/api-intranet-mock.service';
import { IntranetRole } from '../domain/api-intranet.types';

export interface SyncResult {
  source: 'API_INTRANET_SIMULADA';
  users: number;
  students: number;
  professors: number;
  subjects: number;
  enrollments: number;
  teachings: number;
  classes: number;
}

@Injectable()
export class SyncApiIntranetService {
  constructor(
    private readonly intranet: ApiIntranetMockService,
    private readonly data: DataRepository,
    private readonly subjects: SubjectRepository,
    private readonly identities: InMemoryInstitutionalIdentityService,
    @Inject(USERS_REPOSITORY_PORT)
    private readonly users: UsersRepositoryPort,
  ) {}

  async synchronize(): Promise<SyncResult> {
    const snapshot = this.intranet.getSnapshot();

    for (const user of snapshot.users) {
      this.identities.seedCredential({
        rut: user.rut,
        password: user.simulatedPassword,
        fullName: user.fullName,
        email: user.institutionalEmail,
        role: this.mapAuthRole(user.role),
      });
      if (!(await this.users.existsByRut(user.rut))) {
        await this.users.save({
          rut: user.rut,
          institutionalEmail: user.institutionalEmail,
          fullName: user.fullName,
          role: this.mapRole(user.role),
          status: 'ACTIVE',
        });
      }
      if (user.role === 'ESTUDIANTE') {
        await this.data.upsertStudent(user.rut, user.fullName);
      }
      if (user.role === 'PROFESOR') {
        await this.data.upsertProfessor(user.rut, user.fullName);
      }
    }

    for (const subject of snapshot.subjects) {
      await this.subjects.upsertFromIntranet({
        code: subject.code,
        name: subject.name,
        career: subject.career,
        externalId: subject.externalId,
      });
    }
    for (const enrollment of snapshot.enrollments) {
      await this.data.upsertEnrollment(
        enrollment.studentRut,
        enrollment.subjectCode,
      );
    }
    for (const teaching of snapshot.teachings) {
      await this.data.upsertTeaching(
        teaching.professorRut,
        teaching.subjectCode,
      );
    }
    for (const classSession of snapshot.classes) {
      await this.data.upsertClass({
        id: classSession.id,
        subjectId: classSession.subjectCode,
        date: new Date(classSession.date),
        registrationStatus: classSession.registrationStatus,
      });
    }

    return {
      source: 'API_INTRANET_SIMULADA',
      users: snapshot.users.length,
      students: await this.data.countStudents(),
      professors: await this.data.countProfessors(),
      subjects: await this.subjects.count(),
      enrollments: await this.data.countEnrollments(),
      teachings: await this.data.countTeachings(),
      classes: await this.data.countClasses(),
    };
  }

  private mapRole(role: IntranetRole): UserRole {
    const roles: Record<IntranetRole, UserRole> = {
      ESTUDIANTE: UserRole.ESTUDIANTE,
      PROFESOR: UserRole.PROFESOR,
      DIRECTOR_CARRERA: UserRole.DIRECTOR_CARRERA,
      ADMINISTRADOR: UserRole.ADMINISTRADOR,
    };
    return roles[role];
  }

  private mapAuthRole(role: IntranetRole): AuthRole {
    const roles: Record<IntranetRole, AuthRole> = {
      ESTUDIANTE: 'estudiante',
      PROFESOR: 'profesor',
      DIRECTOR_CARRERA: 'director',
      ADMINISTRADOR: 'administrador',
    };
    return roles[role];
  }
}
