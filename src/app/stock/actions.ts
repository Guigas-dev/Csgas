
'use server';

import { revalidatePath } from 'next/cache';
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
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

export async function updateStockMovement(id: string, data: Omit<StockMovementFormData, 'type' | 'relatedSaleId'>): Promise<{ success: boolean; error?: string }> {
  try {
    const movementRef = doc(db, "stockMovements", id);
    // Type and relatedSaleId should not be editable for manual entries after creation to maintain integrity.
    // Origin might be editable for manual entries, quantity and notes definitely are.
    await updateDoc(movementRef, {
      ...data,
      quantity: Number(data.quantity) || 0, // Ensure quantity is a number
      updatedAt: serverTimestamp() 
    });
    await revalidateStockRelatedPages();
    return { success: true };
  } catch (e: unknown) {
    console.error('Error updating stock movement:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: errorMessage };
  }
}

export async function deleteStockMovement(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const movementRef = doc(db, "stockMovements", id);
    await deleteDoc(movementRef);
    await revalidateStockRelatedPages();
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting stock movement:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: errorMessage };
  }
}
