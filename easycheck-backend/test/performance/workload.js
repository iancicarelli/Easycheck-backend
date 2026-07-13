import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = 'mock-token-44444444-4-administrador';
const DIRECTOR_TOKEN = 'mock-token-33333333-3-director';
const PROFESSOR_TOKEN = 'mock-token-22222222-2-profesor';
const STUDENT_TOKEN = 'mock-token-11111111-1-estudiante';

const authorization = (token) => ({ Authorization: `Bearer ${token}` });

export function prepareData() {
  const response = http.post(`${BASE_URL}/api/v1/api-intranet/sync`, null, {
    headers: authorization(ADMIN_TOKEN),
    tags: { endpoint: 'intranet_sync' },
  });
  if (response.status !== 201) {
    throw new Error(
      `No se pudo preparar API Intranet: HTTP ${response.status}`,
    );
  }
  return { baseUrl: BASE_URL };
}

export function executeUserJourney(data) {
  const operation = (__ITER + __VU) % 5;
  let response;
  let expectedStatus = 200;
  let endpoint;

  if (operation === 0) {
    endpoint = 'login';
    response = http.post(
      `${data.baseUrl}/api/v1/auth/login`,
      JSON.stringify({ rut: '11111111-1', password: 'demo' }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint },
      },
    );
  } else if (operation === 1) {
    endpoint = 'student_by_rut';
    response = http.get(
      `${data.baseUrl}/api/v1/students/11111111-1/attendance`,
      { headers: authorization(DIRECTOR_TOKEN), tags: { endpoint } },
    );
  } else if (operation === 2) {
    endpoint = 'student_subject';
    response = http.get(
      `${data.baseUrl}/api/v1/students/me/subjects/ASG-01/attendance`,
      { headers: authorization(STUDENT_TOKEN), tags: { endpoint } },
    );
  } else if (operation === 3) {
    endpoint = 'professor_subject';
    response = http.get(
      `${data.baseUrl}/api/v1/professors/me/subjects/ASG-01/attendance`,
      { headers: authorization(PROFESSOR_TOKEN), tags: { endpoint } },
    );
  } else {
    endpoint = 'generate_qr';
    expectedStatus = 201;
    response = http.post(
      `${data.baseUrl}/api/v1/students/me/classes/1001/qr`,
      null,
      { headers: authorization(STUDENT_TOKEN), tags: { endpoint } },
    );
  }

  check(response, {
    [`${endpoint}: estado esperado`]: (result) =>
      result.status === expectedStatus,
    [`${endpoint}: respuesta JSON`]: (result) =>
      (result.headers['Content-Type'] || '').includes('application/json'),
  });
}

export function summary(data, title, outputPath) {
  const duration = data.metrics.http_req_duration?.values || {};
  const failed = data.metrics.http_req_failed?.values || {};
  const checks = data.metrics.checks?.values || {};
  const compact = {
    test: title,
    p95_ms: duration['p(95)'],
    failure_rate: failed.rate,
    check_rate: checks.rate,
    iterations: data.metrics.iterations?.values?.count,
    requests: data.metrics.http_reqs?.values?.count,
  };
  return {
    stdout: `\n${title}\n${JSON.stringify(compact, null, 2)}\n`,
    [outputPath]: JSON.stringify(data, null, 2),
  };
}
