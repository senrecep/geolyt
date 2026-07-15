import { readFileSync } from 'node:fs'

export interface SecretFinding {
  pattern: string
  line: number
  match: string
}

export const secretPatterns = [
  { name: 'Stripe secret key', regex: /sk_(?:live|test|rescue)_[a-zA-Z0-9]{24,}/ },
  { name: 'Stripe restricted key', regex: /rk_(?:live|test)_[a-zA-Z0-9]{24,}/ },
  { name: 'OpenAI API key', regex: /sk-[a-zA-Z0-9]{48}/ },
  { name: 'Anthropic API key', regex: /sk-ant-[a-zA-Z0-9_-]{32,}/ },
  { name: 'Google AI API key', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Cloudflare API token', regex: /[a-f0-9]{40}/ },
  {
    name: 'Generic secret/key assignment',
    regex: /(?:api[_-]?key|secret[_-]?key)\s*=\s*['"][a-zA-Z0-9]{16,}['"]/i,
  },
]

const PLACEHOLDER_REGEX = /your_[a-z_]+_here|example|placeholder|mock|dummy/i

export function scanContent(content: string): SecretFinding[] {
  const findings: SecretFinding[] = []
  const lines = content.split('\n')

  for (const { name, regex } of secretPatterns) {
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      const match = regex.exec(line)
      if (match && !PLACEHOLDER_REGEX.test(line)) {
        findings.push({
          pattern: name,
          line: index + 1,
          match: match[0],
        })
      }
    }
  }

  return findings
}

function shouldSkipFile(filePath: string): boolean {
  return (
    filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts') || filePath === '.env.example'
  )
}

function scanFiles(filePaths: string[]): SecretFinding[] {
  const allFindings: SecretFinding[] = []

  for (const filePath of filePaths) {
    if (shouldSkipFile(filePath)) {
      continue
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      const findings = scanContent(content)
      for (const finding of findings) {
        allFindings.push({ ...finding, match: `${filePath}:${finding.line}: ${finding.match}` })
      }
    } catch (error) {
      process.stderr.write(`warning: could not read ${filePath}: ${error}\n`)
    }
  }

  return allFindings
}

function main(): void {
  const filePaths = process.argv.slice(2)
  if (filePaths.length === 0) {
    process.exit(0)
  }

  const findings = scanFiles(filePaths)
  if (findings.length === 0) {
    process.exit(0)
  }

  process.stderr.write(`Detected ${findings.length} potential secret(s):\n`)
  for (const finding of findings) {
    process.stderr.write(`  ${finding.match}\n`)
  }
  process.exit(1)
}

if (import.meta.main) {
  main()
}
