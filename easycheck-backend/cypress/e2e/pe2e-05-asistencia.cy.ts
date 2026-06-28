/// <reference types="cypress" />

// PE2E-05 — Registro y consulta de asistencia (CU-03 + CU-05)
describe('PE2E-05 Asistencia (CU-03 + CU-05)', () => {
  const REGISTER_URL = '/api/v1/assistance/register';

  const validAssistance = {
    studentRut: '12345678-9',
    classId: 1,
    subjectId: 'MAT101',
    qrSignature: 'valid-qr-123',
  };

  beforeEach(() => {
    cy.request('POST', '/api/v1/test/reset');
    cy.request('POST', '/api/v1/test/seed');
  });

  it('registro de asistencia exitoso', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validAssistance,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(201);
    });
  });

  it('registro de asistencia duplicado', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validAssistance,
      failOnStatusCode: false,
    });

    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validAssistance,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(409);
    });
  });

  it('registro con QR inválido', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: { ...validAssistance, qrSignature: 'INVALID_SIGNATURE' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('consulta asistencia estudiante después de registrar', () => {
    cy.request({
      method: 'POST',
      url: REGISTER_URL,
      body: validAssistance,
      failOnStatusCode: false,
    });

    cy.request({
      method: 'GET',
      url: '/api/v1/students/12345678-9/assistance?subject=MAT101',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.assistancePercentage).to.eq(100);
    });
  });

  it('consulta asistencia estudiante inexistente', () => {
    cy.request({
      method: 'GET',
      url: '/api/v1/students/00000000-0/assistance?subject=MAT101',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('consulta roster del profesor', () => {
    cy.request({
      method: 'GET',
      url: '/api/v1/professors/98765432-1/subjects/MAT101/assistance',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
    });
  });
});
