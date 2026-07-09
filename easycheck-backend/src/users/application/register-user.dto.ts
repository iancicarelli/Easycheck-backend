import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { UserRole } from '../domain/user-role.enum';

export class RegisterUserDto {
  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @Matches(/^\d{7,8}-[\dkK]$/)
  rut!: string;

  @ApiProperty({ example: 'a.garcia01@ufromail.cl' })
  @IsEmail()
  institutionalEmail!: string;

  @ApiProperty({ example: 'ClaveInstitucional123' })
  @IsString()
  @IsNotEmpty()
  institutionalPassword!: string;

  @ApiProperty({ example: 'Ana Garcia' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ESTUDIANTE })
  @IsEnum(UserRole)
  role!: UserRole;
}
