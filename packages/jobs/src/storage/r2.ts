import { PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'

export interface R2Config {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

export function createR2Client(config: R2Config): S3Client {
  const clientConfig: S3ClientConfig = {
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  }
  return new S3Client(clientConfig)
}

export function getR2ConfigFromEnv(): R2Config {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL

  if (!endpoint || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error('Missing Cloudflare R2 environment variables')
  }

  return { endpoint, accessKeyId, secretAccessKey, publicBaseUrl }
}

export async function uploadReport(
  client: S3Client,
  bucketKey: string,
  body: Buffer,
  contentType: string,
): Promise<{ storageKey: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: 'geolyt',
    Key: bucketKey,
    Body: body,
    ContentType: contentType,
  })

  await client.send(command)

  const config = getR2ConfigFromEnv()
  return {
    storageKey: bucketKey,
    publicUrl: `${config.publicBaseUrl}/${bucketKey}`,
  }
}
