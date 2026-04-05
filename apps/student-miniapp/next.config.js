/** @type {import('next').NextConfig} */
const nextConfig = {
    // basePath is removed since we deploy on a dedicated domain
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
