import { Module } from '@nestjs/common';
import { I18nModule, AcceptLanguageResolver, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';

@Module({
    imports: [
        I18nModule.forRoot({
            fallbackLanguage: 'ru',
            loaderOptions: {
                path: path.join(__dirname, '../../../i18n/'), // Points to dist/i18n/ relative to dist/src/modules/i18n/
                watch: true,
            },
            resolvers: [
                { use: QueryResolver, options: ['lang'] },
                AcceptLanguageResolver,
                new HeaderResolver(['x-lang']),
            ],
        }),
    ],
})
export class AppI18nModule { }
