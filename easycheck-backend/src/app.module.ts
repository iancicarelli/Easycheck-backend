import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssistanceModule } from './assistance/Assistance.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/Auth.module';
import { SubjectModule } from './subject/Subject.module';
import { ApiIntranetModule } from './api_intranet/api-intranet.module';

@Module({
  imports: [
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
