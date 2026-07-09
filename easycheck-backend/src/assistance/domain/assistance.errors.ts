export class StudentNotFoundException extends Error {
  constructor(public readonly rut: string) {
    super(`Student ${rut} not found`);
    this.name = 'StudentNotFoundException';
  }
}

export class InvalidStudentRutException extends Error {
  constructor() {
    super('El RUT ingresado no es valido. Ingrese el RUT nuevamente.');
    this.name = 'InvalidStudentRutException';
  }
}

export class StudentAttendanceNotFoundException extends Error {
  constructor(public readonly rut: string) {
    super('El estudiante ingresado no existe');
    this.name = 'StudentAttendanceNotFoundException';
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

export class ClassNotFoundException extends Error {
  constructor(public readonly classId: number) {
    super(`Class ${classId} not found`);
    this.name = 'ClassNotFoundException';
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
  constructor(message = 'Invalid QR signature') {
    super(message);
    this.name = 'InvalidQRException';
  }
}
