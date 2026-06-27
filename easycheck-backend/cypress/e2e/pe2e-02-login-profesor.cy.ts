/// <reference types="cypress" />

// PE2E-02 — Login exitoso de profesor (CU-01)
describe('PE2E-02 Login profesor (CU-01)', () => {
  const LOGIN_URL = '/api/v1/auth/login';

  beforeEach(() => {
    cy.request('POST', '/api/v1/test/reset');
    cy.request('POST', '/api/v1/test/seed');
  });

  it('login exitoso con credenciales correctas del profesor', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '98765432-1', password: 'ClaveInstitucional123' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.role).to.eq('profesor');
      expect(res.body.redirectUrl).to.eq('/profesor/home');
    });
  });

  it('login fallido con password incorrecta', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '98765432-1', password: 'password_incorrecta' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message).to.exist;
    });
  });

  it('login fallido con password vacía', () => {
    cy.request({
      method: 'POST',
      url: LOGIN_URL,
      body: { rut: '98765432-1', password: '' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
