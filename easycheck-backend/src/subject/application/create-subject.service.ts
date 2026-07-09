import { Injectable } from '@nestjs/common';
import { SubjectRepository } from '../infrastructure/in-memory-subject.repository';
import {
  CreateSubjectDto,
  CreateSubjectResult,
} from '../domain/subject.types';
import {
  InvalidFieldFormatException,
  MissingFieldsException,
  SubjectAlreadyExistsException,
} from '../domain/subject.errors';

@Injectable()
export class SubjectService {
  private readonly invalidCharsRegex = /[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s-]/;

  constructor(private readonly subjectRepository: SubjectRepository) {}

  async createSubject(dto: CreateSubjectDto): Promise<CreateSubjectResult> {
    const subject = this.normalizeSubject(dto);
    this.validateRequiredFields(subject);
    this.validateFieldFormat(subject);
    await this.assertCodeIsUnique(subject.code);
    const saved = await this.subjectRepository.save(subject);
    return { message: 'Asignatura registrada correctamente', subject: saved };
  }

  private normalizeSubject(dto: CreateSubjectDto): CreateSubjectDto {
    return {
      code: dto.code?.trim() ?? '',
      name: dto.name?.trim() ?? '',
      career: dto.career?.trim() ?? '',
    };
  }

  private validateRequiredFields(dto: CreateSubjectDto): void {
    const missingFields = (['code', 'name', 'career'] as const).filter(
      (field) => !dto[field] || dto[field].trim() === '',
    );
    if (missingFields.length > 0) {
      throw new MissingFieldsException(missingFields);
    }
  }

  private validateFieldFormat(dto: CreateSubjectDto): void {
    const invalidField = (['code', 'name', 'career'] as const).find((field) =>
      this.invalidCharsRegex.test(dto[field]),
    );
    if (invalidField) {
      throw new InvalidFieldFormatException(invalidField);
    }
  }

  private async assertCodeIsUnique(code: string): Promise<void> {
    const existing = await this.subjectRepository.findByCode(code);
    if (existing) {
      throw new SubjectAlreadyExistsException(code);
    }
  }
}
