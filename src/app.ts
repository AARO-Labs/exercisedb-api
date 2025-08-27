import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { Routes } from '#common/types'
import type { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
export class App {
  private app: OpenAPIHono
  constructor(routes: Routes[]) {
    this.app = new OpenAPIHono()
    this.initializeApp(routes)
  }
  private async initializeApp(routes: Routes[]) {
    try {
      this.initializeGlobalMiddleware()
      this.initializeRoutes(routes)
      this.initializeSwaggerUI()
      this.initializeRouteFallback()
      this.initializeErrorHandler()
    } catch (error) {
      console.error('Failed to initialize application:', error)
      throw new Error('Failed to initialize application')
    }
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach((route) => {
      route.initRoutes()
      this.app.route('/api/v1', route.controller)
    })
    // Redirect root to docs
    this.app.get('/', (c) => c.redirect('/docs'))
  }

  private initializeGlobalMiddleware() {
    this.app.use(
      cors({
        origin: '*',
        allowMethods: ['GET', 'OPTIONS']
      })
    )

    this.app.use(logger())
    this.app.use(prettyJSON())
    this.app.use(async (c, next) => {
      const start = Date.now()
      await next()
      const end = Date.now()
      c.res.headers.set('X-Response-Time', `${end - start}ms`)
    })

    // this.app.use(authMiddleware)
  }

  private initializeSwaggerUI(): void {
    // OpenAPI documentation for v1
    this.app.doc31('/swagger', (c) => {
      const { protocol: urlProtocol, hostname, port } = new URL(c.req.url)
      const protocol = c.req.header('x-forwarded-proto') ? `${c.req.header('x-forwarded-proto')}:` : urlProtocol

      return {
        openapi: '3.1.0',
        info: {
          version: '1.0.0',
          title: 'Exercise Database API',
          description:
            'A comprehensive fitness exercise database API with 1,500+ structured exercises including detailed metadata like target muscles, equipment, and body parts.'
        },
        servers: [
          {
            url: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
            description: 'Exercise Database API'
          }
        ]
      }
    })

    // API Documentation UI
    this.app.get(
      '/docs',
      Scalar({
        pageTitle: 'Exercise Database API',
        theme: 'kepler',
        isEditable: false,
        layout: 'modern',
        darkMode: true,
        hideDownloadButton: true,
        hideDarkModeToggle: true,
        url: '/swagger',
        defaultOpenAllTags: true,
        hideClientButton: true,
        metaData: {
          applicationName: 'Exercise Database API',
          author: '',
          creator: '',
          publisher: '',
          ogType: 'website',
          robots: 'index follow',
          description: 'A comprehensive fitness exercise database API with 1,500+ structured exercises.'
        }
      })
    )
  }

  private initializeRouteFallback() {
    this.app.notFound((c) => {
      return c.json(
        {
          success: false,
          message: 'Route not found. Check docs at /docs'
        },
        404
      )
    })
  }
  private initializeErrorHandler() {
    this.app.onError((err, c) => {
      const error = err as HTTPException
      console.log(error)
      return c.json({ success: false, message: error.message }, error.status || 500)
    })
  }
  public getApp() {
    return this.app
  }
}
