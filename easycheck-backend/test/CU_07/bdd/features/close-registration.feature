Feature: Cerrar registro de asistencia
  Scenario: Profesor cierra nuevos registros de su clase
    Given el profesor imparte una clase con registro habilitado
    When cierra el registro de asistencia
    Then la clase deja de aceptar nuevos registros
