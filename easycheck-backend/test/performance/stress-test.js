import { sleep } from 'k6';
import { executeUserJourney, prepareData, summary } from './workload.js';

// Para una población cercana a 10.000 estudiantes, 100 VUs representa una
// concurrencia normal aproximada del 1%; 300 VUs fuerza un peak de 3%.
const NORMAL_CONCURRENT_STUDENTS = Number(__ENV.NORMAL_VUS || 100);
const STRESS_CONCURRENT_STUDENTS = Number(__ENV.STRESS_VUS || 300);

export const options = {
  stages: [
    { duration: __ENV.RAMP_UP || '1m', target: NORMAL_CONCURRENT_STUDENTS },
    {
      duration: __ENV.NORMAL_HOLD || '2m',
      target: NORMAL_CONCURRENT_STUDENTS,
    },
    {
      duration: __ENV.STRESS_RAMP || '2m',
      target: STRESS_CONCURRENT_STUDENTS,
    },
    {
      duration: __ENV.STRESS_HOLD || '3m',
      target: STRESS_CONCURRENT_STUDENTS,
    },
    { duration: __ENV.RAMP_DOWN || '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export const setup = prepareData;

export default function (data) {
  executeUserJourney(data);
  sleep(Number(__ENV.THINK_TIME_SECONDS || 0.25));
}

export function handleSummary(data) {
  return summary(
    data,
    `EasyCheck - estrés: ${NORMAL_CONCURRENT_STUDENTS} a ${STRESS_CONCURRENT_STUDENTS} VUs`,
    'test/performance/results/stress-summary.json',
  );
}
