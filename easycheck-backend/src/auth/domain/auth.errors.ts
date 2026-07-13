export class EmptyCredentialsException extends Error {
  constructor(public readonly fields: string[]) {
    super('Debe completar los campos obligatorios');
    this.name = 'EmptyCredentialsException';
  }
}

export class InvalidRutFormatException extends Error {
  constructor(public readonly rut: string) {
    super('El formato del RUT ingresado no es válido');
    this.name = 'InvalidRutFormatException';
  }
}

export class AccountDisabledException extends Error {
  constructor(public readonly rut: string) {
    super('Su cuenta se encuentra deshabilitada, contacte al administrador');
    this.name = 'AccountDisabledException';
  }
}

export class InvalidCredentialsException extends Error {
  constructor() {
    super('RUT o contraseña incorrectos');
    this.name = 'InvalidCredentialsException';
  }
}
