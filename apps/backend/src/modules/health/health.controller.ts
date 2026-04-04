import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';

/**
 * Health Check endpoint — used by Railway, Docker, and load balancers.
 * GET /health → { status: 'ok', info: {...} }
 */
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        // Simple self-ping — confirms app is responsive
        return this.health.check([
            () => this.http.pingCheck('self', `http://localhost:${process.env.PORT || 3000}/health/ping`),
        ]);
    }

    // Simple ping endpoint for self-check
    @Get('ping')
    ping() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
}
