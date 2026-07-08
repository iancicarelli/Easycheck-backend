import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ENDPOINT = '/api/v1/assistance/register';
const SUBJECT_ID = __ENV.SUBJECT_ID || 'ASG-01';
const QR_SIGNATURE = __ENV.QR_SIGNATURE || 'VALID_SIGNATURE_ABC123';
const SEEDED_CLASS_COUNT = Number(__ENV.SEEDED_CLASS_COUNT || 50000);
const RUN_ID = __ENV.RUN_ID || Date.now().toString();

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP_NORMAL || '1m', target: Number(__ENV.NORMAL_VUS || 100) },
    { duration: __ENV.NORMAL_HOLD || '2m', target: Number(__ENV.NORMAL_VUS || 100) },
    { duration: __ENV.RAMP_UP_STRESS || '2m', target: Number(__ENV.STRESS_VUS || 300) },
    { duration: __ENV.STRESS_HOLD || '3m', target: Number(__ENV.STRESS_VUS || 300) },
    { duration: __ENV.RAMP_DOWN || '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const classId = ((__ITER + __VU * 1000) % SEEDED_CLASS_COUNT) + 1;
  const payload = JSON.stringify({
    studentRut: `stress-${RUN_ID}-${__VU}-${__ITER}`,
    classId,
    subjectId: SUBJECT_ID,
    qrSignature: QR_SIGNATURE,
  });

  const response = http.post(`${BASE_URL}${ENDPOINT}`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: ENDPOINT,
      test_type: 'stress',
    },
  });

  check(response, {
    'status is 201': (res) => res.status === 201,
    'response includes confirmation': (res) =>
      res.body.includes('Assistance registered successfully'),
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'test/performance/results/stress-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const duration = data.metrics.http_req_duration;
  const failed = data.metrics.http_req_failed;
  const checks = data.metrics.checks;
  const iterations = data.metrics.iterations;
  const requests = data.metrics.http_reqs;
  const vus = data.metrics.vus_max;

  return [
    '',
    'EasyCheck - k6 stress test summary',
    `Endpoint: ${ENDPOINT}`,
    `Normal target VUs: ${__ENV.NORMAL_VUS || 100}`,
    `Stress target VUs: ${__ENV.STRESS_VUS || 300}`,
    `Run ID: ${RUN_ID}`,
    `http_req_duration p95: ${duration?.values?.['p(95)'] ?? 'N/A'} ms`,
    `http_req_failed rate: ${failed?.values?.rate ?? 'N/A'}`,
    `checks rate: ${checks?.values?.rate ?? 'N/A'}`,
    `iterations: ${iterations?.values?.count ?? 'N/A'}`,
    `requests per second: ${requests?.values?.rate ?? 'N/A'}`,
    `vus max: ${vus?.values?.max ?? 'N/A'}`,
    '',
  ].join('\n');
}
