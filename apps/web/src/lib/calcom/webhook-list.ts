import 'server-only'

import { calcomRequest } from '~/lib/calcom/client'
import { CalcomWebhookListResponseSchema, type CalcomWebhookResource } from '~/lib/calcom/schemas'
import { ExternalApiError } from '~/lib/errors'

const CALCOM_WEBHOOK_PAGE_SIZE = 250
const MAX_CALCOM_WEBHOOK_PAGES = 100

/**
 * Cal.com's user-webhook list uses offset pagination and does not return a
 * pagination envelope. Keep requesting full pages so provisioning can find and
 * remove Discuno duplicates beyond the first 250 records.
 */
export const listAllCalcomWebhooks = async (
  accessToken: string
): Promise<CalcomWebhookResource[]> => {
  const webhooks: CalcomWebhookResource[] = []

  for (let page = 0; page < MAX_CALCOM_WEBHOOK_PAGES; page += 1) {
    const query = new URLSearchParams({
      take: CALCOM_WEBHOOK_PAGE_SIZE.toString(),
      skip: (page * CALCOM_WEBHOOK_PAGE_SIZE).toString(),
    })
    const response = await calcomRequest<unknown>(`/webhooks?${query}`, { accessToken })
    const currentPage = CalcomWebhookListResponseSchema.parse(response).data
    webhooks.push(...currentPage)

    if (currentPage.length < CALCOM_WEBHOOK_PAGE_SIZE) return webhooks
  }

  // Never mutate a partial view: doing so could leave a duplicate webhook
  // active or patch/create the wrong record on an unusually large account.
  throw new ExternalApiError('Cal.com webhook pagination exceeded its safe page limit')
}
