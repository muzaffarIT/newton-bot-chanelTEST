/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/student',
    trailingSlash: true,
    // output: 'export',
    images: {
        unoptimized: true,
    },
    // Ensure we can embed in Telegram
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'ALLOWALL',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors *",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
