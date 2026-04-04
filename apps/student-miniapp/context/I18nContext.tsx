'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

const translations = {
  ru: {
    dashboard: {
      title: 'Личный кабинет',
      greeting: 'Привет, {name}! 👋',
      pts: 'баллов',
      stats: {
        completed: 'Пройдено',
        in_progress: 'В процессе',
        available: 'Доступно'
      },
      featured_title: 'Актуальный тест',
      all: 'Все',
      history_title: 'История активностей'
    },
    tests: {
      title: 'Доступные тесты',
      subtitle: 'Выберите тест, чтобы начать',
      search: 'Поиск теста...',
      start: 'Начать',
      questions: 'вопросов',
      minutes: 'мин'
    },
    shop: {
        title: 'Магазин наград',
        subtitle: 'Обменяйте баллы на призы',
        balance: 'баллов',
        loading: 'Загрузка товаров...',
        out_of_stock: 'Нет в наличии',
        redeem: 'Забрать',
        confirm: 'Обменять {points} баллов на "{title}"?',
        success: 'Поздравляем! Награда ваша.',
        no_items: 'Пока здесь ничего нет'
    },
    profile: {
        title: 'Профиль',
        info: 'Информация',
        name: 'Личные данные',
        phone: 'Телефон',
        grade: 'Класс',
        direction: 'Направление',
        lang: 'Язык кабинета',
        settings: 'Настройки',
        app_settings: 'Настройки приложения',
        logout: 'Выйти из аккаунта'
    },
    results: {
        loading: 'Загрузка результата...',
        not_found: 'Результат не найден',
        title: 'Результаты теста',
        date: 'от',
        correct: 'Верно',
        level: 'Уровень',
        analysis: 'Анализ знаний',
        strengths: 'Сильные темы',
        weaknesses: 'Стоит подтянуть',
        cta_title: 'Хотите подтянуть результат?',
        cta_desc: 'Запишитесь на консультацию с нашим методистом.',
        cta_btn: 'Записаться на консультацию'
    }
  },
  uz: {
    dashboard: {
      title: 'Shaxsiy kabinet',
      greeting: 'Salom, {name}! 👋',
      pts: 'ball',
      stats: {
        completed: 'Tugallangan',
        in_progress: 'Jarayonda',
        available: 'Mavjud'
      },
      featured_title: 'Dolzarb test',
      all: 'Hammasi',
      history_title: 'Faolliklar tarixi'
    },
    tests: {
      title: 'Mavjud testlar',
      subtitle: 'Boshlash uchun testni tanlang',
      search: 'Test qidirish...',
      start: 'Boshlash',
      questions: 'savol',
      minutes: 'daq'
    },
    shop: {
        title: 'Sovg\'alar do\'koni',
        subtitle: 'Ballarni sovg\'alarga almashtiring',
        balance: 'ball',
        loading: 'Mahsulotlar yuklanmoqda...',
        out_of_stock: 'Mavjud emas',
        redeem: 'Olish',
        confirm: '{points} ballni "{title}" ga almashtirasizmi?',
        success: 'Tabriklaymiz! Sovg\'a sizniki.',
        no_items: 'Hozircha hech narsa yo\'q'
    },
    profile: {
        title: 'Profil',
        info: 'Ma\'lumot',
        name: 'Shaxsiy ma\'lumotlar',
        phone: 'Telefon',
        grade: 'Sinf',
        direction: 'Yo\'nalish',
        lang: 'Kabinet tili',
        settings: 'Sozlamalar',
        app_settings: 'Ilova sozlamalari',
        logout: 'Hisobdan chiqish'
    },
    results: {
        loading: 'Natija yuklanmoqda...',
        not_found: 'Natija topilmadi',
        title: 'Test natijalari',
        date: 'sana:',
        correct: 'To\'g\'ri',
        level: 'Daraja',
        analysis: 'Bilimlar tahlili',
        strengths: 'Kuchli mavzular',
        weaknesses: 'O\'zlashtirish kerak',
        cta_title: 'Natijani yaxshilamoqchimisiz?',
        cta_desc: 'Metodistimiz bilan maslahatlashuvga yoziling.',
        cta_btn: 'Maslahatga yozilish'
    }
  }
}

const I18nContext = createContext<{
  t: (path: string, params?: Record<string, any>) => string
  lang: string
  setLang: (lang: string) => void
}>({
  t: () => '',
  lang: 'ru',
  setLang: () => {}
})

export const I18nProvider = ({ children, initialLang = 'ru' }: { children: React.ReactNode, initialLang?: string }) => {
  const [lang, setLang] = useState(initialLang)

  const t = (path: string, params?: Record<string, any>) => {
    const keys = path.split('.')
    let translation: any = translations[lang as 'ru' | 'uz'] || translations['ru']
    
    for (const key of keys) {
      translation = translation?.[key]
    }

    if (typeof translation !== 'string') return path

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        translation = translation.replace(`{${key}}`, value)
      })
    }

    return translation
  }

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
