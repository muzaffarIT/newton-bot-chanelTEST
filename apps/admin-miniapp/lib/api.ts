import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Stores the JWT token obtained from the backend after Telegram auth validation
let _token: string | null = null

export function setToken(token: string) {
    _token = token
    if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', token)
    }
}

export function getToken(): string | null {
    if (_token) return _token
    if (typeof window !== 'undefined') {
        _token = localStorage.getItem('admin_token')
    }
    return _token
}

export function clearToken() {
    _token = null
    if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
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
    const { data } = await api.post('/api/auth/telegram-miniapp', { initData })
    setToken(data.accessToken)
    return data
}

export async function authWithCredentials(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })
    setToken(data.accessToken)
    return data
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function fetchStats() {
    const { data } = await api.get('/api/admin/dashboard/stats')
    return data
}

export async function fetchSessions(page = 1, status?: string) {
    const { data } = await api.get('/api/admin/dashboard/sessions', {
        params: { page, limit: 20, status },
    })
    return data
}

export async function fetchResults(page = 1) {
    const { data } = await api.get('/api/admin/dashboard/results', { params: { page } })
    return data
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function fetchLeads(page = 1, status?: string) {
    const { data } = await api.get('/api/admin/leads', { params: { page, limit: 25, status } })
    return data
}

export async function fetchLead(id: string) {
    const { data } = await api.get(`/api/admin/leads/${id}`)
    return data
}

export async function updateLeadStatus(id: string, status: string, comment?: string) {
    const { data } = await api.patch(`/api/admin/leads/${id}/status`, { status, comment })
    return data
}

// ─── Tests ────────────────────────────────────────────────────────────────────
export async function fetchTests(page = 1) {
    const { data } = await api.get('/api/admin/tests', { params: { page } })
    return data
}

export async function fetchTest(id: string) {
    const { data } = await api.get(`/api/admin/tests/${id}`)
    return data
}

export async function updateQuestion(testId: string, questionId: string, payload: any) {
    const { data } = await api.put(`/api/admin/tests/questions/${questionId}`, payload)
    return data
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
export async function fetchScheduledPosts(page = 1) {
    const { data } = await api.get('/api/admin/scheduler', { params: { page } })
    return data
}

export async function cancelScheduledPost(id: string) {
    const { data } = await api.delete(`/api/admin/scheduler/${id}`)
    return data
}

export async function schedulePost(channelId: string, testId: string, publishAt?: string, publishNow = false) {
    const { data } = await api.post('/api/admin/scheduler/schedule', {
        channelId,
        testId,
        publishAt,
        publishNow,
    })
    return data
}


// ─── Channels ─────────────────────────────────────────────────────────────────
export async function fetchChannels() {
    const { data } = await api.get('/api/admin/channels')
    return data
}

// ─── Topics ───────────────────────────────────────────────────────────────────
export async function fetchTopics() {
    const { data } = await api.get('/api/admin/topics')
    return data
}
