import { MongoClient } from 'mongodb';

if (!process.env.REACT_APP_MONGODB_URI) {
  console.error('Set REACT_APP_MONGODB_URI before running this script.');
  process.exit(1);
}
const client = new MongoClient(process.env.REACT_APP_MONGODB_URI);
try {
  await client.connect();
  const db = client.db(process.env.REACT_APP_MONGODB_URI || 'Learn-Like-Leon');
  await db.collection('waitlist').createIndex({ email: 1 }, { unique: true, name: 'unique_email' });
  await db.collection('waitlist').createIndex({ created_at: -1 }, { name: 'created_at' });
  await db.collection('waitlist_rate_limits').createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  console.log('Cris MongoDB indexes created.');
} finally {
  await client.close();
}
