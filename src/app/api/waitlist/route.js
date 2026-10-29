import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';
import { getDatabase } from '@/lib/mongodb';
import { waitlistSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 8192;
const RATE_LIMIT = 5;
const HOUR_MS = 60 * 60 * 1000;
const successMessage = "You're on the list! We'll share updates when they're available.";

const json = (body, status = 200) => NextResponse.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' }
});

export async function POST(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return json({ detail: 'Expected JSON content.' }, 415);
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) {
    return json({ detail: 'Submission too large.' }, 413);
  }

  let data;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return json({ detail: 'Submission too large.' }, 413);
    data = JSON.parse(raw);
  } catch {
    return json({ detail: 'Invalid JSON request.' }, 400);
  }

  const parsed = waitlistSchema.safeParse(data);
  if (!parsed.success) {
    return json({ detail: 'Please review the form information.' }, 422);
  }
  // Honeypot submissions receive a normal response without database writes.
  if (parsed.data.website) return json({ message: successMessage }, 201);

  try {
    const db = await getDatabase();
    const entries = db.collection('waitlist');
    const counters = db.collection('waitlist_rate_limits');

    const forwardingEnabled = process.env.TRUST_AMPLIFY_FORWARDED_IP === 'true';
    const ip = forwardingEnabled
      ? (request.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 80)
      : 'unknown';
    const agent = (request.headers.get('user-agent') || 'unknown').slice(0, 150);
    const secret = process.env.RATE_LIMIT_SECRET;
    if (!secret || secret.length < 32) {
      console.error('RATE_LIMIT_SECRET is missing or too short');
      return json({ detail: 'Service temporarily unavailable. Please try again later.' }, 503);
    }
    const key = createHmac('sha256', secret).update(`${ip}|${agent}`).digest('hex');
    const now = new Date();
    const window = Math.floor(now.getTime() / HOUR_MS);
    const id = `${window}:${key}`;
    const count = await counters.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expireAt: new Date((window + 2) * HOUR_MS) } },
      { upsert: true, returnDocument: 'after' }
    );
    if (count.count > RATE_LIMIT) {
      return json({ detail: 'Too many submissions. Please try again later.' }, 429);
    }

    const { website, ...fields } = parsed.data;
    // A unique email index prevents duplicate records even under concurrency.
    try {
      await entries.insertOne({
        ...fields,
        created_at: now,
        source: 'landing_page'
      });
    } catch (error) {
      if (error?.code === 11000) {
        return json({ message: 'Thanks for your interest! If you are already registered, your place is saved.' });
      }
      throw error;
    }
    return json({ message: successMessage }, 201);
  } catch (error) {
  console.error("CRIS_WAITLIST_ERROR", {
    name: error?.name || "Unknown",
    code: error?.code || "UNKNOWN",
    message:
      error?.name === "MongoServerSelectionError"
        ? "MongoDB server selection failed"
        : "Server operation failed",
    mongodbConfigured: Boolean(process.env.MONGODB_URI),
    databaseConfigured: Boolean(process.env.MONGODB_DB),
    secretConfigured:
      (process.env.RATE_LIMIT_SECRET?.length || 0) >= 32,
  });

  return json(
    {
      detail: "Service temporarily unavailable. Please try again later."
    },
    503
  );
}
}

export async function GET() {
  return json({ detail: 'Method not allowed.' }, 405);
}
