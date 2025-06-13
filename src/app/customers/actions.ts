
'use server';

import { revalidatePath } from 'next/cache';

// Interfaces permanecem para tipagem, se necessário em outros lugares ou para clareza.
export interface CustomerFormData {
  name: string;
  cpf: string;
  street: string;
  number: string;
  neighborhood: string;
  referencePoint?: string;
  phone: string;
}

export interface Customer extends CustomerFormData {
  id: string;
  data_prevista_proxima_compra?: string; // Formato YYYY-MM-DD ou texto como "Incerta"
  prediction_reasoning?: string;
  // createdAt and updatedAt can be handled client-side or through Firestore server timestamps
}

export async function revalidateCustomersPage(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/customers');
    // Se o dashboard também lista clientes ou depende desses dados, revalide-o também.
    // revalidatePath('/'); 
    return { success: true };
  } catch (error) {
    console.error('Error revalidating customers page:', error);
    return { success: false };
  }
}

