/// <reference types="cypress" />

// PE2E-01 — Login exitoso de estudiante (CU-01)
//
// Pruebas E2E sobre la API (sin UI), usando cy.request().
// Cada caso parte de un estado limpio: reset (vacía los repos) → seed
// (siembra estudiante 12345678-9 / profesor 98765432-1 y sus credenciales).
describe('PE2E-01 Login estudiante (CU-01)', () => {
  const LOGIN_URL = '/api/v1/auth/login';

  beforeEach(() => {
    cy.request('POST', '/api/v1/test/reset');
    cy.request('POST', '/api/v1/test/seed');
  });

  it('login exitoso con credenciales correctas', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '12345678-9', password: 'ClaveInstitucional123' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.role).to.eq('estudiante');
      expect(res.body.redirectUrl).to.eq('/estudiante/home');
    });
  });

  it('login fallido con password incorrecta', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '12345678-9', password: 'password_incorrecta' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message).to.exist;
    });
  });

  it('login fallido con RUT inexistente', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '11111111-1', password: 'ClaveInstitucional123' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('login fallido con body vacío', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('login fallido con RUT formato inválido', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '123', password: 'ClaveInstitucional123' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
