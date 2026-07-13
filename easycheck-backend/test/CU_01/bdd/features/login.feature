Feature: Inicio de sesión en EasyCheck
  Como usuario del sistema EasyCheck
  Quiero poder iniciar sesión con mis credenciales de Intranet UFRO
  Para acceder a las funcionalidades según mi rol

  @positive
  Scenario: Inicio de sesión exitoso como estudiante
    Given el usuario con RUT "12345678-9" está registrado en el sistema con rol "estudiante"
    And el usuario se encuentra en el formulario de inicio de sesión
    When el usuario ingresa el RUT "12345678-9"
    And el usuario ingresa la contraseña "contrasena_valida"
    And el usuario selecciona "Entrar"
    Then el sistema autentica al usuario correctamente
    And el usuario es redirigido a la pantalla principal de estudiante

  @positive
  Scenario: Inicio de sesión exitoso como profesor
    Given el usuario con RUT "98765432-1" está registrado en el sistema con rol "profesor"
    And el usuario se encuentra en el formulario de inicio de sesión
    When el usuario ingresa el RUT "98765432-1"
    And el usuario ingresa la contraseña "contrasena_valida"
    And el usuario selecciona "Entrar"
    Then el sistema autentica al usuario correctamente
    And el usuario es redirigido a la pantalla principal de profesor

  @negative
  Scenario: Inicio de sesión con campos vacíos
    Given el usuario se encuentra en el formulario de inicio de sesión
    When el usuario deja el campo RUT vacío
    And el usuario deja el campo contraseña vacío
    And el usuario selecciona "Entrar"
    Then el sistema no envía el formulario
    And se muestra el mensaje "Debe completar los campos obligatorios"
    And se marcan en rojo los campos vacíos

  @negative
  Scenario: Inicio de sesión con cuenta deshabilitada
    Given el usuario con RUT "12345678-9" tiene su cuenta deshabilitada en EasyCheck
    And el usuario se encuentra en el formulario de inicio de sesión
    When el usuario ingresa el RUT "12345678-9"
    And el usuario ingresa la contraseña "contrasena_valida"
    And el usuario selecciona "Entrar"
    Then el sistema rechaza el acceso
    And se muestra el mensaje "Su cuenta se encuentra deshabilitada, contacte al administrador"
    And el usuario permanece en el formulario de inicio de sesión

  @boundary
  Scenario: Inicio de sesión con RUT en formato sin dígito verificador
    Given el usuario se encuentra en el formulario de inicio de sesión
    When el usuario ingresa el RUT "12345678" sin dígito verificador
    And el usuario ingresa cualquier contraseña
    And el usuario selecciona "Entrar"
    Then el sistema detecta el formato inválido
    And se muestra el mensaje "El formato del RUT ingresado no es válido"
    And el usuario permanece en el formulario de inicio de sesión