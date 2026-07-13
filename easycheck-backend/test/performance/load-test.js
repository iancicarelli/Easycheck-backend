import { sleep } from 'k6';
import { executeUserJourney, prepareData, summary } from './workload.js';

// La matrícula objetivo es de 10.000 estudiantes. No se modela que todos se
// conecten simultáneamente: el perfil normal usa 100 VUs y procesa una
// interacción representativa por cada estudiante de la población.
const UNIVERSITY_STUDENT_POPULATION = Number(
  __ENV.UNIVERSITY_STUDENT_POPULATION || 10000,
);
const CONCURRENT_STUDENTS = Number(__ENV.VUS || 100);
const TOTAL_STUDENT_OPERATIONS = Number(
  __ENV.TOTAL_STUDENT_OPERATIONS || UNIVERSITY_STUDENT_POPULATION,
);

export const options = {
  scenarios: {
    university_normal_load: {
      executor: 'shared-iterations',
      vus: CONCURRENT_STUDENTS,
      iterations: TOTAL_STUDENT_OPERATIONS,
      maxDuration: __ENV.MAX_DURATION || '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export const setup = prepareData;

export default function (data) {
  executeUserJourney(data);
  sleep(Number(__ENV.THINK_TIME_SECONDS || 0.5));
}

export function handleSummary(data) {
  return summary(
    data,
    `EasyCheck - carga: ${TOTAL_STUDENT_OPERATIONS} interacciones / ${CONCURRENT_STUDENTS} VUs`,
    'test/performance/results/load-summary.json',
  );
}
