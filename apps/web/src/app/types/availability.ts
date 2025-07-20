import { z } from 'zod'

export const timeIntervalSchema = z
  .object({
    start: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .describe('Start time in HH:mm format'),
    end: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .describe('End time in HH:mm format'),
  })
  .strict()
  .refine(({ start, end }) => start < end, {
    message: 'Start time must be before end time',
    path: ['end'],
  })
export type TimeInterval = z.infer<typeof timeIntervalSchema>

export const weeklyScheduleSchema = z
  .object({
    sunday: z.array(timeIntervalSchema),
    monday: z.array(timeIntervalSchema),
    tuesday: z.array(timeIntervalSchema),
    wednesday: z.array(timeIntervalSchema),
    thursday: z.array(timeIntervalSchema),
    friday: z.array(timeIntervalSchema),
    saturday: z.array(timeIntervalSchema),
  })
  .strict()
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>

export const dateOverrideSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Date in YYYY-MM-DD format'),
    intervals: z.array(timeIntervalSchema),
  })
  .strict()
export type DateOverride = z.infer<typeof dateOverrideSchema>

export const availabilitySchema = z
  .object({
    id: z.string(),
    weeklySchedule: weeklyScheduleSchema,
    dateOverrides: z.array(dateOverrideSchema),
  })
  .strict()
export type Availability = z.infer<typeof availabilitySchema>
