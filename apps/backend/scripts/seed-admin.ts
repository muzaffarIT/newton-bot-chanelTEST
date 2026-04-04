import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const EMAIL = process.env.ADMIN_EMAIL || 'admin@newton.uz';
    const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    const NAME = process.env.ADMIN_NAME || 'Newton Admin';

    console.log(`🚀 Seeding admin: ${EMAIL}...`);

    try {
        const existing = await prisma.adminUser.findUnique({ where: { email: EMAIL } });
        const password_hash = await bcrypt.hash(PASSWORD, 12);

        if (existing) {
            await prisma.adminUser.update({
                where: { email: EMAIL },
                data: { password_hash, name: NAME },
            });
            console.log(`✅ Admin user updated: ${EMAIL}`);
        } else {
            const admin = await prisma.adminUser.create({
                data: {
                    email: EMAIL,
                    password_hash,
                    name: NAME,
                    role: AdminRole.ADMIN,
                },
            });
            console.log(`✅ Admin user created: ${admin.email}`);
        }
    } catch (e) {
        console.error('❌ Seed failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
