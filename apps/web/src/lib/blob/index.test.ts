import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ del: vi.fn(), get: vi.fn(), put: vi.fn() }))

vi.mock('~/env', () => ({ env: { BLOB_READ_WRITE_TOKEN: 'blob-test' } }))
vi.mock('@vercel/blob', () => ({ del: mocks.del, get: mocks.get, put: mocks.put }))

import {
  downloadAndUploadProfileImage,
  extractPathnameFromBlobUrl,
  isAllowedProviderAvatarUrl,
  isOwnedProfileImagePath,
  validateProfileImageBlob,
} from '~/lib/blob'
import { MAX_PROFILE_IMAGE_INPUT_BYTES } from '~/lib/blob/utils'

describe('profile image ownership', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const pathname = `profile-images/${userId}/avatar.webp`
  const url = `https://store.public.blob.vercel-storage.com/${pathname}`

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.put.mockResolvedValue({
      url: 'https://store.public.blob.vercel-storage.com/profile-images/imported.webp',
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('accepts only HTTPS Vercel Blob URLs', () => {
    expect(
      extractPathnameFromBlobUrl(
        `https://store.public.blob.vercel-storage.com/profile-images/${userId}/avatar.webp`
      )
    ).toBe(`profile-images/${userId}/avatar.webp`)
    expect(extractPathnameFromBlobUrl('https://example.com/profile-images/avatar.webp')).toBeNull()
    expect(
      extractPathnameFromBlobUrl(
        `http://store.public.blob.vercel-storage.com/profile-images/${userId}/avatar.webp`
      )
    ).toBeNull()
    expect(
      extractPathnameFromBlobUrl(
        `https://store.public.blob.vercel-storage.com.evil.test/profile-images/${userId}/avatar.webp`
      )
    ).toBeNull()
    expect(
      extractPathnameFromBlobUrl(
        `https://evil.test/blob.vercel-storage.com/profile-images/${userId}/avatar.webp`
      )
    ).toBeNull()
    expect(
      extractPathnameFromBlobUrl(
        `https://attacker@store.public.blob.vercel-storage.com/profile-images/${userId}/avatar.webp`
      )
    ).toBeNull()
  })

  it('prevents cross-user and traversal paths', () => {
    expect(isOwnedProfileImagePath(`profile-images/${userId}/avatar.webp`, userId)).toBe(true)
    expect(isOwnedProfileImagePath('profile-images/another-user/avatar.webp', userId)).toBe(false)
    expect(isOwnedProfileImagePath(`profile-images/${userId}/../other/avatar.webp`, userId)).toBe(
      false
    )
  })

  it('verifies stored bytes rather than trusting browser metadata', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 4, background: '#2563eb' },
    })
      .webp()
      .toBuffer()
    const response = new Response(image)
    mocks.get.mockResolvedValue({
      statusCode: 200,
      stream: response.body,
      headers: response.headers,
      blob: { pathname, size: image.length, contentType: 'image/webp' },
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(validateProfileImageBlob(url, userId)).resolves.toBeUndefined()
    expect(mocks.get).toHaveBeenCalledWith(
      pathname,
      expect.objectContaining({
        access: 'public',
        token: 'blob-test',
        useCache: false,
        abortSignal: expect.any(AbortSignal),
      })
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects bytes that are not a decodable WebP image', async () => {
    const invalidImage = Buffer.from('not-an-image')
    const response = new Response(invalidImage)
    mocks.get.mockResolvedValue({
      statusCode: 200,
      stream: response.body,
      headers: response.headers,
      blob: {
        pathname,
        size: invalidImage.length,
        contentType: 'image/webp',
      },
    })

    await expect(validateProfileImageBlob(url, userId)).rejects.toThrow()
  })
})

describe('OAuth provider avatar import', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const googleAvatarUrl = 'https://lh3.googleusercontent.com/a/example=s96-c'
  const uploadedUrl = 'https://store.public.blob.vercel-storage.com/profile-images/imported.webp'

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.put.mockResolvedValue({ url: uploadedUrl })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('allows only credential-free HTTPS URLs on the provider avatar host', () => {
    expect(isAllowedProviderAvatarUrl(googleAvatarUrl)).toBe(true)
    expect(isAllowedProviderAvatarUrl('http://lh3.googleusercontent.com/a/example')).toBe(false)
    expect(isAllowedProviderAvatarUrl('https://user@lh3.googleusercontent.com/a/example')).toBe(
      false
    )
    expect(isAllowedProviderAvatarUrl('https://lh3.googleusercontent.com:444/a/example')).toBe(
      false
    )
    expect(isAllowedProviderAvatarUrl('https://lh3.googleusercontent.com.evil.test/avatar')).toBe(
      false
    )
    expect(isAllowedProviderAvatarUrl('https://127.0.0.1/avatar')).toBe(false)
  })

  it('imports a valid Google avatar with timeout and redirects disabled', async () => {
    const image = await sharp({
      create: { width: 24, height: 24, channels: 4, background: '#2563eb' },
    })
      .png()
      .toBuffer()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(image, { headers: { 'content-type': 'image/png' }, status: 200 })
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(downloadAndUploadProfileImage(googleAvatarUrl, userId)).resolves.toBe(uploadedUrl)

    expect(fetchMock).toHaveBeenCalledWith(
      googleAvatarUrl,
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'manual',
        referrerPolicy: 'no-referrer',
        signal: expect.any(AbortSignal),
      })
    )
    expect(mocks.put).toHaveBeenCalledOnce()
  })

  it('supports Microsoft inline JPEG avatars without making a network request', async () => {
    const image = await sharp({
      create: { width: 24, height: 24, channels: 3, background: '#2563eb' },
    })
      .jpeg()
      .toBuffer()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const inlineAvatar = `data:image/jpeg;base64, ${image.toString('base64')}`
    await expect(downloadAndUploadProfileImage(inlineAvatar, userId)).resolves.toBe(uploadedUrl)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.put).toHaveBeenCalledOnce()
  })

  it('rejects untrusted sources and provider redirects without following them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: { location: 'http://127.0.0.1/private' },
        status: 302,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const untrustedUrl = 'https://attacker.example/avatar.png'
    await expect(downloadAndUploadProfileImage(untrustedUrl, userId)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()

    await expect(downloadAndUploadProfileImage(googleAvatarUrl, userId)).resolves.toBe(
      googleAvatarUrl
    )
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(mocks.put).not.toHaveBeenCalled()
  })

  it('stops a chunked response as soon as it exceeds the byte cap', async () => {
    const oversizedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_PROFILE_IMAGE_INPUT_BYTES))
        controller.enqueue(new Uint8Array(1))
        controller.close()
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(oversizedBody, {
          headers: { 'content-type': 'image/jpeg' },
          status: 200,
        })
      )
    )

    await expect(downloadAndUploadProfileImage(googleAvatarUrl, userId)).resolves.toBe(
      googleAvatarUrl
    )
    expect(mocks.put).not.toHaveBeenCalled()
  })

  it('rejects bytes that claim an image content type but cannot be decoded', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('not-an-image', { headers: { 'content-type': 'image/jpeg' } })
        )
    )

    await expect(downloadAndUploadProfileImage(googleAvatarUrl, userId)).resolves.toBe(
      googleAvatarUrl
    )
    expect(mocks.put).not.toHaveBeenCalled()
  })
})
