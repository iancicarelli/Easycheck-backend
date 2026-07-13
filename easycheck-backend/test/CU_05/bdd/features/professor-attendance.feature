Feature: Consultar asistencia de una asignatura
  Scenario: Profesor consulta estudiantes de su asignatura
    Given el profesor imparte una asignatura con estudiantes
    When consulta la asistencia de la asignatura
    Then obtiene la lista de estudiantes y sus porcentajes
