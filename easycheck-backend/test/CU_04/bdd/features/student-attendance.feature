Feature: Consultar mi asistencia
  Scenario: Estudiante consulta una asignatura matriculada
    Given el estudiante autenticado esta matriculado en una asignatura
    When consulta su asistencia en la asignatura
    Then obtiene sus clases asistidas y el porcentaje
