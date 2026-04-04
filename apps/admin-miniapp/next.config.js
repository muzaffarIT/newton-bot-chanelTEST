/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/admin',
    trailingSlash: true,
    // Telegram Mini Apps run as SPA in an iframe
    // output: 'export',
    images: { unoptimized: true },
    env: {
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    },
}

module.exports = nextConfig
