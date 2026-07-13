Feature: CU-02 Desplegar formulario de registro de nuevo usuario
  Como administrativo
  Quiero registrar usuarios institucionales
  Para que puedan acceder al sistema EasyCheck.

  Background:
    Given el sistema institucional UFRO se encuentra disponible

  @positive
  Scenario: Registro exitoso
    Given el usuario con RUT "12345678-9" no esta registrado en EasyCheck
    When el administrativo registra al usuario con RUT "12345678-9" y credenciales validas
    Then el sistema registra la cuenta con rol "ESTUDIANTE"

  @negative
  Scenario: Usuario duplicado
    Given el usuario con RUT "12345678-9" ya esta registrado en EasyCheck
    When el administrativo registra al usuario con RUT "12345678-9" y credenciales validas
    Then el sistema informa que el usuario ya se encuentra registrado

  @negative
  Scenario: Usuario que no pertenece a la universidad
    When el administrativo registra al usuario con RUT "11111111-1" y un correo institucional sin identificador numerico
    Then el sistema informa que el usuario no pertenece a la universidad

  @negative
  Scenario: Credenciales invalidas
    When el administrativo registra al usuario con RUT "12345678-9" y credenciales invalidas
    Then el sistema informa que las credenciales institucionales son invalidas

  @negative
  Scenario: Registro con rol no permitido
    When el administrativo registra al usuario con RUT "12345678-9" y rol "ADMINISTRADOR"
    Then el sistema informa que el rol no es permitido para registro

  @negative
  Scenario: Registro con formato de RUT invalido
    When el administrativo registra al usuario con RUT "1234-5678" y credenciales validas
    Then el sistema informa que el formato del RUT es invalido

  @boundary
  Scenario: Registro con campos vacios
    When el administrativo registra al usuario con RUT "" y credenciales validas
    Then el sistema informa que el RUT no puede estar vacio
