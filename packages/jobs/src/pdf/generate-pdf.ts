import { type Browser, chromium } from 'playwright'

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  let browser: Browser | undefined

  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    return Buffer.from(pdf)
  } finally {
    await browser?.close()
  }
}
