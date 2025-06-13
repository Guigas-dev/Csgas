
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

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });
    await batch.commit();

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
    // Revalidate users page itself in case any data displayed there is affected (though currently not)
    revalidatePath('/users');


    return { success: true, message: `All records from collection "${collectionName}" have been removed.` };
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to clear collection "${collectionName}". ${errorMessage}` };
  }
}
