import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { OR: [{ last_name: { contains: 'Хаётов' } }, { first_name: { contains: 'Хаётов' } }] }
    });
    
    if (users.length > 0) {
        console.log(`Found User: ${users[0].first_name} ${users[0].last_name} (${users[0].telegram_id})`);
        
        // Add to AdminUser
        const admin = await prisma.adminUser.upsert({
            where: { email: 'admin@newton.com' },
            update: { telegram_id: users[0].telegram_id, is_active: true },
            create: {
                email: 'admin@newton.com',
                password_hash: 'ignored-for-telegram',
                name: 'System Admin',
                telegram_id: users[0].telegram_id,
                role: 'ADMIN',
                is_active: true
            }
        });
        
        console.log('Successfully added to AdminUser:', admin.telegram_id);
    } else {
        console.log('User not found by name. Fetching first registered user.');
        const firstUser = await prisma.user.findFirst();
        if (firstUser) {
            console.log(`Found First User: ${firstUser.first_name} ${firstUser.last_name} (${firstUser.telegram_id})`);
            const admin = await prisma.adminUser.upsert({
                where: { email: 'admin@newton.com' },
                update: { telegram_id: firstUser.telegram_id, is_active: true },
                create: {
                    email: 'admin@newton.com',
                    password_hash: 'ignored-for-telegram',
                    name: 'System Admin',
                    telegram_id: firstUser.telegram_id,
                    role: 'ADMIN',
                    is_active: true
                }
            });
            console.log('Successfully added to AdminUser:', admin.telegram_id);
        } else {
            console.log('No users found in database.');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
