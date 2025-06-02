
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

export interface SaleFormData {
  customerId: string | null; // Allow null for "Consumidor Final"
  customerName?: string; // Optional, can be derived or set explicitly
  value: number;
  paymentMethod: string;
  date: Date;
  status: string;
  gasCanistersQuantity: number;
  observations: string;
  subtractFromStock: boolean;
}

export interface Sale extends SaleFormData {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addSale(formData: SaleFormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'sales'), {
      ...formData,
      date: Timestamp.fromDate(formData.date),
      createdAt: Timestamp.now(),
    });
    revalidatePath('/sales');
    revalidatePath('/'); // For dashboard recent sales
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding sale:', error);
    return { success: false, error: error.message || 'Falha ao registrar venda.' };
  }
}

export async function updateSale(id: string, formData: SaleFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const saleRef = doc(db, 'sales', id);
    await updateDoc(saleRef, {
      ...formData,
      date: Timestamp.fromDate(formData.date),
      updatedAt: Timestamp.now(),
    });
    revalidatePath('/sales');
    revalidatePath('/'); // For dashboard recent sales
    return { success: true };
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return { success: false, error: error.message || 'Falha ao atualizar venda.' };
  }
}

export async function deleteSale(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const saleRef = doc(db, 'sales', id);
    await deleteDoc(saleRef);
    revalidatePath('/sales');
    revalidatePath('/'); // For dashboard recent sales
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return { success: false, error: error.message || 'Falha ao excluir venda.' };
  }
}
