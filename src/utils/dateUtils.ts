/**
 * Robust date parser for Firebase Firestore timestamps, Date objects, and ISO strings.
 */
export function parseFirestoreDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  
  // If it's a Firestore Timestamp instance with toDate method
  if (typeof dateVal?.toDate === 'function') {
    try {
      const d = dateVal.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {
      // ignore and continue
    }
  }

  // If it's already a Date
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  }

  // If it has seconds property from serialized Firestore Timestamp
  if (typeof dateVal?.seconds === 'number') {
    return new Date(dateVal.seconds * 1000);
  }

  // If it's a numeric timestamp (milliseconds or seconds)
  if (typeof dateVal === 'number') {
    // If it's in seconds (10 digits) vs ms (13 digits)
    const ms = dateVal < 10000000000 ? dateVal * 1000 : dateVal;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  // If it's a string
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}
