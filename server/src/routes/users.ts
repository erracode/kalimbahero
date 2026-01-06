
import { Hono } from 'hono';
import { auth } from '../auth';

const app = new Hono();

app.get('/me', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ success: false, user: null });
    }
    return c.json({ success: true, user: session.user });
});

export default app;
