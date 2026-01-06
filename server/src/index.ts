import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import songsRouter from './routes/songs'
import usersRouter from './routes/users'

const app = new Hono()

// Configure CORS
app.use('/api/*', cors({
  origin: ['http://localhost:5173'], // Client URL
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Mount Better-Auth Handler
// Mount Better-Auth Handler (Greedy match for all auth subpaths)
app.all('/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});
app.all('/api/auth/**', (c) => {
  return auth.handler(c.req.raw);
});

// Mount Routes
app.route('/api/songs', songsRouter);
app.route('/api/users', usersRouter);

app.get('/', (c) => {
  return c.text('Kalimba Hero API Running')
})

export default app

