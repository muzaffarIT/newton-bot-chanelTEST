'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const translations = {
  ru: {
    nav: {
      home: 'Главная',
      tests: 'Тесты',
      shop: 'Магазин',
      profile: 'Кабинет',
      support: 'Поддержка',
    },
    dashboard: {
      title: 'Личный кабинет',
      greeting: 'Добро пожаловать, {name}! 👋',
      pts: 'баллов',
      points_label: 'Мои баллы',
      rank_label: 'Рейтинг',
      stats: {
        completed: 'Пройдено',
        in_progress: 'В процессе',
        available: 'Доступно',
        tests: 'тестов',
      },
      featured_title: 'Актуальный тест',
      recent_title: 'Последние результаты',
      all: 'Все',
      history_title: 'История активностей',
      no_activity: 'Активностей пока нет. Пройдите свой первый тест!',
      start_test: 'Начать тест',
      view_all: 'Смотреть все',
      score: 'Результат',
      loading: 'Загрузка...',
    },
    tests: {
      title: 'Доступные тесты',
      subtitle: 'Выберите тест и проверьте свои знания',
      search: 'Поиск теста...',
      start: 'Начать',
      loading: 'Загрузка...',
      questions: 'вопросов',
      minutes: 'мин',
      exam: 'Экзамен',
      test: 'Тест',
      no_results: 'Тесты не найдены',
      no_results_sub: 'Попробуйте другой запрос',
      error: 'Ошибка запуска теста. Попробуйте ещё раз.',
    },
    test_player: {
      question: 'Вопрос',
      of: 'из',
      finish: 'Завершить',
      next: 'Далее',
      back: 'Назад',
      submit_confirm: 'Завершить тест и отправить ответы?',
      finish_confirm: 'Завершить тест?',
      navigation: 'Навигация по вопросам',
      answered: 'отвечено',
      close: 'Закрыть',
      loading: 'Загрузка теста...',
      error: 'Ошибка загрузки теста',
      no_questions: 'В тесте нет вопросов',
      back_to_tests: '← Назад к тестам',
      time_left: 'Осталось времени',
      done: 'Готово',
    },
    shop: {
      title: 'Магазин наград',
      subtitle: 'Обменяйте баллы на привилегии',
      balance: 'Мои баллы',
      pts: 'баллов',
      loading: 'Загрузка товаров...',
      out_of_stock: 'Нет в наличии',
      redeem: 'Обменять',
      confirm: 'Обменять {points} баллов на «{title}»?',
      success_title: 'Поздравляем!',
      success_desc: 'Награда «{title}» успешно получена! Администратор свяжется с вами.',
      no_items: 'Товары скоро появятся',
      no_items_sub: 'Зарабатывайте баллы и следите за обновлениями',
      not_enough: 'Недостаточно баллов',
      types: {
        DISCOUNT: 'Скидка',
        MATERIAL: 'Материал',
        CONSULTATION: 'Консультация',
        TRIAL_LESSON: 'Урок',
      },
      stock: 'в наличии',
      unlimited: 'без лимита',
    },
    profile: {
      title: 'Мой профиль',
      subtitle: 'Личные данные и настройки',
      info_section: 'Личная информация',
      name: 'Имя',
      phone: 'Телефон',
      grade: 'Класс',
      direction: 'Направление',
      language_section: 'Язык интерфейса',
      lang_ru: 'Русский',
      lang_uz: "O'zbek",
      stats_section: 'Моя статистика',
      total_tests: 'Всего тестов',
      avg_score: 'Средний балл',
      total_points: 'Баллов накоплено',
      save: 'Сохранить',
      saved: 'Сохранено',
      cancel: 'Отмена',
      edit: 'Изменить',
      logout: 'Выйти',
      logout_confirm: 'Вы уверены, что хотите выйти?',
      settings_section: 'Настройки',
      not_specified: 'Не указано',
    },
    support: {
      title: 'Поддержка',
      subtitle: 'Свяжитесь с нашим специалистом',
      description: 'Наш консультант готов ответить на все ваши вопросы о поступлении, обучении и курсах Newton Academy.',
      write_telegram: 'Написать в Telegram',
      call: 'Позвонить',
      schedule: 'График работы',
      schedule_days: 'Пн — Сб: 9:00 — 18:00',
      schedule_sunday: 'Воскресенье: выходной',
      faq_title: 'Часто задаваемые вопросы',
      faq: [
        { q: 'Как записаться на курс?', a: 'Напишите нашему консультанту в Telegram или позвоните по номеру выше.' },
        { q: 'Что такое Newton Academy?', a: 'Это образовательная платформа для подготовки к поступлению в ведущие вузы Узбекистана.' },
        { q: 'Как начать тест?', a: 'Перейдите во вкладку «Тесты», выберите дисциплину и нажмите «Начать».' },
      ],
    },
    results: {
      loading: 'Загрузка результата...',
      not_found: 'Результат не найден',
      title: 'Результат теста',
      date: 'от',
      correct: 'Верных ответов',
      level: 'Уровень',
      analysis: 'Анализ знаний',
      strengths: 'Сильные темы',
      weaknesses: 'Нужно подтянуть',
      cta_title: 'Хотите улучшить результат?',
      cta_desc: 'Запишитесь на индивидуальную консультацию с нашим методистом.',
      cta_btn: 'Записаться на консультацию',
      back: 'К тестам',
      score_label: 'Результат',
      questions_total: 'Всего вопросов',
      levels: {
        excellent: 'Отлично',
        good: 'Хорошо',
        satisfactory: 'Удовлетворительно',
        needs_work: 'Нужна работа',
      },
    },
    common: {
      loading: 'Загрузка...',
      error: 'Произошла ошибка',
      retry: 'Попробовать снова',
      back: 'Назад',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      confirm: 'Подтвердить',
    },
  },
  uz: {
    nav: {
      home: 'Bosh sahifa',
      tests: 'Testlar',
      shop: "Do'kon",
      profile: 'Kabinet',
      support: 'Yordam',
    },
    dashboard: {
      title: 'Shaxsiy kabinet',
      greeting: 'Xush kelibsiz, {name}! 👋',
      pts: 'ball',
      points_label: 'Mening ballarim',
      rank_label: 'Reyting',
      stats: {
        completed: 'Bajarilgan',
        in_progress: 'Jarayonda',
        available: 'Mavjud',
        tests: 'test',
      },
      featured_title: 'Dolzarb test',
      recent_title: "So'nggi natijalar",
      all: 'Barchasi',
      history_title: 'Faollik tarixi',
      no_activity: "Hozircha faollik yo'q. Birinchi testingizni boshlang!",
      start_test: 'Testni boshlash',
      view_all: 'Barchasini ko\'rish',
      score: 'Natija',
      loading: 'Yuklanmoqda...',
    },
    tests: {
      title: 'Mavjud testlar',
      subtitle: "Test tanlang va bilimingizni sinab ko'ring",
      search: 'Test qidirish...',
      start: 'Boshlash',
      loading: 'Yuklanmoqda...',
      questions: 'savol',
      minutes: 'daqiqa',
      exam: 'Imtihon',
      test: 'Test',
      no_results: 'Testlar topilmadi',
      no_results_sub: "Boshqa so'rov kiriting",
      error: "Test boshlanmadi. Qayta urinib ko'ring.",
    },
    test_player: {
      question: 'Savol',
      of: 'dan',
      finish: 'Yakunlash',
      next: 'Keyingi',
      back: 'Ortga',
      submit_confirm: 'Testni yakunlab javoblarni yuborasizmi?',
      finish_confirm: 'Testni yakunlash?',
      navigation: 'Savollar navigatsiyasi',
      answered: 'javob berilgan',
      close: 'Yopish',
      loading: 'Test yuklanmoqda...',
      error: 'Test yuklanmadi',
      no_questions: "Testda savollar yo'q",
      back_to_tests: '← Testlarga qaytish',
      time_left: 'Vaqt qoldi',
      done: 'Tayyor',
    },
    shop: {
      title: "Sovg'alar do'koni",
      subtitle: "Ballarni imtiyozlarga almashtiring",
      balance: 'Mening ballarim',
      pts: 'ball',
      loading: 'Mahsulotlar yuklanmoqda...',
      out_of_stock: 'Mavjud emas',
      redeem: 'Almashtirish',
      confirm: '{points} ballni «{title}» ga almashtirasizmi?',
      success_title: 'Tabriklaymiz!',
      success_desc: '«{title}» muvaffaqiyatli olindi! Administrator siz bilan bog\'lanadi.',
      no_items: 'Mahsulotlar tez orada qo\'shiladi',
      no_items_sub: "Ball to'plang va yangilanishlarni kuzating",
      not_enough: "Yetarli ball yo'q",
      types: {
        DISCOUNT: 'Chegirma',
        MATERIAL: 'Material',
        CONSULTATION: 'Konsultatsiya',
        TRIAL_LESSON: 'Dars',
      },
      stock: 'mavjud',
      unlimited: 'chegirsiz',
    },
    profile: {
      title: 'Mening profilim',
      subtitle: 'Shaxsiy ma\'lumotlar va sozlamalar',
      info_section: 'Shaxsiy ma\'lumotlar',
      name: 'Ism',
      phone: 'Telefon',
      grade: 'Sinf',
      direction: "Yo'nalish",
      language_section: 'Interfeys tili',
      lang_ru: 'Русский',
      lang_uz: "O'zbek",
      stats_section: 'Mening statistikam',
      total_tests: 'Jami testlar',
      avg_score: "O'rtacha ball",
      total_points: 'To\'plangan ballar',
      save: 'Saqlash',
      saved: 'Saqlandi',
      cancel: 'Bekor qilish',
      edit: "O'zgartirish",
      logout: 'Chiqish',
      logout_confirm: 'Hisobdan chiqmoqchimisiz?',
      settings_section: 'Sozlamalar',
      not_specified: "Ko'rsatilmagan",
    },
    support: {
      title: 'Yordam markazi',
      subtitle: 'Mutaxassisimiz bilan bog\'laning',
      description: "Konsultantimiz Newton Academy kurslari, o'qish va qabul haqida barcha savollaringizga javob beradi.",
      write_telegram: 'Telegramga yozish',
      call: 'Qo\'ng\'iroq qilish',
      schedule: 'Ish grafigi',
      schedule_days: 'Du — Sh: 9:00 — 18:00',
      schedule_sunday: 'Yakshanba: dam olish kuni',
      faq_title: "Ko'p so'raladigan savollar",
      faq: [
        { q: 'Kursga qanday yozilish mumkin?', a: "Telegramda konsultantimizga yozing yoki yuqoridagi raqamga qo'ng'iroq qiling." },
        { q: "Newton Academy nima?", a: "Bu O'zbekistonning yetakchi universitetlariga kirish uchun tayyorlash ta'lim platformasi." },
        { q: 'Testni qanday boshlash mumkin?', a: "«Testlar» bo'limiga o'ting, fanni tanlang va «Boshlash» tugmasini bosing." },
      ],
    },
    results: {
      loading: 'Natija yuklanmoqda...',
      not_found: 'Natija topilmadi',
      title: 'Test natijasi',
      date: 'sana:',
      correct: "To'g'ri javoblar",
      level: 'Daraja',
      analysis: 'Bilimlar tahlili',
      strengths: 'Kuchli mavzular',
      weaknesses: "O'zlashtirish kerak",
      cta_title: 'Natijangizni yaxshilamoqchimisiz?',
      cta_desc: 'Metodistimiz bilan individual konsultatsiyaga yoziling.',
      cta_btn: 'Konsultatsiyaga yozilish',
      back: 'Testlarga',
      score_label: 'Natija',
      questions_total: 'Jami savollar',
      levels: {
        excellent: 'A\'lo',
        good: 'Yaxshi',
        satisfactory: 'Qoniqarli',
        needs_work: "Ko'proq ishlash kerak",
      },
    },
    common: {
      loading: 'Yuklanmoqda...',
      error: 'Xatolik yuz berdi',
      retry: 'Qayta urinish',
      back: 'Ortga',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      delete: "O'chirish",
      confirm: 'Tasdiqlash',
    },
  },
}

type Lang = 'ru' | 'uz'

const I18nContext = createContext<{
  t: (path: string, params?: Record<string, any>) => string
  lang: Lang
  setLang: (lang: Lang) => void
}>({
  t: (p) => p,
  lang: 'ru',
  setLang: () => {},
})

export const I18nProvider = ({
  children,
  initialLang = 'ru',
}: {
  children: React.ReactNode
  initialLang?: string
}) => {
  const [lang, setLangState] = useState<Lang>((initialLang as Lang) || 'ru')

  // Persist language preference in localStorage
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('student_lang') : null
    if (saved === 'ru' || saved === 'uz') {
      setLangState(saved)
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('student_lang', l)
    }
  }

  const t = (path: string, params?: Record<string, any>): string => {
    const keys = path.split('.')
    let val: any = translations[lang] ?? translations['ru']
    for (const key of keys) {
      val = val?.[key]
    }
    if (typeof val !== 'string') return path
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val.replace(`{${k}}`, String(v))
      })
    }
    return val
  }

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
