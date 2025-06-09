
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

export async function revalidateSalesRelatedPages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/sales');
    revalidatePath('/stock'); // Sales can affect stock
    revalidatePath('/'); // Dashboard might show sales or stock info
    return { success: true };
  } catch (error) {
    console.error('Error revalidating sales related pages:', error);
    return { success: false };
  }
}
