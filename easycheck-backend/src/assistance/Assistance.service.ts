import { Injectable } from '@nestjs/common';
import { DataRepository, StudentAssistance } from './Data.repository';
import {
  StudentNotFoundException,
  InvalidStudentRutException,
  StudentAttendanceNotFoundException,
  SubjectNotAssignedException,
  ClassNotFoundException,
  RegistrationDisabledException,
  DuplicateAssistanceException,
  InvalidQRException,
} from './domain/assistance.errors';
import {
  AssistanceConfirmationDto,
  AssistanceQrDto,
  StudentAssistanceDto,
  StudentSubjectAttendanceDto,
} from './domain/assistance.types';
import { RegisterAssistanceDto } from './dto/register-assistance.dto';
import { QrService } from './application/qr.service';

@Injectable()
export class AssistanceService {
  constructor(
    private readonly dataRepository: DataRepository,
    private readonly qrService: QrService = new QrService(),
  ) {}

  async getStudentAttendanceByRut(
    rut: string,
  ): Promise<StudentSubjectAttendanceDto[]> {
    if (!this.isValidRut(rut)) {
      throw new InvalidStudentRutException();
    }

    const student = await this.dataRepository.findStudent(rut);
    if (!student) {
      throw new StudentAttendanceNotFoundException(rut);
    }

    const attendanceRows =
      await this.dataRepository.findStudentAttendanceByRut(rut);

    return attendanceRows.map((row) => ({
      ...row,
      attendancePercentage:
        row.totalClasses > 0
          ? Math.round((row.attendedClasses / row.totalClasses) * 100)
          : 0,
    }));
  }

  private isValidRut(rut: string): boolean {
    const cleanRut = rut.replaceAll('.', '').toUpperCase();
    return /^\d{7,8}-[\dK]$/.test(cleanRut);
  }

  async getStudentAssistance(
    studentRut: string,
    subjectId: string,
  ): Promise<StudentAssistanceDto> {
    const student = await this.dataRepository.findStudent(studentRut);
    if (!student) {
      throw new StudentNotFoundException(studentRut);
    }

    const records =
      await this.dataRepository.findAssistancesByStudentAndSubject(
        studentRut,
        subjectId,
      );

    const classesAttended = records.filter((r) => r.present).length;
    const totalClasses = records.length;
    const assistancePercentage =
      totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

    return {
      studentRut,
      subjectId,
      records,
      totalClasses,
      classesAttended,
      assistancePercentage,
    };
  }

  async generateAssistanceQR(
    professorRut: string,
    subjectId: string,
    classId: number,
  ): Promise<AssistanceQrDto> {
    const teaches = await this.dataRepository.findTeaching(
      professorRut,
      subjectId,
    );
    if (!teaches) {
      throw new SubjectNotAssignedException(professorRut, subjectId);
    }

    const classSession = await this.dataRepository.findClass(classId);
    if (!classSession) {
      throw new ClassNotFoundException(classId);
    }
    if (classSession.subjectId !== subjectId) {
      throw new InvalidQRException('Class does not belong to subject');
    }

    return {
      qrSignature: this.qrService.generate({
        professorRut,
        subjectId,
        classId,
      }),
      subjectId,
      classId,
    };
  }

  async registerAssistanceQR(
    dto: RegisterAssistanceDto,
  ): Promise<AssistanceConfirmationDto> {
    if (
      !dto.qrSignature ||
      !this.qrService.matches(dto.qrSignature, {
        subjectId: dto.subjectId,
        classId: dto.classId,
      })
    ) {
      throw new InvalidQRException();
    }

    const classSession = await this.dataRepository.findClass(dto.classId);
    if (!classSession) {
      throw new ClassNotFoundException(dto.classId);
    }

    if (classSession.registrationStatus === 'DISABLED') {
      throw new RegistrationDisabledException(dto.classId);
    }

    const alreadyRegistered = await this.dataRepository.assistanceExists(
      dto.studentRut,
      dto.classId,
    );
    if (alreadyRegistered) {
      throw new DuplicateAssistanceException(dto.studentRut, dto.classId);
    }

    const record = await this.dataRepository.insertAssistance({
      studentRut: dto.studentRut,
      classId: dto.classId,
      subjectId: dto.subjectId,
      date: new Date(),
      present: true,
    });

    return {
      message: 'Assistance registered successfully',
      recordId: record.id,
      studentRut: dto.studentRut,
      classId: dto.classId,
    };
  }

  async getStudentsAssistanceBySubject(
    professorRut: string,
    subjectId: string,
  ): Promise<StudentAssistance[]> {
    const teaches = await this.dataRepository.findTeaching(
      professorRut,
      subjectId,
    );
    if (!teaches) {
      throw new SubjectNotAssignedException(professorRut, subjectId);
    }

    return this.dataRepository.findStudentsAssistanceBySubject(subjectId);
  }
}
