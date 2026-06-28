/// <reference types="cypress" />

// PE2E-04 — Registro de nuevo usuario (CU-02)
describe('PE2E-04 Registro de usuario (CU-02)', () => {
  const REGISTER_URL = '/api/v1/users/register';

  const validStudent = {
    rut: '12345678-9',
    institutionalEmail: 'ana.garcia@ufromail.cl',
    institutionalPassword: 'ClaveInstitucional123',
    fullName: 'Ana Garcia',
    role: 'ESTUDIANTE',
  };

  beforeEach(() => {
    cy.request('POST', '/api/v1/test/reset');
    cy.request('POST', '/api/v1/test/seed');
  });

  it('registro exitoso de estudiante', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validStudent,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.rut).to.eq('12345678-9');
      expect(res.body.role).to.exist;
    });
  });

  it('registro duplicado mismo RUT', () => {
    // Primer registro (puede ser 201 en un servidor recién levantado).
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validStudent,
      failOnStatusCode: false,
    });

    // Segundo registro con el mismo RUT → conflicto.
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validStudent,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(409);
    });
  });

  it('registro con RUT no institucional', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: {
        rut: '99999999-9',
        institutionalEmail: 'noexiste@ufromail.cl',
        institutionalPassword: 'ClaveInstitucional123',
        fullName: 'No Existe',
        role: 'ESTUDIANTE',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('registro con body vacío', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });
});
