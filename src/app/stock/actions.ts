
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface StockMovementFormData {
  type: 'INPUT' | 'OUTPUT';
  origin: string; // e.g., "Manual", "Sale", "Adjustment", "Loss"
  quantity: number;
  notes?: string;
  relatedSaleId?: string; // Optional, if movement is tied to a sale
}

export interface StockMovementEntry extends StockMovementFormData {
  id: string;
  createdAt: Timestamp;
}

export async function addStockMovement(formData: StockMovementFormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'stockMovements'), {
      ...formData,
      createdAt: Timestamp.now(),
    });
    revalidatePath('/stock');
    // Consider revalidating '/' if the dashboard stock count needs to be updated from this data.
    // revalidatePath('/'); 
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error adding stock movement:', error);
    return { success: false, error: error.message || 'Falha ao registrar movimentação de estoque.' };
  }
}
