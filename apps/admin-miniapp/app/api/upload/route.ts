import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // We can just forward the original formData directly to telegra.ph.
        // It's perfectly formulated as multipart/form-data with the correct File object and boundary.
        const response = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: formData, // Forwarding the incoming formData directly!
        });

        const data = await response.json();

        if (data && data[0] && data[0].src) {
            return NextResponse.json({ url: 'https://telegra.ph' + data[0].src });
        } else {
            return NextResponse.json({ error: 'Failed to upload to Telegraph', details: data }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
