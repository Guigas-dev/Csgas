
'use server';

import { revalidatePath } from 'next/cache';
import type { Timestamp } from 'firebase/firestore';

// Interface permanece para tipagem
export interface StockMovementFormData {
  type: 'INPUT' | 'OUTPUT';
  origin: string; 
  quantity: number;
  notes?: string;
  relatedSaleId?: string; 
}

export interface StockMovementEntry extends StockMovementFormData {
  id: string;
  createdAt: Timestamp; // Firestore Timestamp
}

export async function revalidateStockRelatedPages(): Promise<{ success: boolean }> {
  try {
    revalidatePath('/stock');
    revalidatePath('/'); // Dashboard might show stock info
    return { success: true };
  } catch (error) {
    console.error('Error revalidating stock related pages:', error);
    return { success: false };
  }
}
