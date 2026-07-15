import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  getUserId: vi.fn(),
  handleUpload: vi.fn(),
  validateProfileImageBlob: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: class extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    }
  },
}))

vi.mock('~/env', () => ({ env: { BLOB_READ_WRITE_TOKEN: 'blob-test-token' } }))
vi.mock('@vercel/blob', () => ({ del: mocks.del }))
vi.mock('@vercel/blob/client', () => ({ handleUpload: mocks.handleUpload }))
vi.mock('~/lib/blob', () => ({
  validateProfileImageBlob: mocks.validateProfileImageBlob,
}))
vi.mock('~/server/queries/profiles', () => ({ getUserId: mocks.getUserId }))

import { POST } from '~/app/api/avatar/upload/route'

const userId = '11111111-1111-4111-8111-111111111111'
const validBody = {
  type: 'blob.generate-client-token',
  payload: {
    pathname: `profile-images/${userId}/avatar.webp`,
    multipart: false,
    clientPayload: null,
  },
}

const createJsonRequest = (body: string, headers: HeadersInit = {}) =>
  new Request('https://discuno.test/api/avatar/upload', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  })

describe('avatar upload request boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUserId.mockResolvedValue(userId)
    mocks.handleUpload.mockResolvedValue({ type: 'blob.generate-client-token', clientToken: 'ok' })
    mocks.validateProfileImageBlob.mockResolvedValue(undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a generic 400 for malformed JSON before calling the Blob SDK', async () => {
    const response = await POST(createJsonRequest('{'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid avatar upload request' })
    expect(mocks.handleUpload).not.toHaveBeenCalled()
  })

  it('rejects malformed event shapes and oversized requests', async () => {
    const malformed = await POST(createJsonRequest(JSON.stringify({ payload: {} })))
    const oversized = await POST(
      createJsonRequest(JSON.stringify(validBody), { 'content-length': String(64 * 1024 + 1) })
    )

    expect(malformed.status).toBe(400)
    expect(oversized.status).toBe(400)
    expect(mocks.handleUpload).not.toHaveBeenCalled()
  })

  it('stops a chunked request body that exceeds the hard limit before parsing it', async () => {
    const firstChunk = new Uint8Array(64 * 1024)
    const finalByte = new Uint8Array([1])
    let chunksRead = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksRead += 1
        if (chunksRead === 1) controller.enqueue(firstChunk)
        else controller.enqueue(finalByte)
      },
    })
    const request = new Request('https://discuno.test/api/avatar/upload', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    const response = await POST(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid avatar upload request' })
    expect(chunksRead).toBe(2)
    expect(mocks.handleUpload).not.toHaveBeenCalled()
  })

  it('never reflects raw SDK errors into the response or operational logs', async () => {
    const privateError = 'sk_live_private user.private@example.com'
    mocks.handleUpload.mockRejectedValue(new Error(privateError))

    const response = await POST(createJsonRequest(JSON.stringify(validBody)))
    const serialized = JSON.stringify([
      await response.json(),
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ])

    expect(response.status).toBe(400)
    expect(serialized).not.toContain(privateError)
    expect(serialized).not.toContain('user.private@example.com')
    expect(serialized).toContain('Invalid avatar upload request')
  })

  it('validates completed bytes and deletes an invalid uploaded blob without leaking why', async () => {
    const blobUrl =
      'https://store.public.blob.vercel-storage.com/profile-images/invalid-avatar.webp'
    const privateError = 'invalid bytes from user.private@example.com'
    mocks.validateProfileImageBlob.mockRejectedValue(new Error(privateError))
    mocks.handleUpload.mockImplementation(
      async (options: {
        onUploadCompleted: (input: { blob: { url: string }; tokenPayload: string }) => Promise<void>
      }) => {
        await options.onUploadCompleted({
          blob: { url: blobUrl },
          tokenPayload: JSON.stringify({ userId }),
        })
        return { type: 'blob.upload-completed', response: 'ok' }
      }
    )

    const completionBody = {
      type: 'blob.upload-completed',
      payload: { blob: { url: blobUrl }, tokenPayload: JSON.stringify({ userId }) },
    }
    const response = await POST(createJsonRequest(JSON.stringify(completionBody)))
    const logs = JSON.stringify([
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ])

    expect(response.status).toBe(200)
    expect(mocks.validateProfileImageBlob).toHaveBeenCalledWith(blobUrl, userId)
    expect(mocks.del).toHaveBeenCalledWith(blobUrl, { token: 'blob-test-token' })
    expect(logs).not.toContain(privateError)
    expect(logs).not.toContain('user.private@example.com')
  })

  it('passes a valid request to the Blob SDK', async () => {
    const response = await POST(createJsonRequest(JSON.stringify(validBody)))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      type: 'blob.generate-client-token',
      clientToken: 'ok',
    })
    expect(mocks.handleUpload).toHaveBeenCalledWith(
      expect.objectContaining({ body: validBody, token: 'blob-test-token' })
    )
  })
})
