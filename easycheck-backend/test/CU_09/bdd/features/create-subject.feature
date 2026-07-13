Feature: Registrar una asignatura
  Scenario: Administrador registra una asignatura local
    Given no existe una asignatura con el codigo indicado
    When el administrador registra la nueva asignatura
    Then la asignatura queda almacenada con origen local
