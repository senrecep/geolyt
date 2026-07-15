import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
})

global.window = dom.window as unknown as Window & typeof globalThis
global.document = dom.window.document
global.navigator = dom.window.navigator
