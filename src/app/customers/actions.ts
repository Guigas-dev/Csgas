
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
  query,
  where,
  getDocs
} from "firebase/firestore";

// Interfaces permanecem para tipagem, se necessário em outros lugares ou para clareza.
export interface CustomerFormData {
  name: string;
  cpf: string;
  street: string;
  number:string;
  neighborhood: string;
  referencePoint?: string;
  phone: string;
}

export interface Customer extends CustomerFormData {
  id: string;
}

export async function addCustomer(formData: CustomerFormData): Promise<{ success: boolean; error?: string }> {
  try {
    // Server-side validation
    const q = query(collection(db, "customers"), where("cpf", "==", formData.cpf));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, error: "Já existe um cliente cadastrado com este CPF." };
    }

    await addDoc(collection(db, 'customers'), {
      ...formData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    revalidatePath('/customers');
    revalidatePath('/'); // Dashboard might use this data
    return { success: true };
  } catch (e: unknown) {
    console.error('Error adding customer:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao adicionar cliente.';
    return { success: false, error: errorMessage };
  }
}

export async function updateCustomer(id: string, formData: CustomerFormData): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, 'customers', id);

    // Server-side validation for CPF change
    if (formData.cpf) {
        const q = query(collection(db, "customers"), where("cpf", "==", formData.cpf));
        const querySnapshot = await getDocs(q);
        const existingCustomerDoc = querySnapshot.docs.find(d => d.id !== id);
        if (existingCustomerDoc) {
            return { success: false, error: "Já existe outro cliente cadastrado com este CPF." };
        }
    }

    await updateDoc(customerRef, {
      ...formData,
      updatedAt: serverTimestamp(),
    });

    revalidatePath('/customers');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error updating customer:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao atualizar cliente.';
    return { success: false, error: errorMessage };
  }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const customerRef = doc(db, 'customers', id);
    await deleteDoc(customerRef);
    
    revalidatePath('/customers');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting customer:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao excluir cliente.';
    return { success: false, error: errorMessage };
  }
}
