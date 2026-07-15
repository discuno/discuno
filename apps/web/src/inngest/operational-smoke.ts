import { inngest } from './client'

export const INNGEST_OPERATIONAL_SMOKE_EVENT = 'operations/inngest.smoke' as const

export type InngestOperationalSmokeAcknowledgement = {
  ok: true
  environment: string
  commitSha: string | null
}

/**
 * Return only non-sensitive deployment metadata so an Inngest Cloud run can
 * prove that it reached the intended Vercel deployment.
 */
export const buildInngestOperationalSmokeAcknowledgement =
  (): InngestOperationalSmokeAcknowledgement => ({
    ok: true,
    environment: process.env.VERCEL_ENV ?? 'local',
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
  })

/**
 * Side-effect-free Cloud-to-deployment probe. The dedicated event is sent only
 * during operational checks and never reads or writes application data.
 */
export const verifyInngestInvocation = inngest.createFunction(
  {
    id: 'verify-inngest-invocation',
    name: 'Verify Inngest Invocation',
    description: 'Side-effect-free operational check for Inngest Cloud invocation',
    triggers: { event: INNGEST_OPERATIONAL_SMOKE_EVENT },
    retries: 0,
  },
  async ({ step, logger }) => {
    const acknowledgement = await step.run(
      'acknowledge-inngest-invocation',
      buildInngestOperationalSmokeAcknowledgement
    )

    logger.info('Inngest operational smoke acknowledged', acknowledgement)
    return acknowledgement
  }
)
