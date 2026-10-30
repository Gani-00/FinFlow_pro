import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Extracts a friendly readable error message from Firestore errors or JSON error strings.
 */
export function getReadableFirestoreErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";

  const rawMessage = error instanceof Error ? error.message : String(error);

  // Attempt to parse JSON FirestoreErrorInfo
  try {
    if (rawMessage.startsWith("{") && rawMessage.endsWith("}")) {
      const parsed = JSON.parse(rawMessage) as FirestoreErrorInfo;
      if (parsed.error) {
        return getReadableFirestoreErrorMessage(parsed.error);
      }
    }
  } catch {
    // not JSON
  }

  const lower = rawMessage.toLowerCase();
  if (lower.includes("permission-denied") || lower.includes("insufficient permissions")) {
    return "Permission denied. You might need to sign in or don't have access to this resource.";
  }
  if (lower.includes("unavailable") || lower.includes("failed to get document because the client is offline")) {
    return "Database connection temporarily unavailable. Please check your network connection.";
  }
  if (lower.includes("quota exceeded") || lower.includes("resource-exhausted")) {
    return "Database usage quota exceeded for today. Please try again later.";
  }
  if (lower.includes("unauthenticated")) {
    return "Session expired or unauthenticated. Please sign in again.";
  }
  if (lower.includes("not-found")) {
    return "The requested record was not found.";
  }

  return rawMessage.length > 120 ? `${rawMessage.slice(0, 117)}...` : rawMessage;
}

