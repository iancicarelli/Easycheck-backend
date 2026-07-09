export interface Subject {
  code: string;
  name: string;
  career: string;
}

export interface CreateSubjectDto {
  code: string;
  name: string;
  career: string;
}

export interface CreateSubjectResult {
  message: string;
  subject: Subject;
}
