import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Newton Academy database...\n');

  // ─── 1. Directions ──────────────────────────────────────────────────────────
  const directions = await Promise.all([
    prisma.direction.upsert({
      where: { name: 'Президентские школы' },
      update: {},
      create: { name: 'Президентские школы' },
    }),
    prisma.direction.upsert({
      where: { name: 'Математика и Физика' },
      update: {},
      create: { name: 'Математика и Физика' },
    }),
    prisma.direction.upsert({
      where: { name: 'Английский язык' },
      update: {},
      create: { name: 'Английский язык' },
    }),
    prisma.direction.upsert({
      where: { name: 'IT и Программирование' },
      update: {},
      create: { name: 'IT и Программирование' },
    }),
  ]);
  console.log(`✅ Created ${directions.length} directions`);

  // ─── 2. Topics ───────────────────────────────────────────────────────────────
  const topics = await Promise.all([
    prisma.topic.upsert({
      where: { name: 'Логика и IQ' },
      update: {},
      create: { name: 'Логика и IQ', description: 'Логические задачи и задачи на IQ' },
    }),
    prisma.topic.upsert({
      where: { name: 'Математика' },
      update: {},
      create: { name: 'Математика', description: 'Арифметика, алгебра, геометрия' },
    }),
    prisma.topic.upsert({
      where: { name: 'Английский язык' },
      update: {},
      create: { name: 'Английский язык', description: 'Грамматика и словарный запас' },
    }),
  ]);
  console.log(`✅ Created ${topics.length} topics`);

  const [topicLogic, topicMath, topicEnglish] = topics;

  // ─── 3. Test ─────────────────────────────────────────────────────────────────
  // Check if test already exists
  const existingTest = await prisma.test.findFirst({
    where: { title: 'Вступительный тест Newton Academy' },
  });

  let test = existingTest;
  if (!test) {
    test = await prisma.test.create({
      data: {
        title: 'Вступительный тест Newton Academy',
        description: 'Проверьте свои знания и определите уровень подготовки. Тест включает задачи по логике, математике и английскому языку.',
        duration_minutes: 60,
        is_active: true,
        allow_retakes: false,
        questions: {
          create: [
            // Logic (3 questions)
            {
              content: 'Какое число следует дальше в ряду: 2, 4, 8, 16, ...?',
              topic_id: topicLogic.id,
              order_num: 1,
              options: {
                create: [
                  { content: '24', is_correct: false },
                  { content: '32', is_correct: true },
                  { content: '28', is_correct: false },
                  { content: '30', is_correct: false },
                ],
              },
            },
            {
              content: 'Если все кошки — животные, и некоторые животные — домашние, то:',
              topic_id: topicLogic.id,
              order_num: 2,
              options: {
                create: [
                  { content: 'Все кошки — домашние', is_correct: false },
                  { content: 'Некоторые кошки могут быть домашними', is_correct: true },
                  { content: 'Ни одна кошка не домашняя', is_correct: false },
                  { content: 'Все домашние животные — кошки', is_correct: false },
                ],
              },
            },
            {
              content: 'Найдите лишнее слово: Яблоко, Груша, Морковь, Апельсин',
              topic_id: topicLogic.id,
              order_num: 3,
              options: {
                create: [
                  { content: 'Яблоко', is_correct: false },
                  { content: 'Груша', is_correct: false },
                  { content: 'Морковь', is_correct: true },
                  { content: 'Апельсин', is_correct: false },
                ],
              },
            },
            // Math (4 questions)
            {
              content: 'Чему равно 15% от 200?',
              topic_id: topicMath.id,
              order_num: 4,
              options: {
                create: [
                  { content: '25', is_correct: false },
                  { content: '30', is_correct: true },
                  { content: '35', is_correct: false },
                  { content: '20', is_correct: false },
                ],
              },
            },
            {
              content: 'Если x + 5 = 12, то x = ?',
              topic_id: topicMath.id,
              order_num: 5,
              options: {
                create: [
                  { content: '5', is_correct: false },
                  { content: '6', is_correct: false },
                  { content: '7', is_correct: true },
                  { content: '8', is_correct: false },
                ],
              },
            },
            {
              content: 'Площадь прямоугольника со сторонами 6 и 9 равна:',
              topic_id: topicMath.id,
              order_num: 6,
              options: {
                create: [
                  { content: '45', is_correct: false },
                  { content: '54', is_correct: true },
                  { content: '48', is_correct: false },
                  { content: '63', is_correct: false },
                ],
              },
            },
            {
              content: 'Поезд движется со скоростью 60 км/ч. За 2.5 часа он проедет:',
              topic_id: topicMath.id,
              order_num: 7,
              options: {
                create: [
                  { content: '120 км', is_correct: false },
                  { content: '150 км', is_correct: true },
                  { content: '180 км', is_correct: false },
                  { content: '100 км', is_correct: false },
                ],
              },
            },
            // English (3 questions)
            {
              content: 'Choose the correct form: "She ___ to school every day."',
              topic_id: topicEnglish.id,
              order_num: 8,
              options: {
                create: [
                  { content: 'go', is_correct: false },
                  { content: 'goes', is_correct: true },
                  { content: 'going', is_correct: false },
                  { content: 'gone', is_correct: false },
                ],
              },
            },
            {
              content: 'What is the opposite of "ancient"?',
              topic_id: topicEnglish.id,
              order_num: 9,
              options: {
                create: [
                  { content: 'old', is_correct: false },
                  { content: 'modern', is_correct: true },
                  { content: 'historical', is_correct: false },
                  { content: 'traditional', is_correct: false },
                ],
              },
            },
            {
              content: 'Choose the correct sentence:',
              topic_id: topicEnglish.id,
              order_num: 10,
              options: {
                create: [
                  { content: 'I am study English now.', is_correct: false },
                  { content: 'I studying English now.', is_correct: false },
                  { content: 'I am studying English now.', is_correct: true },
                  { content: 'I studying English now.', is_correct: false },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Created test: "${test.title}" with 10 questions`);
  } else {
    console.log(`ℹ️  Test already exists: "${test.title}"`);
  }

  // ─── 4. Rewards ───────────────────────────────────────────────────────────────
  const rewards = await Promise.all([
    prisma.reward.upsert({
      where: { id: 'reward-discount-10' },
      update: {},
      create: {
        id: 'reward-discount-10',
        title_ru: 'Скидка 10% на курс',
        title_uz: 'Kursga 10% chegirma',
        description_ru: 'Получите скидку 10% на любой курс Newton Academy',
        description_uz: "Newton Academy istalgan kursiga 10% chegirma oling",
        point_cost: 100,
        stock_limits: null,
        is_active: true,
        type: 'DISCOUNT',
      },
    }),
    prisma.reward.upsert({
      where: { id: 'reward-trial-lesson' },
      update: {},
      create: {
        id: 'reward-trial-lesson',
        title_ru: 'Пробный урок бесплатно',
        title_uz: "Bepul sinov darsi",
        description_ru: 'Посетите один урок любого курса бесплатно',
        description_uz: "Istalgan kursning bitta darsiga bepul tashrif buyuring",
        point_cost: 50,
        stock_limits: 20,
        is_active: true,
        type: 'TRIAL_LESSON',
      },
    }),
    prisma.reward.upsert({
      where: { id: 'reward-consultation' },
      update: {},
      create: {
        id: 'reward-consultation',
        title_ru: 'Консультация с методистом',
        title_uz: "Metodik bilan konsultatsiya",
        description_ru: 'Индивидуальная 30-минутная консультация с нашим методистом',
        description_uz: "Metodistimiz bilan 30 daqiqalik individual konsultatsiya",
        point_cost: 200,
        stock_limits: null,
        is_active: true,
        type: 'CONSULTATION',
      },
    }),
  ]);
  console.log(`✅ Created ${rewards.length} rewards`);

  // ─── 5. Admin User ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@newton.uz';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@2024!';
  const adminName = process.env.ADMIN_NAME || 'Newton Admin';

  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.create({
      data: { email: adminEmail, password_hash, name: adminName, role: 'ADMIN' },
    });
    console.log(`✅ Created admin: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log(`📚 Test: "${test.title}"`);
  console.log(`👤 Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`🎁 Rewards: ${rewards.length} items`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
