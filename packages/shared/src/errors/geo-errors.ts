import { Err } from 'tsentials/errors'

export const GeoErr = {
  crawlerBlocked: (url: string) =>
    Err.forbidden('GEO.CrawlerBlocked', `Server blocks AI crawlers: ${url}`),

  fetchTimeout: (url: string) => Err.unexpected('GEO.FetchTimeout', `Unreachable: ${url}`),

  noContent: () => Err.validation('GEO.NoContent', 'Insufficient text content'),

  jsRenderedOnly: () =>
    Err.validation(
      'GEO.JsRenderedOnly',
      'Content requires JavaScript — AI crawlers cannot read this page',
    ),

  noStructuredData: () => Err.validation('GEO.NoStructuredData', 'No JSON-LD schema found'),

  noLlmsTxt: () => Err.validation('GEO.NoLlmsTxt', 'Missing llms.txt'),

  noCanonical: () => Err.validation('GEO.NoCanonical', 'Missing canonical tags'),

  lowCitability: (n: number) => Err.validation('GEO.LowCitability', `Citability score: ${n}/100`),

  invalidUrl: (url: string) => Err.validation('GEO.InvalidUrl', `Invalid URL: ${url}`),

  internal: (description: string) => Err.unexpected('GEO.Internal', description),
}
