export interface CalApiConfig {
  apiUrl: string
  accessToken?: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
  refreshUrl?: string
}

export interface EventType {
  id: number
  title: string
  description?: string
  length: number
  slug: string
  locations?: Location[]
  bookingFields?: BookingField[]
  schedulingType?: 'ROUND_ROBIN' | 'COLLECTIVE' | 'MANAGED'
  schedule?: Schedule
  availability?: Availability[]
  price?: number
  currency?: string
  requiresConfirmation?: boolean
  disableGuests?: boolean
  minimumBookingNotice?: number
  beforeEventBuffer?: number
  afterEventBuffer?: number
  seatsPerTimeSlot?: number
  seatsShowAttendees?: boolean
  seatsShowAvailabilityCount?: boolean
  users?: User[]
  team?: Team
  hosts?: User[]
  bookingLimits?: BookingLimits
  durationLimits?: DurationLimits
  recurringEvent?: RecurringEvent
  metadata?: Record<string, unknown>
  successRedirectUrl?: string
  assignAllTeamMembers?: boolean
  useEventTypeDestinationCalendarEmail?: boolean
  position?: number
  eventName?: string
  timeZone?: string
  owner?: User
  ownerId?: number
  userId?: number
  teamId?: number
  parentId?: number
  hashedLink?: HashedLink
  workflows?: Workflow[]
  webhooks?: Webhook[]
  destinationCalendar?: DestinationCalendar
  hidden?: boolean
  customInputs?: EventTypeCustomInput[]
  children?: EventType[]
  entryPoints?: EntryPoint[]
  eventTypeColor?: EventTypeColor
  slotInterval?: number
}

export interface Location {
  type: string
  address?: string
  link?: string
  hostPhoneNumber?: string
  credentialId?: number
  teamName?: string
  displayLocationPublicly?: boolean
}

export interface BookingField {
  id?: string
  name: string
  type:
    | 'name'
    | 'email'
    | 'phone'
    | 'address'
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'boolean'
  label?: string
  required: boolean
  placeholder?: string
  defaultValue?: string | number | boolean
  options?: string[]
  defaultLabel?: string
  defaultPlaceholder?: string
  variant?: 'check' | 'radio'
  variantsConfig?: {
    variants: Record<
      string,
      {
        fields: BookingField[]
      }
    >
  }
  editable?: 'user' | 'system' | 'user-readonly'
  sources?: {
    id: string
    type: string
    label: string
    required?: boolean
    fieldRequired?: boolean
  }[]
  views?: {
    id: string
    label: string
    description?: string
  }[]
  systemField?: 'location' | 'notes' | 'guests' | 'rescheduleReason'
  disableOnPrefill?: boolean
  hidden?: boolean
}

export interface Schedule {
  id: number
  name: string
  timeZone: string
  availability: Availability[]
  isDefault?: boolean
  userId?: number
}

export interface Availability {
  id?: number
  eventTypeId?: number
  days: number[]
  startTime: Date | string
  endTime: Date | string
  date?: Date | string
  scheduleId?: number
  userId?: number
}

export interface User {
  id: number
  username?: string
  name?: string
  email: string
  bio?: string
  avatar?: string
  timeZone: string
  weekStart?: string
  appTheme?: string
  theme?: string
  defaultScheduleId?: number
  locale?: string
  timeFormat?: number
  hideBranding?: boolean
  allowDynamicBooking?: boolean
  brandColor?: string
  darkBrandColor?: string
  verified?: boolean
  role?: 'USER' | 'ADMIN'
  teams?: TeamMembership[]
  plan?: 'FREE' | 'STARTER' | 'ESSENTIALS' | 'PROFESSIONAL' | 'TEAM' | 'ENTERPRISE'
  bufferTime?: number
  startTime?: number
  endTime?: number
  schedules?: Schedule[]
  defaultEventTypes?: EventType[]
  eventTypes?: EventType[]
  credentials?: Credential[]
  selectedCalendars?: SelectedCalendar[]
  destinationCalendar?: DestinationCalendar
  createdDate?: Date
  trialEndsAt?: Date
  defaultBookingStatus?: 'ACCEPTED' | 'PENDING'
  metadata?: Record<string, unknown>
  organizationId?: number
}

export interface Team {
  id: number
  name: string
  slug?: string
  logo?: string
  appLogo?: string
  appIconLogo?: string
  bio?: string
  hideBranding?: boolean
  members?: TeamMembership[]
  eventTypes?: EventType[]
  brandColor?: string
  darkBrandColor?: string
  theme?: string
  isPrivate?: boolean
  hideBookATeamMember?: boolean
  metadata?: Record<string, unknown>
  parent?: Team
  children?: Team[]
  createdAt?: Date
  timeFormat?: number
  timeZone?: string
  weekStart?: string
}

export interface TeamMembership {
  id: number
  userId: number
  teamId: number
  accepted: boolean
  role: 'MEMBER' | 'ADMIN' | 'OWNER'
  user: User
  team: Team
  disableImpersonation?: boolean
}

