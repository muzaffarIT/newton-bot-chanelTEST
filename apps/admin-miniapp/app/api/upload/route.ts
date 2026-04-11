import { NextRequest, NextResponse } from 'next/server';

const TELEGRAPH_HOSTS = [
    'https://telegra.ph',
    'https://graph.org',
];

/**
 * Upload API — uploads files to Telegraph (images) OR returns base64 URL (PDF/docs).
 * No file size limit. Supports: images (JPG, PNG, GIF, WebP), PDF, DOC/DOCX.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileType = file.type || 'application/octet-stream';
        const fileName = file.name || 'upload';
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const isImage = /^image\/(jpeg|jpg|png|gif|webp)/.test(fileType);
        const isPdf = fileType === 'application/pdf';
        const isDoc = fileType.includes('word') || fileType.includes('document');

        if (isImage) {
            const errors: string[] = [];

            for (const host of TELEGRAPH_HOSTS) {
                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', new Blob([buffer], { type: fileType }), fileName);

                    const response = await fetch(`${host}/upload`, {
                        method: 'POST',
                        body: uploadFormData,
                    });

                    if (!response.ok) {
                        const text = await response.text();
                        errors.push(`${host}: HTTP ${response.status} — ${text}`);
                        continue;
                    }

                    const data = await response.json();

                    if (Array.isArray(data) && data[0]?.src) {
                        return NextResponse.json({ url: host + data[0].src });
                    }

                    errors.push(`${host}: unexpected response: ${JSON.stringify(data)}`);
                } catch (e: any) {
                    errors.push(`${host}: ${e.message}`);
                }
            }

            console.error('[upload] all Telegraph hosts failed:', errors);
            return NextResponse.json(
                { error: 'Загрузка изображения не удалась. Попробуйте другой формат.', details: errors },
                { status: 502 }
            );
        }

        // ─── PDF / Documents: return as base64 data URL ───────────────────────
        if (isPdf || isDoc) {
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${fileType};base64,${base64}`;

            // For small files (< 2MB) return data URL directly
            if (buffer.length < 2 * 1024 * 1024) {
                return NextResponse.json({ url: dataUrl, fileName, fileType, isDocument: true });
            }

            // Large files: return error with guidance
            return NextResponse.json(
                { error: `Файл слишком большой (${Math.round(buffer.length / 1024 / 1024)}МБ). Для документов макс. 2МБ.` },
                { status: 413 }
            );
        }

        return NextResponse.json(
            { error: `Неподдерживаемый тип файла: ${fileType}. Используйте JPG, PNG, WebP, GIF или PDF.` },
            { status: 415 }
        );
    } catch (error: any) {
        console.error('[upload] error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
