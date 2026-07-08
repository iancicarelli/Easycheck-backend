import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ENDPOINT = '/api/v1/assistance/register';
const SUBJECT_ID = __ENV.SUBJECT_ID || 'ASG-01';
const QR_SIGNATURE = __ENV.QR_SIGNATURE || 'VALID_SIGNATURE_ABC123';
const SEEDED_CLASS_COUNT = Number(__ENV.SEEDED_CLASS_COUNT || 50000);
const TOTAL_STUDENTS = Number(__ENV.TOTAL_STUDENTS || 10000);
const CONCURRENT_USERS = Number(__ENV.VUS || 100);
const RUN_ID = __ENV.RUN_ID || Date.now().toString();

export const options = {
  scenarios: {
    university_attendance_registration: {
      executor: 'shared-iterations',
      vus: CONCURRENT_USERS,
      iterations: TOTAL_STUDENTS,
      maxDuration: __ENV.MAX_DURATION || '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const classId = ((__ITER + __VU) % SEEDED_CLASS_COUNT) + 1;
  const payload = JSON.stringify({
    studentRut: `perf-${RUN_ID}-${__VU}-${__ITER}`,
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
      test_type: 'load',
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
    'test/performance/results/load-summary.json': JSON.stringify(data, null, 2),
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
    'EasyCheck - k6 load test summary',
    `Endpoint: ${ENDPOINT}`,
    `Total students simulated: ${TOTAL_STUDENTS}`,
    `Concurrent users: ${CONCURRENT_USERS}`,
    `Run ID: ${RUN_ID}`,
    `Max duration: ${__ENV.MAX_DURATION || '10m'}`,
    `http_req_duration p95: ${duration?.values?.['p(95)'] ?? 'N/A'} ms`,
    `http_req_failed rate: ${failed?.values?.rate ?? 'N/A'}`,
    `checks rate: ${checks?.values?.rate ?? 'N/A'}`,
    `iterations: ${iterations?.values?.count ?? 'N/A'}`,
    `requests per second: ${requests?.values?.rate ?? 'N/A'}`,
    `vus max: ${vus?.values?.max ?? 'N/A'}`,
    '',
  ].join('\n');
}
