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
