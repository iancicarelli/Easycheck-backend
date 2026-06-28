/// <reference types="cypress" />

// PE2E-03 — Registro de asignatura por administrativo (CU-09)
//
// POST /api/v1/subjects está protegido por AdminGuard:
//   - sin header Authorization      -> 401 (UnauthorizedException)
//   - token distinto al admin token -> 403 (ForbiddenException)
//   - token admin válido            -> pasa al servicio
// El token admin es 'admin-test-token' (Authorization: Bearer admin-test-token).
describe('PE2E-03 Registro de asignatura (CU-09)', () => {
  const SUBJECTS_URL = '/api/v1/subjects';
  const ADMIN_AUTH = 'Bearer admin-test-token';

  const newSubject = {
    code: 'FIS101',
    name: 'Física',
    career: 'Ingeniería Civil',
  };

  beforeEach(() => {
    cy.request('POST', '/api/v1/test/reset');
    cy.request('POST', '/api/v1/test/seed'); // deja MAT101 ya existente
  });

  it('registro exitoso de asignatura con token admin', () => {
    cy.request({
      method: 'POST',
      url: SUBJECTS_URL,
      headers: { Authorization: ADMIN_AUTH },
      body: newSubject,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(201);
      // La respuesta es { message, subject: { code, name, career } }
      expect(res.body.subject.code).to.eq('FIS101');
    });
  });

  it('registro sin token de autorización', () => {
    cy.request({
      method: 'POST',
      url: SUBJECTS_URL,
      body: newSubject,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('registro con token inválido', () => {
    cy.request({
      method: 'POST',
      url: SUBJECTS_URL,
      headers: { Authorization: 'Bearer token_invalido' },
      body: newSubject,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
    });
  });

  it('registro de asignatura con código duplicado', () => {
    cy.request({
      method: 'POST',
      url: SUBJECTS_URL,
      headers: { Authorization: ADMIN_AUTH },
      body: { code: 'MAT101', name: 'Cálculo', career: 'Ingeniería Civil' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(409);
    });
  });

  it('registro con body vacío y token admin', () => {
    cy.request({
      method: 'POST',
      url: SUBJECTS_URL,
      headers: { Authorization: ADMIN_AUTH },
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
