import { Inngest } from 'inngest'

/**
 * Inngest client for Discuno
 * Used to define and trigger background jobs
 */
export const inngest = new Inngest({
  id: 'discuno',
  name: 'Discuno',
})
