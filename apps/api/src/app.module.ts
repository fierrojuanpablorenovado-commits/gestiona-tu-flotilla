import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { ConciliationModule } from './modules/conciliation/conciliation.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { LocationModule } from './modules/location/location.module';
import { PartnersModule } from './modules/partners/partners.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USER', 'fleetcore'),
        password: config.get('DB_PASSWORD', 'fleetcore'),
        database: config.get('DB_NAME', 'fleetcore_dev'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // NEVER true in production - use migrations
        logging: config.get('DB_LOGGING', 'false') === 'true',
        ssl: config.get('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Job scheduling (cron jobs for alerts, reports)
    ScheduleModule.forRoot(),

    // Queue system (background jobs: imports, notifications, reports)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
        },
      }),
    }),

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    RecruitmentModule,
    ContractsModule,
    MaintenanceModule,
    TreasuryModule,
    ConciliationModule,
    IncidentsModule,
    LocationModule,
    PartnersModule,
    NotificationsModule,
    DashboardModule,
    ReportsModule,
    DocumentsModule,
    CommentsModule,
    AuditModule,
  ],
})
export class AppModule {}
