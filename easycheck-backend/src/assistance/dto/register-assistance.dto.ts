import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class RegisterAssistanceDto {
  @IsString()
  @IsNotEmpty()
  studentRut!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId!: number;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  qrSignature!: string;
}