export interface BookingLimits {
  PER_DAY?: number
  PER_WEEK?: number
  PER_MONTH?: number
  PER_YEAR?: number
}

export interface DurationLimits {
  PER_DAY?: number
  PER_WEEK?: number
  PER_MONTH?: number
  PER_YEAR?: number
}

export interface RecurringEvent {
  freq: number
  count: number
  interval: number
}

export interface HashedLink {
  link: string
  eventTypeId: number
}

export interface Workflow {
  id: number
  name: string
  userId?: number
  teamId?: number
  trigger: string
  time?: number
  timeUnit?: string
  steps: WorkflowStep[]
}

export interface WorkflowStep {
  id: number
  stepNumber: number
  action: string
  workflowId: number
  sendTo?: string
  reminderBody?: string
  emailSubject?: string
  template?: string
}

export interface Webhook {
  id: string
  subscriberUrl: string
  payloadTemplate?: string
  active: boolean
  eventTriggers: string[]
  secret?: string
}

export interface DestinationCalendar {
  id: number
  integration: string
  externalId: string
  userId?: number
  eventTypeId?: number
  credentialId?: number
}

export interface EventTypeCustomInput {
  id: number
  eventTypeId: number
  label: string
  type: 'TEXT' | 'TEXTLONG' | 'NUMBER' | 'BOOL' | 'RADIO' | 'PHONE'
  required: boolean
  placeholder?: string
  options?: string
}

export interface EntryPoint {
  id: string
  label: string
}

export interface EventTypeColor {
  id: string
  backgroundColor: string
  lightText: boolean
}

export interface Credential {
  id: number
  type: string
  key: Record<string, unknown>
  userId?: number
  teamId?: number
  appId?: string
  invalid?: boolean
  user?: User
  app?: App
}

export interface SelectedCalendar {
  userId: number
  integration: string
  externalId: string
  credentialId?: number
}

export interface App {
  slug: string
  name: string
  description?: string
  type: string
  logo?: string
  publisher?: string
  url?: string
  variant?: string
  categories?: string[]
  credentials?: Credential[]
}

export interface Booking {
  id: number
  uid: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: Attendee[]
  user?: User
  eventType?: EventType
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  rescheduled?: boolean
  paid?: boolean
  payment?: Payment[]
  responses?: Record<string, unknown>
  location?: string
  customInputs?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  cancellationReason?: string
  rejectionReason?: string
  dynamicEventSlugRef?: string
  dynamicGroupSlugRef?: string
  rescheduledFromUid?: string
  recurringEventId?: string
  fromReschedule?: string
  hashedLink?: HashedLink
  smsReminderNumber?: string
  scheduledJobs?: string[]
  metadata?: Record<string, unknown>
  isRecurring?: boolean
  recurringCount?: number
  destinationCalendar?: DestinationCalendar[]
  references?: Reference[]
}

export interface Attendee {
  id: number
  email: string
  name: string
  timeZone: string
  locale?: string
  booking?: Booking
  bookingId?: number
}

export interface Payment {
  id: number
  uid: string
  appId?: string
  bookingId: number
  amount: number
  fee: number
  currency: string
  success: boolean
  refunded: boolean
  data: Record<string, unknown>
  externalId: string
  paymentOption?: string
}

export interface Reference {
  id: number
  type: string
  uid: string
  meetingId?: string
  meetingPassword?: string
  meetingUrl?: string
  booking?: Booking
  bookingId?: number
  externalCalendarId?: string
  deleted?: boolean
  credentialId?: number
}

export interface BookingRequest {
  eventTypeId?: number
  eventTypeSlug?: string
  start: string
  end: string
  responses: Record<string, unknown>
  timeZone: string
  language: string
  title?: string
  user?: string
  description?: string
  status?: 'PENDING' | 'ACCEPTED'
  location?: string
  customInputs?: Record<string, unknown>
  metadata?: Record<string, unknown>
  hasHashedBookingLink?: boolean
  hashedLink?: string
  recurringCount?: number
  allRemainingRecurringInstances?: boolean
}

export interface AvailabilitySlot {
  time: string
  attendees?: number
  bookingUid?: string
  users?: User[]
}

export interface CalendarEvent {
  type: string
  title: string
  startTime: string
  endTime: string
  organizer: {
    email: string
    name: string
    timeZone: string
  }
  attendees: {
    name: string
    email: string
    timeZone: string
  }[]
  location?: string
  description?: string
  additionalNotes?: string
  uid?: string
  videoCallData?: {
    type: string
    id: string
    password?: string
    url: string
  }
  conferenceData?: {
    createRequest?: boolean
  }
  additionInformation?: Record<string, unknown>
  requiresConfirmation?: boolean
  destinationCalendar?: DestinationCalendar[]
  cancellationReason?: string
  rejectionReason?: string
}

export interface AtomsGlobalConfig {
  webAppUrl?: string
  apiUrl?: string
}
