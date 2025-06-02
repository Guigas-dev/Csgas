
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
  } catch (e: unknown) {
    console.error('Error adding sale:', e);
    let errorMessage = 'Falha ao registrar venda.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
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
  } catch (e: unknown) {
    console.error('Error updating sale:', e);
    let errorMessage = 'Falha ao atualizar venda.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
  }
}

export async function deleteSale(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const saleRef = doc(db, 'sales', id);
    await deleteDoc(saleRef);
    revalidatePath('/sales');
    revalidatePath('/'); // For dashboard recent sales
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting sale:', e);
    let errorMessage = 'Falha ao excluir venda.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
  }
}
