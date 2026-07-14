import { createApp } from './index.js'

const port = Number(process.env.API_PORT ?? 3000)

createApp().listen(port, ({ hostname, port }) => {
  console.info(`API running at http://${hostname}:${port}`)
})
