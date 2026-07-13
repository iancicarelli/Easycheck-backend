export class StudentNotFoundException extends Error {
  constructor(public readonly rut: string) {
    super(`Student ${rut} not found`);
    this.name = 'StudentNotFoundException';
  }
}

export class SubjectNotAssignedException extends Error {
  constructor(
    public readonly professorRut: string,
    public readonly subjectCode: string,
  ) {
    super(
      `Subject ${subjectCode} is not assigned to professor ${professorRut}`,
    );
    this.name = 'SubjectNotAssignedException';
  }
}

export class StudentNotEnrolledException extends Error {
  constructor(
    public readonly studentRut: string,
    public readonly subjectCode: string,
  ) {
    super(`Student ${studentRut} is not enrolled in subject ${subjectCode}`);
    this.name = 'StudentNotEnrolledException';
  }
}

export class RegistrationDisabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Registration for class ${classId} is disabled`);
    this.name = 'RegistrationDisabledException';
  }
}

export class DuplicateAssistanceException extends Error {
  constructor(
    public readonly studentRut: string,
    public readonly classId: number,
  ) {
    super(
      `Student ${studentRut} already registered assistance for class ${classId}`,
    );
    this.name = 'DuplicateAssistanceException';
  }
}

export class InvalidQRException extends Error {
  constructor() {
    super('Invalid QR signature');
    this.name = 'InvalidQRException';
  }
}

export class QRAlreadyUsedException extends Error {
  constructor() {
    super('QR token has already been used');
    this.name = 'QRAlreadyUsedException';
  }
}

// CU-03: RUT malformado o con dígito verificador incorrecto (assistance).
// Distinta de InvalidRutFormatException (auth): mensaje y contexto propios del CU.
export class InvalidRutException extends Error {
  constructor(public readonly rut: string) {
    super('El RUT ingresado no es válido. Ingrese el RUT nuevamente.');
    this.name = 'InvalidRutException';
  }
}

export class ClassNotFoundException extends Error {
  constructor(public readonly classId: number) {
    super(`Class ${classId} not found`);
    this.name = 'ClassNotFoundException';
  }
}

export class RegistrationAlreadyDisabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Registration for class ${classId} is already disabled`);
    this.name = 'RegistrationAlreadyDisabledException';
  }
}

export class RegistrationAlreadyEnabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Registration for class ${classId} is already enabled`);
    this.name = 'RegistrationAlreadyEnabledException';
  }
}

export class EditingAlreadyEnabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Editing for class ${classId} is already enabled`);
    this.name = 'EditingAlreadyEnabledException';
  }
}

export class EditingAlreadyDisabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Editing for class ${classId} is already disabled`);
    this.name = 'EditingAlreadyDisabledException';
  }
}

export class EditingDisabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Editing for class ${classId} is disabled`);
    this.name = 'EditingDisabledException';
  }
}

export class RegistrationMustBeDisabledException extends Error {
  constructor(public readonly classId: number) {
    super(`Registration for class ${classId} must be disabled before editing`);
    this.name = 'RegistrationMustBeDisabledException';
  }
}

export class AssistanceRecordNotFoundException extends Error {
  constructor(public readonly recordId: number) {
    super(`Assistance record ${recordId} not found`);
    this.name = 'AssistanceRecordNotFoundException';
  }
}

export {
  EmptyCredentialsException,
  InvalidRutFormatException,
  AccountDisabledException,
  InvalidCredentialsException,
} from '../auth/domain/auth.errors';

export class SubjectAlreadyExistsException extends Error {
  constructor(public readonly code: string) {
    super('El código ingresado ya existe en el sistema');
    this.name = 'SubjectAlreadyExistsException';
  }
}

export class MissingFieldsException extends Error {
  constructor(public readonly fields: string[]) {
    super('Debe completar los datos obligatorios');
    this.name = 'MissingFieldsException';
  }
}

export class InvalidFieldFormatException extends Error {
  constructor(public readonly field: string) {
    super('Caracteres no permitidos');
    this.name = 'InvalidFieldFormatException';
  }
}
