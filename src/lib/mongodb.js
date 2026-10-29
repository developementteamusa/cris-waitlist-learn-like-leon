import { MongoClient } from 'mongodb';

// The database connection is established only in server-side route handlers.
let clientPromise;
export function getMongoClient() {
  const uri = process.env.REACT_APP_MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI has not been configured.');
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 7000,
      maxPoolSize: 5,
      retryWrites: true
    });
    clientPromise = client.connect().catch(error => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.REACT_APP_MONGODB_DB || 'Learn-Like-Leon');
}
