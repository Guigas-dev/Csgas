
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

export interface DefaultFormData {
  customerId: string | null;
  customerName?: string; // Optional, can be derived
  saleId: string; // Optional sale ID link
  value: number;
  dueDate: Date;
  paymentStatus: string; // e.g., "Pending", "Paid"
}

export interface DefaultEntry extends DefaultFormData {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addDefault(formData: DefaultFormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'defaults'), {
      ...formData,
      dueDate: Timestamp.fromDate(formData.dueDate),
      createdAt: Timestamp.now(),
    });
    revalidatePath('/defaults');
    revalidatePath('/'); // For dashboard defaults
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding default:', error);
    return { success: false, error: error.message || 'Falha ao adicionar pendência.' };
  }
}

export async function updateDefault(id: string, formData: Partial<DefaultFormData>): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultRef = doc(db, 'defaults', id);
    const updateData: any = { ...formData, updatedAt: Timestamp.now() };
    if (formData.dueDate) {
      updateData.dueDate = Timestamp.fromDate(formData.dueDate);
    }
    await updateDoc(defaultRef, updateData);
    revalidatePath('/defaults');
    revalidatePath('/'); // For dashboard defaults
    return { success: true };
  } catch (error: any) {
    console.error('Error updating default:', error);
    return { success: false, error: error.message || 'Falha ao atualizar pendência.' };
  }
}

export async function deleteDefault(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultRef = doc(db, 'defaults', id);
    await deleteDoc(defaultRef);
    revalidatePath('/defaults');
    revalidatePath('/'); // For dashboard defaults
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting default:', error);
    return { success: false, error: error.message || 'Falha ao excluir pendência.' };
  }
}

export async function markDefaultAsPaid(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultRef = doc(db, 'defaults', id);
    await updateDoc(defaultRef, {
      paymentStatus: "Paid",
      updatedAt: Timestamp.now(),
    });
    revalidatePath('/defaults');
    revalidatePath('/'); // For dashboard defaults
    return { success: true };
  } catch (error: any) {
    console.error('Error marking default as paid:', error);
    return { success: false, error: error.message || 'Falha ao marcar como pago.' };
  }
}
