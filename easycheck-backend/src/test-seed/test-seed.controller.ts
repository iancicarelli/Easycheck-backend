import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthRepository } from '../auth/Auth.repository';
import { SubjectRepository } from '../subject/Subject.repository';
import { DataRepository } from '../assistance/Data.repository';
import { InMemoryInstitutionalIdentityService } from '../users/infrastructure/in-memory-institutional-identity.service';
import { InMemoryUsersRepository } from '../users/infrastructure/in-memory-users.repository';
import { UserRole } from '../users/domain/user-role.enum';

/**
 * Endpoint EXCLUSIVO para testing/desarrollo.
 *
 * Los repositorios in-memory arrancan vacíos en runtime y no hay seed en el
 * bootstrap, por lo que los flujos "happy path" no eran alcanzables vía HTTP.
 * Este controlador siembra un conjunto coherente de datos en los tres
 * repositorios (Auth, Subject y Assistance/Data) que comparten instancia
 * (singleton) con los controladores reales.
 *
 * El módulo que lo monta (TestSeedModule) sólo se importa cuando
 * NODE_ENV !== 'production' (ver app.module.ts), de modo que esta ruta no
 * existe en producción.
 */
@Controller('api/v1/test')
export class TestSeedController {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly dataRepository: DataRepository,
    private readonly institutionalIdentity: InMemoryInstitutionalIdentityService,
    private readonly usersRepository: InMemoryUsersRepository,
  ) {}

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  seed() {
    // ── Idempotencia: limpiar antes de sembrar ──────────────────────────────
    this.authRepository.reset();
    this.subjectRepository.reset();
    this.dataRepository.reset();
    this.institutionalIdentity.reset();

    // ── Auth (CU-01) ────────────────────────────────────────────────────────
    // El tipo UserRole del repositorio es 'estudiante' | 'profesor' (minúscula),
    // coherente con CU-01 (redirectUrl '/<role>/home').
    this.authRepository.seedUser('12345678-9', 'estudiante', 'ACTIVE');
    this.authRepository.seedUser('98765432-1', 'profesor', 'ACTIVE');

    // Credenciales institucionales (la contraseña real vive aquí, no en
    // AuthRepository). El login valida la password contra este servicio.
    this.institutionalIdentity.seed({
      rut: '12345678-9',
      institutionalEmail: 'ana.garcia@ufromail.cl',
      fullName: 'Ana Garcia',
      role: UserRole.ESTUDIANTE,
      password: 'ClaveInstitucional123',
    });
    this.institutionalIdentity.seed({
      rut: '98765432-1',
      institutionalEmail: 'carlos.soto@ufromail.cl',
      fullName: 'Carlos Soto',
      role: UserRole.PROFESOR,
      password: 'ClaveInstitucional123',
    });

    // ── Subject (CU-09) ──────────────────────────────────────────────────────
    void this.subjectRepository.save({
      code: 'MAT101',
      name: 'Cálculo',
      career: 'Ingeniería Civil',
    });

    // ── Assistance / Data (CU-03 / CU-05) ────────────────────────────────────
    this.dataRepository.seedStudent('12345678-9', 'Ana Garcia');
    this.dataRepository.seedClass({
      id: 1,
      subjectId: 'MAT101',
      date: new Date(),
      registrationStatus: 'ENABLED',
    });
    this.dataRepository.seedEnrollment('12345678-9', 'MAT101');
    this.dataRepository.seedTeaching('98765432-1', 'MAT101');

    return {
      message: 'Seed completado',
      seeded: {
        auth: [
          { rut: '12345678-9', role: 'estudiante', status: 'ACTIVE' },
          { rut: '98765432-1', role: 'profesor', status: 'ACTIVE' },
        ],
        institutional: [
          { rut: '12345678-9', password: 'ClaveInstitucional123' },
          { rut: '98765432-1', password: 'ClaveInstitucional123' },
        ],
        subjects: [{ code: 'MAT101', name: 'Cálculo', career: 'Ingeniería Civil' }],
        assistance: {
          student: '12345678-9',
          class: { id: 1, subjectId: 'MAT101', registrationStatus: 'ENABLED' },
          enrollment: { studentRut: '12345678-9', subjectId: 'MAT101' },
          teaching: { professorRut: '98765432-1', subjectId: 'MAT101' },
        },
      },
    };
  }

  /**
   * Deja todos los repositorios in-memory vacíos, sin sembrar nada. Útil para
   * aislar pruebas E2E que necesitan partir de un estado limpio.
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset() {
    this.authRepository.reset();
    this.subjectRepository.reset();
    this.dataRepository.reset();
    this.institutionalIdentity.reset();
    this.usersRepository.reset();

    return { message: 'Reset completado' };
  }
}
