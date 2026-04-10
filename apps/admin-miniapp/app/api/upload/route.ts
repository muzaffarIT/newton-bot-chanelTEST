import { NextRequest, NextResponse } from 'next/server';

/**
 * Upload API Route — proxies image uploads to Telegraph (telegra.ph).
 *
 * Telegraph expects multipart/form-data with a file field.
 * We extract the file as a Blob and rebuild a clean FormData to avoid
 * boundary/encoding issues when forwarding from Next.js.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Unsupported file type. Only JPEG, PNG, GIF, WebP are allowed.' },
                { status: 400 },
            );
        }

        // Max 5 MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        // Read file as ArrayBuffer and re-create as Blob
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });

        // Build a clean FormData for Telegraph
        const uploadForm = new FormData();
        uploadForm.append('file', blob, file.name || 'upload.jpg');

        const response = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: uploadForm,
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('[upload] Telegraph returned error:', response.status, text);
            return NextResponse.json(
                { error: `Telegraph upload failed: ${response.status}`, details: text },
                { status: 502 },
            );
        }

        const data = await response.json();

        if (Array.isArray(data) && data[0]?.src) {
            return NextResponse.json({ url: 'https://telegra.ph' + data[0].src });
        }

        if (data?.error) {
            return NextResponse.json({ error: data.error }, { status: 500 });
        }

        return NextResponse.json(
            { error: 'Unexpected response from Telegraph', details: data },
            { status: 500 },
        );
    } catch (error: any) {
        console.error('[upload] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
