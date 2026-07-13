Feature: Registrar asistencia mediante QR
  Scenario: Estudiante genera QR y el lector registra asistencia
    Given el estudiante esta matriculado en una clase habilitada
    When genera su QR y el lector lo valida
    Then la asistencia queda registrada una sola vez
