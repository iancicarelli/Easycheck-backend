import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AssistanceModule } from './assistance/Assistance.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/Auth.module';
import { SubjectModule } from './subject/Subject.module';
import { ApiIntranetModule } from './api-intranet/api-intranet.module';

// DatabaseModule solo abre conexión a Postgres si DB_HOST está definido
// (modo Docker); sin la variable el backend corre 100 % in-memory.
@Module({
  imports: [
    DatabaseModule,
    AssistanceModule,
    UsersModule,
    AuthModule,
    SubjectModule,
    ApiIntranetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
