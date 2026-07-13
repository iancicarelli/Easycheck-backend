Feature: Consultar asistencia de un estudiante
  Scenario: Director consulta la asistencia por RUT
    Given existe un estudiante matriculado con una clase asistida de dos
    When el director consulta la asistencia del estudiante
    Then obtiene un porcentaje de asistencia de 50
