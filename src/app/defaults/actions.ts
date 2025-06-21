
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

export interface DefaultFormData {
  customerId: string | null;
  customerName?: string;
  saleId: string;
  value: number;
  dueDate: Date;
  paymentStatus: string;
}

export interface DefaultEntry extends DefaultFormData {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addOrUpdateDefault(
  data: DefaultFormData, 
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...data,
      value: Number(data.value) || 0,
      dueDate: Timestamp.fromDate(data.dueDate),
    };

    if (existingId) {
      const defaultRef = doc(db, 'defaults', existingId);
      await updateDoc(defaultRef, { ...payload, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'defaults'), { ...payload, createdAt: serverTimestamp() });
    }
    
    revalidatePath('/defaults');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error saving default:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao salvar pendência.';
    return { success: false, error: errorMessage };
  }
}

export async function deleteDefault(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultRef = doc(db, 'defaults', id);
    await deleteDoc(defaultRef);
    revalidatePath('/defaults');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting default:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao excluir pendência.';
    return { success: false, error: errorMessage };
  }
}

export async function markDefaultAsPaid(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultRef = doc(db, 'defaults', id);
    await updateDoc(defaultRef, {
      paymentStatus: "Paid",
      updatedAt: serverTimestamp(),
    });
    revalidatePath('/defaults');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error marking default as paid:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao marcar como pago.';
    return { success: false, error: errorMessage };
  }
}
