import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // 0. API Prefix and Proxy Trust
    app.setGlobalPrefix('api');
    (app as any).set('trust proxy', 1);

    // 1. Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
    }));

    // 2. CORS for admin panel
    const adminOrigin = process.env.ADMIN_PANEL_URL || 'http://localhost:3001';
    app.enableCors({
        origin: [adminOrigin, 'http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // 3. Swagger API Documentation (admin dev only)
    if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
        const config = new DocumentBuilder()
            .setTitle('Newton Academy Admin API')
            .setDescription('REST API for Newton Academy Telegram Bot Platform')
            .setVersion('1.0')
            .addBearerAuth(
                { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                'admin-jwt'
            )
            .addTag('auth', 'Authentication')
            .addTag('admin-dashboard', 'Dashboard KPIs')
            .addTag('admin-leads', 'Lead Management')
            .addTag('admin-tests', 'Test & Questions')
            .addTag('admin-topics', 'Topics')
            .addTag('admin-channels', 'Telegram Channels')
            .addTag('admin-users', 'Admin Users')
            .addTag('scheduler', 'Post Scheduler')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
        logger.log(`📖 Swagger docs: /api/docs`);
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    logger.log(`🚀 Application running on port ${port}`);
    logger.log(`❤️  Health check: /health`);
    logger.log(`📊 Admin API: /api/admin/dashboard/stats`);
}

bootstrap();
