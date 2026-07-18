import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import {
  createR2Client,
  getOptionalR2ConfigFromEnv,
  getR2ConfigFromEnv,
  uploadReport,
} from '../../storage/r2.js'

describe('r2 storage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.CLOUDFLARE_R2_ENDPOINT = 'https://fake.r2.cloudflarestorage.com'
    process.env.CLOUDFLARE_R2_ACCESS_KEY = 'fake-access-key'
    process.env.CLOUDFLARE_R2_SECRET_KEY = 'fake-secret-key'
    process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL = 'https://cdn.example.com'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when a required env variable is missing', () => {
    process.env.CLOUDFLARE_R2_ENDPOINT = undefined
    expect(() => getR2ConfigFromEnv()).toThrow('Missing Cloudflare R2 environment variables')
  })

  it('getOptionalR2ConfigFromEnv returns null when config is incomplete', () => {
    process.env.CLOUDFLARE_R2_ENDPOINT = undefined
    expect(getOptionalR2ConfigFromEnv()).toBeNull()
  })

  it('getOptionalR2ConfigFromEnv returns the config when complete', () => {
    expect(getOptionalR2ConfigFromEnv()).toEqual({
      endpoint: 'https://fake.r2.cloudflarestorage.com',
      accessKeyId: 'fake-access-key',
      secretAccessKey: 'fake-secret-key',
      publicBaseUrl: 'https://cdn.example.com',
    })
  })

  it('uploadReport sends PutObjectCommand and returns public url', async () => {
    const client = createR2Client(getR2ConfigFromEnv())
    const sendSpy = spyOn(client, 'send').mockResolvedValue({} as never)

    const result = await uploadReport(
      client,
      'reports/1/geo-report.pdf',
      Buffer.from('pdf-bytes'),
      'application/pdf',
    )

    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(result.storageKey).toBe('reports/1/geo-report.pdf')
    expect(result.publicUrl).toBe('https://cdn.example.com/reports/1/geo-report.pdf')
  })
})
