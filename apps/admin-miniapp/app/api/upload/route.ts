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

        // Allow up to 5MB file sizes to be safely encoded into base64.
        const MAX_SIZE = 5 * 1024 * 1024;
        
        if (buffer.length > MAX_SIZE) {
            return NextResponse.json(
                { error: `Файл слишком большой (${Math.round(buffer.length / 1024 / 1024)}МБ). Максимальный размер 5МБ.` },
                { status: 413 }
            );
        }

        const base64 = buffer.toString('base64');
        const dataUrl = `data:${fileType};base64,${base64}`;

        return NextResponse.json({ url: dataUrl, fileName, fileType, isDocument: fileType === 'application/pdf' || fileType.includes('document') });

        return NextResponse.json(
            { error: `Неподдерживаемый тип файла: ${fileType}. Используйте JPG, PNG, WebP, GIF или PDF.` },
            { status: 415 }
        );
    } catch (error: any) {
        console.error('[upload] error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
