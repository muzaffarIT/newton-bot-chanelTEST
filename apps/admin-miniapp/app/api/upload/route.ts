import { NextRequest, NextResponse } from 'next/server';

const BACKENDS = [
    'https://telegra.ph/upload',
    'https://graph.org/upload',
];

/**
 * Upload API Route — uploads image to Telegraph/Graph.
 *
 * Approach:
 * 1. Read the uploaded file as bytes
 * 2. Build a multipart/form-data body manually using the file bytes
 * 3. Send to telegra.ph with correct headers
 * 4. Return the resulting URL
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const fileType = file.type || 'image/jpeg';
        if (!allowedTypes.some(t => fileType.includes(t.split('/')[1]))) {
            return NextResponse.json(
                { error: 'Unsupported file type. Only JPEG, PNG, GIF, WebP are allowed.' },
                { status: 400 },
            );
        }

        // Max 5 MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        const fileName = file.name || `upload.${fileType.split('/')[1] || 'jpg'}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Try each backend
        const errors: string[] = [];
        for (const backendUrl of BACKENDS) {
            try {
                const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;

                // Build multipart/form-data body manually
                const bodyParts: Buffer[] = [];

                // Part header
                const partHeader = Buffer.from(
                    `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                    `Content-Type: ${fileType}\r\n\r\n`
                );
                bodyParts.push(partHeader);
                bodyParts.push(buffer);
                bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

                const body = Buffer.concat(bodyParts);

                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                        'Content-Length': String(body.length),
                        'Accept': 'application/json',
                        'Origin': 'https://telegra.ph',
                        'Referer': 'https://telegra.ph/',
                    },
                    body,
                });

                if (!response.ok) {
                    const text = await response.text();
                    errors.push(`${backendUrl} returned ${response.status}: ${text}`);
                    continue;
                }

                const data = await response.json();
                console.log('[upload] Response from', backendUrl, ':', JSON.stringify(data));

                if (Array.isArray(data) && data[0]?.src) {
                    const baseUrl = new URL(backendUrl).origin;
                    return NextResponse.json({ url: baseUrl + data[0].src });
                }

                if (data?.error) {
                    errors.push(`${backendUrl} error: ${data.error}`);
                    continue;
                }
            } catch (e: any) {
                errors.push(`${backendUrl} exception: ${e.message}`);
            }
        }

        // All backends failed — log and return error
        console.error('[upload] All backends failed:', errors);
        return NextResponse.json(
            { error: 'Image upload failed. Please try a smaller file or different format.', details: errors },
            { status: 502 },
        );
    } catch (error: any) {
        console.error('[upload] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
