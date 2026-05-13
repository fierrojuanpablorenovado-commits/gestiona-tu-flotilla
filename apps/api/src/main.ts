import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setDescription('SaaS Fleet Management Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('vehicles', 'Vehicle Management')
    .addTag('drivers', 'Driver Management')
    .addTag('recruitment', 'Driver Recruitment Pipeline')
    .addTag('contracts', 'Contracts & Deposits')
    .addTag('maintenance', 'Maintenance Orders')
    .addTag('treasury', 'Income, Expenses & Treasury')
    .addTag('conciliation', 'Platform Conciliation (Uber/Didi)')
    .addTag('incidents', 'Incidents, Tickets & Accidents')
    .addTag('location', 'GPS & Geofencing')
    .addTag('partners', 'Partners & Profit Distribution')
    .addTag('notifications', 'Alerts & Notifications')
    .addTag('reports', 'Reports & BI')
    .addTag('dashboard', 'Executive Dashboards')
    .addTag('settings', 'Tenant Settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 FleetCore API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs on http://localhost:${port}/api/docs`);
}
bootstrap();
