
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

export interface CustomerFormData {
  name: string;
  cpf: string;
  address: string;
  phone: string;
}

export interface Customer extends CustomerFormData {
  id: string;
}

export async function addCustomer(formData: CustomerFormData): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'customers'), {
      ...formData,
      createdAt: Timestamp.now(),
    });
    revalidatePath('/customers');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error adding customer:', e);
    let errorMessage = 'Falha ao adicionar cliente.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
  }
}

export async function updateCustomer(id: string, formData: CustomerFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, 'customers', id);
    await updateDoc(customerRef, {
      ...formData,
      updatedAt: Timestamp.now(),
    });
    revalidatePath('/customers');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error updating customer:', e);
    let errorMessage = 'Falha ao atualizar cliente.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
  }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, 'customers', id);
    await deleteDoc(customerRef);
    revalidatePath('/customers');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting customer:', e);
    let errorMessage = 'Falha ao excluir cliente.';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    return { success: false, error: errorMessage };
  }
}
