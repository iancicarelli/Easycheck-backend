import { Injectable } from '@nestjs/common';
import { InstitutionalUser } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import {
  InstitutionalIdentityPort,
  ValidateInstitutionalUserParams,
} from '../application/user-registration.ports';
import type { IntranetAuthPort } from '../../auth/application/auth.ports';
import type { AuthRole, IntranetIdentity } from '../../auth/domain/auth.types';

interface SimulatedCredential extends IntranetIdentity {
  password: string;
}

/**
 * Stub de la Intranet de la UFRO (la API real aun no existe). Mientras tanto,
 * se considera que un usuario pertenece a la Universidad de La Frontera si su
 * correo institucional termina en `@ufromail.cl` y la parte local contiene
 * exactamente 2 digitos (p. ej. `22@ufromail.cl`, `i.cicarelli03@ufromail.cl`).
 * Sin API real no se puede validar la contrasena institucional.
 */
@Injectable()
export class InMemoryInstitutionalIdentityService
  implements InstitutionalIdentityPort, IntranetAuthPort
{
  private static readonly UFRO_DOMAIN = '@ufromail.cl';
  private static readonly REQUIRED_DIGITS = 2;
  private readonly credentials = new Map<string, SimulatedCredential>();

  constructor() {
    this.seedDemoCredentials();
  }

  validateInstitutionalUser(
    params: ValidateInstitutionalUserParams,
  ): Promise<InstitutionalUser | null> {
    if (!this.belongsToUfro(params.institutionalEmail)) {
      return Promise.resolve(null);
    }

    const identity = {
      rut: params.rut,
      institutionalEmail: params.institutionalEmail,
      // Sin API real no conocemos nombre ni rol institucionales; el servicio
      // usa los datos del formulario (command.fullName / command.role).
      fullName: '',
      role: UserRole.ESTUDIANTE,
    };

    this.seedCredential({
      rut: params.rut,
      password: params.institutionalPassword,
      fullName: identity.fullName,
      email: identity.institutionalEmail,
      role: 'estudiante',
    });
    return Promise.resolve(identity);
  }

  validateCredentials(
    rut: string,
    password: string,
  ): Promise<IntranetIdentity | null> {
    const credential = this.credentials.get(rut);
    if (!credential || credential.password !== password) {
      return Promise.resolve(null);
    }
    return Promise.resolve({
      rut: credential.rut,
      fullName: credential.fullName,
      email: credential.email,
      role: credential.role,
    });
  }

  seedCredential(credential: {
    rut: string;
    password: string;
    fullName: string;
    email: string;
    role: AuthRole;
  }): void {
    this.credentials.set(credential.rut, credential);
  }

  resetCredentials(): void {
    this.credentials.clear();
  }

  private seedDemoCredentials(): void {
    const demoUsers: Array<Omit<SimulatedCredential, 'password'>> = [
      {
        rut: '11111111-1',
        fullName: 'Ana Pérez',
        email: 'ana.perez11@ufromail.cl',
        role: 'estudiante',
      },
      {
        rut: '22222222-2',
        fullName: 'Pedro Rojas',
        email: 'pedro.rojas22@ufromail.cl',
        role: 'profesor',
      },
      {
        rut: '33333333-3',
        fullName: 'Directora EasyCheck',
        email: 'directora33@ufromail.cl',
        role: 'director',
      },
      {
        rut: '44444444-4',
        fullName: 'Administradora EasyCheck',
        email: 'administradora44@ufromail.cl',
        role: 'administrador',
      },
      {
        rut: '77777777-7',
        fullName: 'Cuenta Deshabilitada',
        email: 'deshabilitada77@ufromail.cl',
        role: 'estudiante',
      },
    ];
    demoUsers.forEach((user) =>
      this.seedCredential({ ...user, password: 'demo' }),
    );
  }

  private belongsToUfro(email: string): boolean {
    const domain = InMemoryInstitutionalIdentityService.UFRO_DOMAIN;
    if (!email.endsWith(domain)) {
      return false;
    }

    const localPart = email.slice(0, -domain.length);
    const digitCount = (localPart.match(/\d/g) ?? []).length;
    return digitCount === InMemoryInstitutionalIdentityService.REQUIRED_DIGITS;
  }
}
