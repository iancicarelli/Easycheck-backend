import { Inject, Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import {
  InstitutionalUserNotFoundError,
  InvalidRutFormatError,
  InvalidInstitutionalCredentialsError,
  RoleNotAllowedError,
  RutRequiredError,
  UserAlreadyRegisteredError,
} from '../domain/user-registration.errors';
import { UserRole } from '../domain/user-role.enum';
import {
  INSTITUTIONAL_IDENTITY_PORT,
  USERS_REPOSITORY_PORT,
} from './user-registration.ports';
import type {
  InstitutionalIdentityPort,
  UsersRepositoryPort,
} from './user-registration.ports';
import { RegisterUserDto } from './register-user.dto';
import { DataRepository } from '../../assistance/Data.repository';
import { SubjectRepository } from '../../subject/Subject.repository';

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(INSTITUTIONAL_IDENTITY_PORT)
    private readonly institutionalIdentity: InstitutionalIdentityPort,
    @Inject(USERS_REPOSITORY_PORT)
    private readonly usersRepository: UsersRepositoryPort,
    private readonly data: DataRepository,
    private readonly subjects: SubjectRepository,
  ) {}

  async execute(command: RegisterUserDto): Promise<User> {
    if (!command.rut?.trim()) {
      throw new RutRequiredError();
    }

    if (!/^\d{7,8}-[\dkK]$/.test(command.rut)) {
      throw new InvalidRutFormatError(command.rut);
    }

    const registerableRoles: UserRole[] = [
      UserRole.ESTUDIANTE,
      UserRole.PROFESOR,
      UserRole.DIRECTOR_CARRERA,
    ];
    if (!registerableRoles.includes(command.role)) {
      throw new RoleNotAllowedError(command.role);
    }

    const institutionalUser =
      await this.institutionalIdentity.validateInstitutionalUser({
        rut: command.rut,
        institutionalEmail: command.institutionalEmail,
        institutionalPassword: command.institutionalPassword,
      });

    if (!institutionalUser) {
      if (!command.institutionalEmail.endsWith('@ufromail.cl')) {
        throw new InvalidInstitutionalCredentialsError();
      }
      throw new InstitutionalUserNotFoundError(command.rut);
    }

    const alreadyRegistered = await this.usersRepository.existsByRut(
      command.rut,
    );
    if (alreadyRegistered) {
      throw new UserAlreadyRegisteredError(command.rut);
    }

    const user = await this.usersRepository.save({
      rut: institutionalUser.rut,
      institutionalEmail: institutionalUser.institutionalEmail,
      fullName: command.fullName || institutionalUser.fullName,
      role: command.role,
      status: 'ACTIVE',
    });

    // Un estudiante recién registrado queda inscrito en TODAS las asignaturas
    // existentes, para que sirva de inmediato como caso de prueba (asistencia,
    // QR, etc.). La inscripción "real" sigue viniendo del sync de Intranet;
    // esto es una comodidad para pruebas/demo.
    if (command.role === UserRole.ESTUDIANTE) {
      await this.enrollStudentInAllSubjects(user.rut, user.fullName);
    }

    return user;
  }

  private async enrollStudentInAllSubjects(
    rut: string,
    fullName: string,
  ): Promise<void> {
    await this.data.upsertStudent(rut, fullName);
    const subjects = await this.subjects.findAll();
    for (const subject of subjects) {
      await this.data.upsertEnrollment(rut, subject.code);
    }
  }
}
