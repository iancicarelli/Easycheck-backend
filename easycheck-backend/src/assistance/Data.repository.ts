import { Injectable } from '@nestjs/common';
import { InMemoryAcademicRepository } from './infrastructure/in-memory-academic.repository';
import { InMemoryAttendanceRepository } from './infrastructure/in-memory-attendance.repository';

export interface AssistanceRecord {
  id: number;
  studentRut: string;
  classId: number;
  subjectId: string;
  date: Date;
  present: boolean;
}

export interface ClassSession {
  id: number;
  subjectId: string;
  date: Date;
  registrationStatus: 'ENABLED' | 'DISABLED';
}

export interface StudentAssistance {
  rut: string;
  name: string;
  classesAttended: number;
  totalClasses: number;
  assistancePercentage: number;
}

export interface StudentSubjectAttendance {
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
}

@Injectable()
export class DataRepository {
  private readonly academicRepository = new InMemoryAcademicRepository();
  private readonly attendanceRepository = new InMemoryAttendanceRepository();

  constructor() {
    if (process.env.EASYCHECK_PERFORMANCE_SEED === 'true') {
      this.seedPerformanceFixtures();
    }
  }

  seedStudent(rut: string, name: string): void {
    this.academicRepository.seedStudent(rut, name);
  }

  seedEnrollment(studentRut: string, subjectId: string): void {
    this.academicRepository.seedEnrollment(studentRut, subjectId);
  }

  seedSubject(subject: { code: string; name: string }): void {
    this.academicRepository.seedSubject(subject);
  }

  seedClass(classSession: ClassSession): void {
    this.academicRepository.seedClass(classSession);
  }

  seedAssistance(record: AssistanceRecord): void {
    this.attendanceRepository.seedAssistance(record);
  }

  seedTeaching(professorRut: string, subjectId: string): void {
    this.academicRepository.seedTeaching(professorRut, subjectId);
  }

  reset(): void {
    this.academicRepository.reset();
    this.attendanceRepository.reset();
  }

  findStudent(rut: string): Promise<{ rut: string; name: string } | null> {
    return Promise.resolve(this.academicRepository.findStudent(rut));
  }

  countStudents(): number {
    return this.academicRepository.countStudents();
  }

  countEnrollments(): number {
    return this.academicRepository.countEnrollments();
  }

  countClasses(): number {
    return this.academicRepository.countClasses();
  }

  countTeachings(): number {
    return this.academicRepository.countTeachings();
  }

  findAssistancesByStudentAndSubject(
    studentRut: string,
    subjectId: string,
  ): Promise<AssistanceRecord[]> {
    return Promise.resolve(
      this.attendanceRepository.findAssistancesByStudentAndSubject(
        studentRut,
        subjectId,
      ),
    );
  }

  findStudentAttendanceByRut(
    studentRut: string,
  ): Promise<StudentSubjectAttendance[]> {
    const enrolled =
      this.academicRepository.findEnrollmentsByStudent(studentRut);

    return Promise.resolve(
      enrolled.map((enrollment) => {
        const subjectClasses = this.academicRepository.findClassesBySubject(
          enrollment.subjectId,
        );
        const attendedClasses =
          this.attendanceRepository.countPresentByStudentAndSubject(
            studentRut,
            enrollment.subjectId,
          );

        return {
          subjectName: this.academicRepository.findSubjectName(
            enrollment.subjectId,
          ),
          attendedClasses,
          totalClasses: subjectClasses.length,
        };
      }),
    );
  }

  findClass(classId: number): Promise<ClassSession | null> {
    return Promise.resolve(this.academicRepository.findClass(classId));
  }

  assistanceExists(studentRut: string, classId: number): Promise<boolean> {
    return Promise.resolve(
      this.attendanceRepository.assistanceExists(studentRut, classId),
    );
  }

  insertAssistance(
    record: Omit<AssistanceRecord, 'id'>,
  ): Promise<AssistanceRecord> {
    return Promise.resolve(this.attendanceRepository.insertAssistance(record));
  }

  findTeaching(professorRut: string, subjectId: string): Promise<boolean> {
    return Promise.resolve(
      this.academicRepository.findTeaching(professorRut, subjectId),
    );
  }

  findStudentsAssistanceBySubject(
    subjectId: string,
  ): Promise<StudentAssistance[]> {
    const enrolled = this.academicRepository.findEnrollmentsBySubject(subjectId);
    const subjectClasses = this.academicRepository.findClassesBySubject(subjectId);
    const totalClasses = subjectClasses.length;

    return Promise.resolve(
      enrolled.map((enrollment) => {
        const student = this.academicRepository.findStudent(
          enrollment.studentRut,
        );
        const classesAttended =
          this.attendanceRepository.countPresentByStudentAndSubject(
            enrollment.studentRut,
            subjectId,
          );
        const assistancePercentage =
          totalClasses > 0
            ? Math.round((classesAttended / totalClasses) * 100)
            : 0;

        return {
          rut: enrollment.studentRut,
          name: student?.name ?? 'Unknown',
          classesAttended,
          totalClasses,
          assistancePercentage,
        };
      }),
    );
  }

  private seedPerformanceFixtures(): void {
    this.seedStudent('12345678-9', 'Ana Garcia');
    this.seedEnrollment('12345678-9', 'ASG-01');

    for (let classId = 1; classId <= 50000; classId++) {
      this.seedClass({
        id: classId,
        subjectId: 'ASG-01',
        date: new Date(),
        registrationStatus: 'ENABLED',
      });
    }
  }
}
