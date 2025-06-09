
'use server';

import { revalidatePath } from 'next/cache';
import type { Timestamp } from 'firebase/firestore'; // Mantido para tipo

// Interfaces permanecem para tipagem, se necessário em outros lugares ou para clareza.
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
  createdAt?: Timestamp; // Firestore Timestamp
  updatedAt?: Timestamp; // Firestore Timestamp
}

// Nova função de revalidação para a página de inadimplências e o dashboard
export async function revalidateDefaultsRelatedPages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/defaults');
    revalidatePath('/'); // Para atualizar o dashboard (onde as inadimplências podem ser exibidas)
    return { success: true };
  } catch (error) {
    console.error('Error revalidating defaults related pages:', error);
    return { success: false };
  }
}
