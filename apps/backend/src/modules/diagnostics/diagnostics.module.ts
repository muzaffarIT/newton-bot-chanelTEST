import { Global, Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsFormatterService } from './diagnostics-formatter.service';

@Global()
@Module({
    providers: [DiagnosticsService, DiagnosticsFormatterService],
    exports: [DiagnosticsService, DiagnosticsFormatterService],
})
export class DiagnosticsModule { }
