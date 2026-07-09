import {
  AssistanceRecord,
  StudentSubjectAttendance,
} from '../Data.repository';

export interface StudentAssistanceDto {
  studentRut: string;
  subjectId: string;
  records: AssistanceRecord[];
  totalClasses: number;
  classesAttended: number;
  assistancePercentage: number;
}

export interface AssistanceConfirmationDto {
  message: string;
  recordId: number;
  studentRut: string;
  classId: number;
}

export interface AssistanceQrDto {
  qrSignature: string;
  subjectId: string;
  classId: number;
}

export interface StudentSubjectAttendanceDto extends StudentSubjectAttendance {
  attendancePercentage: number;
}
