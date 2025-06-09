
'use server';

import { revalidatePath } from 'next/cache';
import type { Timestamp } from 'firebase/firestore';

// Interfaces permanecem para tipagem, se necessário
export interface SaleFormData {
  customerId: string | null;
  customerName?: string;
  value: number;
  paymentMethod: string;
  date: Date;
  status: string; // "Paid", "Pending", "Overdue"
  paymentDueDate?: Date | null; // Data de vencimento para pagamentos pendentes
  gasCanistersQuantity: number;
  observations: string;
  subtractFromStock: boolean;
}

export interface Sale extends Omit<SaleFormData, 'date' | 'paymentDueDate'> {
  id: string;
  date: Timestamp; // Armazenado como Timestamp no Firestore
  paymentDueDate?: Timestamp | null; // Armazenado como Timestamp no Firestore
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function revalidateSalesRelatedPages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/sales');
    revalidatePath('/stock'); // Sales can affect stock
    revalidatePath('/'); // Dashboard might show sales or stock info
    revalidatePath('/defaults'); // Sales pendentes podem afetar inadimplência
    return { success: true };
  } catch (error) {
    console.error('Error revalidating sales related pages:', error);
    return { success: false };
  }
}
