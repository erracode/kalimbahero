
import { Hono } from 'hono';
import { db } from '../db';
import { songs, users, likes, favorites, ratings } from '../db/schema';
import { auth } from '../auth';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Song } from 'shared';

const app = new Hono();

// GET /api/songs - List songs (Discovery)
app.get('/', async (c) => {
    const sort = c.req.query('sort') || 'new'; // 'new' | 'popular' | 'trending'
    const authorId = c.req.query('authorId');
    const favoritesOnly = c.req.query('favoritesOnly') === 'true';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '24');
    const offset = (page - 1) * limit;

    const difficulty = c.req.query('difficulty');
    const category = c.req.query('category');
    const q = c.req.query('q');

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    let conditions: any[] = [eq(songs.isPublic, true)];

    if (authorId) {
        conditions.push(eq(songs.authorId, authorId));
    }
    if (difficulty) {
        conditions.push(eq(songs.difficulty, difficulty.toUpperCase()));
    }
    if (category) {
        conditions.push(eq(songs.category, category));
    }
    if (q) {
        conditions.push(sql`(LOWER(${songs.title}) LIKE ${'%' + q.toLowerCase() + '%'} OR LOWER(${songs.artist}) LIKE ${'%' + q.toLowerCase() + '%'})`);
    }
    if (favoritesOnly && session) {
        conditions.push(sql`EXISTS(SELECT 1 FROM ${favorites} WHERE ${favorites.songId} = ${songs.id} AND ${favorites.userId} = ${session.user.id})`);
    }

    let whereClause = and(...conditions);

    // Get total count for pagination
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(songs)
        .where(whereClause);

    const totalCount = Number(countResult?.count || 0);

    // Build the query
    let query = db.select({
        id: songs.id,
        title: songs.title,
        artist: songs.artist,
        difficulty: songs.difficulty,
        plays: songs.plays,
        likes: songs.likes,
        isPublic: songs.isPublic,
        coverUrl: songs.coverUrl,
        category: songs.category,
        youtubeUrl: songs.youtubeUrl,
        createdAt: songs.createdAt,
        author: {
            id: users.id,
            name: users.name,
            image: users.image
        },
        // Check if user likes/favorites this song
        isLiked: session ? sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.songId} = ${songs.id} AND ${likes.userId} = ${session.user.id})` : sql<boolean>`false`,
        isFavorited: session ? sql<boolean>`EXISTS(SELECT 1 FROM ${favorites} WHERE ${favorites.songId} = ${songs.id} AND ${favorites.userId} = ${session.user.id})` : sql<boolean>`false`,
        averageRating: sql<number>`(SELECT AVG(${ratings.score})::numeric(10,1) FROM ${ratings} WHERE ${ratings.songId} = ${songs.id})`,
        voteCount: sql<number>`(SELECT COUNT(*)::int FROM ${ratings} WHERE ${ratings.songId} = ${songs.id})`,
        userRating: session ? sql<number>`(SELECT ${ratings.score} FROM ${ratings} WHERE ${ratings.songId} = ${songs.id} AND ${ratings.userId} = ${session.user.id})` : sql<number>`null`,
        songData: songs.songData,
    })
        .from(songs)
        .leftJoin(users, eq(songs.authorId, users.id))
        .where(whereClause);

    if (sort === 'popular') {
        query.orderBy(desc(songs.plays));
    } else if (sort === 'trending') {
        query.orderBy(desc(songs.likes));
    } else {
        query.orderBy(desc(songs.createdAt));
    }

    const results = await query.limit(limit).offset(offset);

    return c.json({
        success: true,
        data: results,
        pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
        }
    });
});

// GET /api/songs/me - Get current user's songs (including private ones)
app.get('/me', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const results = await db.select({
            id: songs.id,
            title: songs.title,
            artist: songs.artist,
            difficulty: songs.difficulty,
            plays: songs.plays,
            likes: songs.likes,
            isPublic: songs.isPublic,
            coverUrl: songs.coverUrl,
            category: songs.category,
            youtubeUrl: songs.youtubeUrl,
            createdAt: songs.createdAt,
            author: {
                id: users.id,
                name: users.name,
                image: users.image
            },
            isLiked: sql<boolean>`EXISTS(SELECT 1 FROM ${likes} WHERE ${likes.songId} = ${songs.id} AND ${likes.userId} = ${session.user.id})`,
            isFavorited: sql<boolean>`EXISTS(SELECT 1 FROM ${favorites} WHERE ${favorites.songId} = ${songs.id} AND ${favorites.userId} = ${session.user.id})`,
            averageRating: sql<number>`(SELECT AVG(${ratings.score})::numeric(10,1) FROM ${ratings} WHERE ${ratings.songId} = ${songs.id})`,
            voteCount: sql<number>`(SELECT COUNT(*)::int FROM ${ratings} WHERE ${ratings.songId} = ${songs.id})`,
            userRating: sql<number>`(SELECT ${ratings.score} FROM ${ratings} WHERE ${ratings.songId} = ${songs.id} AND ${ratings.userId} = ${session.user.id})`,
            songData: songs.songData,
        })
            .from(songs)
            .leftJoin(users, eq(songs.authorId, users.id))
            .where(eq(songs.authorId, session.user.id))
            .orderBy(desc(songs.updatedAt));

        return c.json({ success: true, data: results });
    } catch (err: any) {
        console.error("Error in /api/songs/me:", err);
        return c.json({ success: false, error: err.message || "Internal Server Error" }, 500);
    }
});

// GET /api/songs/:id - Get single song
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await db.select()
        .from(songs)
        .where(eq(songs.id, id))
        .limit(1);

    if (result.length === 0) {
        return c.json({ success: false, error: "Song not found" }, 404);
    }
    return c.json({ success: true, data: result[0] });
});

// POST /api/songs - Publish/Sync Song (Protected)
app.post('/', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    if (!body.title || !body.songData) {
        return c.json({ success: false, error: "Missing required fields" }, 400);
    }

    const localId = body.songData.id;

    // Check if a song with this local ID already exists for this user
    if (localId) {
        const [existing] = await db.select()
            .from(songs)
            .where(and(
                eq(songs.authorId, session.user.id),
                sql`${songs.songData}->>'id' = ${localId}`
            ))
            .limit(1);

        if (existing) {
            return c.json({ success: true, data: existing, message: "Found existing sync" });
        }
    }

    // Create Song - Use localId in slug for more stability across retries
    const slugSuffix = localId ? localId.slice(-6) : Date.now().toString(36);
    const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + slugSuffix;

    const [newSong] = await db.insert(songs).values({
        authorId: session.user.id,
        title: body.title,
        artist: body.artist || body.songData.artist || "Unknown Artist",
        slug,
        songData: body.songData,
        difficulty: (body.difficulty || body.songData.difficulty || 'medium').toLowerCase(),
        isPublic: body.isPublic || body.songData.isPublic || false,
        coverUrl: body.coverUrl || body.songData.coverUrl,
        youtubeUrl: body.youtubeUrl || body.songData.youtubeUrl,
        category: body.category || body.songData.category,
    }).returning();

    return c.json({ success: true, data: newSong });
});

// PUT /api/songs/:id - Update Song (Protected + Ownership)
app.put('/:id', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param('id');
    const body = await c.req.json();

    // Check ownership
    const [existing] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);
    if (existing.authorId !== session.user.id) return c.json({ success: false, error: "Forbidden" }, 403);

    const [updated] = await db.update(songs)
        .set({
            title: body.title ?? existing.title,
            artist: body.artist ?? body.songData?.artist ?? existing.artist,
            songData: body.songData ?? existing.songData,
            difficulty: (body.difficulty ?? body.songData?.difficulty ?? existing.difficulty)?.toLowerCase(),
            isPublic: body.isPublic !== undefined ? body.isPublic : (body.songData?.isPublic ?? existing.isPublic),
            coverUrl: body.coverUrl ?? body.songData?.coverUrl ?? existing.coverUrl,
            youtubeUrl: body.youtubeUrl ?? body.songData?.youtubeUrl ?? existing.youtubeUrl,
            category: body.category ?? body.songData?.category ?? existing.category,
            updatedAt: new Date(),
        })
        .where(eq(songs.id, id))
        .returning();

    return c.json({ success: true, data: updated });
});

// DELETE /api/songs/:id - Delete Song (Protected + Ownership)
app.delete('/:id', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param('id');

    // Check ownership
    const [existing] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!existing) return c.json({ success: false, error: "Not found" }, 404);
    if (existing.authorId !== session.user.id) return c.json({ success: false, error: "Forbidden" }, 403);

    await db.delete(songs).where(eq(songs.id, id));

    return c.json({ success: true, message: "Song deleted" });
});

// POST /api/songs/bulk - Bulk Upload (Protected)
app.post('/bulk', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const { songs: songsToSync } = await c.req.json();
    if (!Array.isArray(songsToSync)) return c.json({ success: false, error: "Invalid data" }, 400);

    const results = [];
    for (const song of songsToSync) {
        const localId = song.id;

        // 1. Check if already exists
        const [existing] = await db.select()
            .from(songs)
            .where(and(
                eq(songs.authorId, session.user.id),
                sql`${songs.songData}->>'id' = ${localId}`
            ))
            .limit(1);

        if (existing) {
            results.push(existing);
            continue;
        }

        // 2. Insert new
        const [inserted] = await db.insert(songs).values({
            authorId: session.user.id,
            title: song.title,
            artist: song.artist || "Unknown Artist",
            slug: (song.title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 8)),
            songData: song,
            difficulty: String(song.difficulty || 'MEDIUM'),
            isPublic: false,
        }).returning();

        if (inserted) results.push(inserted);
    }

    return c.json({ success: true, syncedCount: results.length, data: results });
});

// POST /api/songs/:id/like - Toggle Like
app.post('/:id/like', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param('id');

    // 1. Check if song exists
    const [song] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!song) return c.json({ success: false, error: "Song not found" }, 404);

    // 2. Check if already liked
    const [existingLike] = await db.select()
        .from(likes)
        .where(and(eq(likes.userId, session.user.id), eq(likes.songId, id)))
        .limit(1);

    if (existingLike) {
        // Unlike
        await db.delete(likes).where(and(eq(likes.userId, session.user.id), eq(likes.songId, id)));
        await db.update(songs).set({ likes: sql`${songs.likes} - 1` }).where(eq(songs.id, id));
        return c.json({ success: true, isLiked: false });
    } else {
        // Like
        await db.insert(likes).values({ userId: session.user.id, songId: id });
        await db.update(songs).set({ likes: sql`${songs.likes} + 1` }).where(eq(songs.id, id));
        return c.json({ success: true, isLiked: true });
    }
});

// POST /api/songs/:id/favorite - Toggle Favorite
app.post('/:id/favorite', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param('id');

    // Check if favorited
    const [existing] = await db.select()
        .from(favorites)
        .where(and(eq(favorites.userId, session.user.id), eq(favorites.songId, id)))
        .limit(1);

    if (existing) {
        await db.delete(favorites).where(and(eq(favorites.userId, session.user.id), eq(favorites.songId, id)));
        return c.json({ success: true, isFavorited: false });
    } else {
        await db.insert(favorites).values({ userId: session.user.id, songId: id });
        return c.json({ success: true, isFavorited: true });
    }
});

// POST /api/songs/:id/rate - Rate Song
app.post('/:id/rate', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ success: false, error: "Unauthorized" }, 401);

    const id = c.req.param('id');
    const { score } = await c.req.json();

    if (!score || score < 1 || score > 5) {
        return c.json({ success: false, error: "Invalid score" }, 400);
    }

    // Check if previous rating exists
    const [existing] = await db.select()
        .from(ratings)
        .where(and(eq(ratings.userId, session.user.id), eq(ratings.songId, id)))
        .limit(1);

    if (existing) {
        await db.update(ratings)
            .set({ score })
            .where(and(eq(ratings.userId, session.user.id), eq(ratings.songId, id)));
    } else {
        await db.insert(ratings).values({ userId: session.user.id, songId: id, score });
    }

    // Calculate new average
    const [avgResult] = await db.select({ average: sql<number>`AVG(${ratings.score})::numeric(10,1)` })
        .from(ratings)
        .where(eq(ratings.songId, id));

    return c.json({ success: true, averageRating: avgResult?.average || score, userRating: score });
});

// POST /api/songs/:id/play - Increment Play Count
app.post('/:id/play', async (c) => {
    const id = c.req.param('id');
    await db.update(songs).set({ plays: sql`${songs.plays} + 1` }).where(eq(songs.id, id));
    return c.json({ success: true });
});

export default app;
