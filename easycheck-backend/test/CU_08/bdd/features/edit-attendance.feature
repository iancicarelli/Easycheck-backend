Feature: Editar registro de asistencia
  Scenario: Profesor corrige asistencia durante la ventana de edicion
    Given la clase esta cerrada y tiene una asistencia registrada
    When el profesor habilita edicion y corrige la asistencia
    Then el registro cambia sin reabrir nuevos registros
