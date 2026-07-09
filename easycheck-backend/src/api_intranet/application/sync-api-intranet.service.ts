import { Injectable } from '@nestjs/common';
import { DataRepository } from '../../assistance/Data.repository';
import { SubjectRepository } from '../../subject/infrastructure/in-memory-subject.repository';
import { ApiIntranetSyncResult } from '../domain/api-intranet.types';
import { ApiIntranetMockService } from '../infrastructure/api-intranet-mock.service';

@Injectable()
export class ApiIntranetSyncService {
  constructor(
    private readonly apiIntranet: ApiIntranetMockService,
    private readonly dataRepository: DataRepository,
    private readonly subjectRepository: SubjectRepository,
  ) {}

  async syncAcademicData(): Promise<ApiIntranetSyncResult> {
    const subjects = this.apiIntranet.getSubjects();
    const students = this.apiIntranet
      .getUsers()
      .filter((user) => user.role === 'ESTUDIANTE');
    const enrollments = this.apiIntranet.getEnrollments();
    const teachings = this.apiIntranet.getTeachings();
    const classes = this.apiIntranet.getClasses();

    await Promise.all(
      subjects.map((subject) => this.subjectRepository.save(subject)),
    );
    subjects.forEach((subject) => {
      this.dataRepository.seedSubject({
        code: subject.code,
        name: subject.name,
      });
    });
    students.forEach((student) => {
      this.dataRepository.seedStudent(student.rut, student.fullName);
    });
    enrollments.forEach((enrollment) => {
      this.dataRepository.seedEnrollment(
        enrollment.studentRut,
        enrollment.subjectId,
      );
    });
    teachings.forEach((teaching) => {
      this.dataRepository.seedTeaching(teaching.professorRut, teaching.subjectId);
    });
    classes.forEach((classSession) => {
      this.dataRepository.seedClass(classSession);
    });

    return {
      message: 'Sincronizacion completada',
      users: this.dataRepository.countStudents(),
      subjects: this.subjectRepository.count(),
      enrollments: this.dataRepository.countEnrollments(),
      teachings: this.dataRepository.countTeachings(),
      classes: this.dataRepository.countClasses(),
    };
  }
}
