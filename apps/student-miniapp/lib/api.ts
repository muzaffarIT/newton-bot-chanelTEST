import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

let _token: string | null = null

export function setToken(token: string) {
    _token = token
    if (typeof window !== 'undefined') {
        localStorage.setItem('student_token', token)
    }
}

export function getToken(): string | null {
    if (_token) return _token
    if (typeof window !== 'undefined') {
        _token = localStorage.getItem('student_token')
    }
    return _token
}

export function clearToken() {
    _token = null
    if (typeof window !== 'undefined') {
        localStorage.removeItem('student_token')
    }
}

export const api = axios.create({ baseURL: BACKEND_URL })

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function authWithInitData(initData: string) {
    // POST to student auth endpoint (to be implemented on backend)
    const { data } = await api.post('/api/auth/student-miniapp', { initData })
    setToken(data.accessToken)
    return data
}

// ─── Student Profile ─────────────────────────────────────────────────────────
export async function fetchProfile() {
    const { data } = await api.get('/api/student/profile')
    return data
}

// ─── Tests ────────────────────────────────────────────────────────────────────
export async function fetchAvailableTests() {
    const { data } = await api.get('/api/student/tests')
    return data
}

export async function fetchActiveSession() {
    const { data } = await api.get('/api/student/sessions/active')
    return data
}

export async function startSession(testId: string) {
    const { data } = await api.post(`/api/student/sessions/start/${testId}`)
    return data
}

export async function saveAnswer(sessionId: string, questionId: string, optionId: string) {
    const { data } = await api.post('/api/student/sessions/answer', {
        sessionId,
        questionId,
        optionId
    })
    return data
}

export async function submitSession(sessionId: string) {
    const { data } = await api.post(`/api/student/sessions/submit/${sessionId}`)
    return data
}

// ─── Results ──────────────────────────────────────────────────────────────────
export async function fetchHistory() {
    const { data } = await api.get('/api/student/results')
    return data
}

export async function fetchResultDetail(id: string) {
    const { data } = await api.get(`/api/student/results/${id}`)
    return data
}

// ─── Support / Leads ──────────────────────────────────────────────────────────
export async function requestConsultation(courseType: 'ONLINE' | 'OFFLINE') {
    const { data } = await api.post('/api/student/leads/consultation', { courseType })
    return data
}

// ─── Shop / Rewards ───────────────────────────────────────────────────────────
export async function fetchRewards() {
    const { data } = await api.get('/api/student/store/rewards')
    return data
}

export async function redeemReward(rewardId: string) {
    const { data } = await api.post(`/api/student/store/redeem/${rewardId}`, {})
    return data
}

// ─── Profile Update ───────────────────────────────────────────────────────────
export async function updateProfile(fields: {
    first_name?: string
    last_name?: string
    phone?: string
    grade?: string
}) {
    const { data } = await api.patch('/api/student/profile', fields)
    return data
}

export async function updateLanguage(language_code: string) {
    const { data } = await api.patch('/api/student/profile/language', { language_code })
    return data
}
