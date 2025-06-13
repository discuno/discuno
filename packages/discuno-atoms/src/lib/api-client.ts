import type {
  App,
  AvailabilitySlot,
  Booking,
  BookingRequest,
  CalApiConfig,
  Credential,
  EventType,
  Schedule,
  Team,
  User,
} from '../types'

export class CalApiClient {
  private config: CalApiConfig
  private baseHeaders: Record<string, string>

  constructor(config: CalApiConfig) {
    this.config = config
    this.baseHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (config.accessToken) {
      this.baseHeaders.Authorization = `Bearer ${config.accessToken}`
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T; status: string }> {
    const url = `${this.config.apiUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.baseHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string }
        message?: string
      }

      // Handle specific Cal.com API error format
      if (errorData.error?.code === 'TokenExpiredException') {
        throw new Error(`TokenExpiredException: ${errorData.error.message ?? 'Token expired'}`)
      }

      throw new Error(
        `API Error ${response.status}: ${errorData.message ?? errorData.error?.message ?? response.statusText}`
      )
    }

    const data = (await response.json()) as { data: T; status: string }
    return data
  }

  // Authentication methods
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await this.request<{ access_token: string; refresh_token: string }>('/oauth/token', {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    })

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
    }
  }

  // User methods
  async getMe(): Promise<User> {
    const response = await this.request<User>('/me')
    return response.data
  }

  async updateMe(data: Partial<User>): Promise<User> {
    const response = await this.request<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.data
  }

  // Event Types methods
  async getEventTypes(): Promise<EventType[]> {
    const response = await this.request<EventType[]>('/event-types')
    return response.data
  }

  async getEventType(id: number): Promise<EventType> {
    const response = await this.request<EventType>(`/event-types/${id}`)
    return response.data
  }

  async getEventTypeBySlug(slug: string): Promise<EventType> {
    const response = await this.request<EventType>(`/event-types/${slug}`)
    return response.data
  }

  async createEventType(data: Partial<EventType>): Promise<EventType> {
    const response = await this.request<EventType>('/event-types', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async updateEventType(id: number, data: Partial<EventType>): Promise<EventType> {
    const response = await this.request<EventType>(`/event-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async deleteEventType(id: number): Promise<void> {
    await this.request(`/event-types/${id}`, {
      method: 'DELETE',
    })
  }

  // Availability methods
  async getAvailability(
    eventTypeId?: number,
    username?: string,
    dateFrom?: string,
    dateTo?: string,
    timeZone?: string
  ): Promise<{
    busy: { start: string; end: string }[]
    timeZone: string
    workingHours: { start: string; end: string; days: number[] }[]
  }> {
    const params = new URLSearchParams()
    if (eventTypeId) params.append('eventTypeId', eventTypeId.toString())
    if (username) params.append('username', username)
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    if (timeZone) params.append('timeZone', timeZone)

    const response = await this.request<{
      busy: { start: string; end: string }[]
      timeZone: string
      workingHours: { start: string; end: string; days: number[] }[]
    }>(`/availability?${params}`)
    return response.data
  }

  async getAvailableSlots(
    eventTypeId: number,
    startTime: string,
    endTime: string,
    timeZone?: string
  ): Promise<AvailabilitySlot[]> {
    const params = new URLSearchParams({
      startTime,
      endTime,
    })
    if (timeZone) params.append('timeZone', timeZone)

    const response = await this.request<AvailabilitySlot[]>(`/event-types/${eventTypeId}/slots?${params}`)
    return response.data
  }

  // Bookings methods
  async createBooking(data: BookingRequest): Promise<Booking> {
    const response = await this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getBookings(
    status?: string,
    take?: number,
    skip?: number
  ): Promise<{ bookings: Booking[]; nextCursor?: string }> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (take) params.append('take', take.toString())
    if (skip !== undefined) params.append('skip', skip.toString())

    const response = await this.request<{ bookings: Booking[]; nextCursor?: string }>(`/bookings?${params}`)
    return response.data
  }

  async getBooking(uid: string): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${uid}`)
    return response.data
  }

  async updateBooking(uid: string, data: Partial<BookingRequest>): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${uid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async cancelBooking(uid: string, reason?: string): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${uid}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
    return response.data
  }

  async rescheduleBooking(uid: string, data: { start: string; end: string; reason?: string }): Promise<Booking> {
    const response = await this.request<Booking>(`/bookings/${uid}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  // Schedules methods
  async getSchedules(): Promise<Schedule[]> {
    const response = await this.request<Schedule[]>('/schedules')
    return response.data
  }

  async getSchedule(id: number): Promise<Schedule> {
    const response = await this.request<Schedule>(`/schedules/${id}`)
    return response.data
  }

  async createSchedule(data: Partial<Schedule>): Promise<Schedule> {
    const response = await this.request<Schedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async updateSchedule(id: number, data: Partial<Schedule>): Promise<Schedule> {
    const response = await this.request<Schedule>(`/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async deleteSchedule(id: number): Promise<void> {
    await this.request(`/schedules/${id}`, {
      method: 'DELETE',
    })
  }

  // Apps and Credentials methods
  async getApps(): Promise<App[]> {
    const response = await this.request<App[]>('/apps')
    return response.data
  }

  async getCredentials(): Promise<Credential[]> {
    const response = await this.request<Credential[]>('/credentials')
    return response.data
  }

  async deleteCredential(id: number): Promise<void> {
    await this.request(`/credentials/${id}`, {
      method: 'DELETE',
    })
  }

  // Teams methods
  async getTeams(): Promise<Team[]> {
    const response = await this.request<Team[]>('/teams')
    return response.data
  }

  async getTeam(id: number): Promise<Team> {
    const response = await this.request<Team>(`/teams/${id}`)
    return response.data
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const response = await this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team> {
    const response = await this.request<Team>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async deleteTeam(id: number): Promise<void> {
    await this.request(`/teams/${id}`, {
      method: 'DELETE',
    })
  }

  // OAuth and Connect methods
  async getOAuthUrl(appSlug: string, redirectUri: string): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>(`/oauth/${appSlug}/authorize`, {
      method: 'POST',
      body: JSON.stringify({ redirectUri }),
    })
    return response.data
  }

  async handleOAuthCallback(appSlug: string, code: string, state?: string): Promise<Credential> {
    const response = await this.request<Credential>(`/oauth/${appSlug}/callback`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    })
    return response.data
  }

  // Webhook methods
  async createWebhook(data: {
    subscriberUrl: string
    eventTriggers: string[]
    payloadTemplate?: string
    secret?: string
  }): Promise<{ id: string; webhook_url: string; created_at: string }> {
    const response = await this.request<{ id: string; webhook_url: string; created_at: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  async getWebhooks(): Promise<{ id: string; subscriberUrl: string; eventTriggers: string[]; active: boolean }[]> {
    const response =
      await this.request<{ id: string; subscriberUrl: string; eventTriggers: string[]; active: boolean }[]>('/webhooks')
    return response.data
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request(`/webhooks/${id}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance for global usage
let apiClientInstance: CalApiClient | null = null

export function createApiClient(config: CalApiConfig): CalApiClient {
  apiClientInstance = new CalApiClient(config)
  return apiClientInstance
}

export function getApiClient(): CalApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call createApiClient first.')
  }
  return apiClientInstance
}

export function isApiClientInitialized(): boolean {
  return apiClientInstance !== null
}
