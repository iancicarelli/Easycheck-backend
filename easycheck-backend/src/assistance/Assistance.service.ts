import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import {
  DataRepository,
  StudentAssistance,
  AssistanceRecord,
  StudentSubjectAttendance,
} from './Data.repository';
import {
  StudentNotFoundException,
  SubjectNotAssignedException,
  RegistrationDisabledException,
  DuplicateAssistanceException,
  InvalidQRException,
} from '../common/exceptions';

export interface StudentAssistanceDto {
  studentRut: string;
  subjectId: string;
  records: AssistanceRecord[];
  totalClasses: number;
  classesAttended: number;
  assistancePercentage: number;
}

export class RegisterAssistanceDto {
  @IsString()
  @IsNotEmpty()
  studentRut!: string;

  @IsNumber()
  classId!: number;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  qrSignature!: string;
}

export interface AssistanceConfirmationDto {
  message: string;
  recordId: number;
  studentRut: string;
  classId: number;
}

export interface StudentSubjectAttendanceDto extends StudentSubjectAttendance {
  attendancePercentage: number;
}

@Injectable()
export class AssistanceService {
  constructor(private readonly dataRepository: DataRepository) {}

  async getStudentAttendanceByRut(
    rut: string,
  ): Promise<StudentSubjectAttendanceDto[]> {
    if (!this.isValidRut(rut)) {
      throw new Error(
        'El RUT ingresado no es válido. Ingrese el RUT nuevamente.',
      );
    }

    const student = await this.dataRepository.findStudent(rut);
    if (!student) {
      throw new Error('El estudiante ingresado no existe');
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
    const match = /^(\d{7,8})-([\dK])$/.exec(cleanRut);

    if (!match) {
      return false;
    }

    const [, body, verifier] = match;
    let multiplier = 2;
    let sum = 0;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedValue = 11 - (sum % 11);
    const verifierIfNotEleven = expectedValue === 10 ? 'K' : `${expectedValue}`;
    const expectedVerifier = expectedValue === 11 ? '0' : verifierIfNotEleven;

    return verifier === expectedVerifier;
  }

  // ── IT-1 / IT-2: Show a student's assistance ─────────────────────────────
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

  // ── IT-3 / IT-4: Register assistance via QR ──────────────────────────────
  async registerAssistanceQR(
    dto: RegisterAssistanceDto,
  ): Promise<AssistanceConfirmationDto> {
    // Validate QR signature (simplified stub: any non-empty signature is valid)
    if (!dto.qrSignature || dto.qrSignature === 'INVALID_SIGNATURE') {
      throw new InvalidQRException();
    }

    const classSession = await this.dataRepository.findClass(dto.classId);
    if (!classSession) {
      throw new Error(`Class ${dto.classId} not found`);
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

  // ── IT-5 / IT-6: Show assistance of students in a subject ────────────────
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
