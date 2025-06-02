
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
  } catch (error: any) {
    console.error('Error adding customer:', error);
    return { success: false, error: error.message || 'Falha ao adicionar cliente.' };
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
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message || 'Falha ao atualizar cliente.' };
  }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, 'customers', id);
    await deleteDoc(customerRef);
    revalidatePath('/customers');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message || 'Falha ao excluir cliente.' };
  }
}
