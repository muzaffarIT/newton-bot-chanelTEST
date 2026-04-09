import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const telegraPhData = new FormData();
        telegraPhData.append('file', file);

        const response = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: telegraPhData,
        });

        const data = await response.json();

        if (data && data[0] && data[0].src) {
            return NextResponse.json({ url: 'https://telegra.ph' + data[0].src });
        } else {
            return NextResponse.json({ error: 'Failed to upload to Telegraph' }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
