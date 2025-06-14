
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, writeBatch } from 'firebase/firestore';

export type ClearableCollectionName = "customers" | "sales" | "defaults" | "stockMovements";

export async function clearFirestoreCollection(collectionName: ClearableCollectionName): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: "Firestore database is not initialized." };
  }

  try {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: true, message: `Collection "${collectionName}" is already empty.` };
    }

    const BATCH_SIZE = 499; // Firestore limit is 500 operations per batch
    const docRefs = querySnapshot.docs.map(docSnapshot => docSnapshot.ref);
    let deletedCount = 0;

    for (let i = 0; i < docRefs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docRefs.slice(i, i + BATCH_SIZE);
      chunk.forEach(docRef => {
        batch.delete(docRef);
      });
      await batch.commit();
      deletedCount += chunk.length;
    }

    // Revalidate relevant paths
    switch (collectionName) {
      case "customers":
        revalidatePath('/customers');
        revalidatePath('/');
        break;
      case "sales":
        revalidatePath('/sales');
        revalidatePath('/stock');
        revalidatePath('/defaults');
        revalidatePath('/');
        break;
      case "defaults":
        revalidatePath('/defaults');
        revalidatePath('/');
        break;
      case "stockMovements":
        revalidatePath('/stock');
        revalidatePath('/');
        break;
    }
    // Revalidate users page itself
    revalidatePath('/users');


    return { success: true, message: `${deletedCount} records from collection "${collectionName}" have been removed.` };
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to clear collection "${collectionName}". ${errorMessage}` };
  }
}
