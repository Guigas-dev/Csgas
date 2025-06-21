
'use server';

import { revalidatePath } from 'next/cache';
import { db } from "@/lib/firebase/config";
import { doc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import type { Timestamp } from 'firebase/firestore';

export interface StockMovementFormData {
  type: 'INPUT' | 'OUTPUT';
  origin: string; 
  quantity: number;
  notes?: string;
  relatedSaleId?: string; 
}

export interface StockMovementEntry extends StockMovementFormData {
  id: string;
  createdAt: Timestamp;
}

export async function addStockMovement(data: StockMovementFormData): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'stockMovements'), {
      ...data,
      quantity: Number(data.quantity) || 0,
      createdAt: serverTimestamp(),
    });
    revalidatePath('/stock');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error adding stock movement:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: errorMessage };
  }
}

export async function updateStockMovement(id: string, data: Omit<StockMovementFormData, 'type' | 'relatedSaleId'>): Promise<{ success: boolean; error?: string }> {
  try {
    const movementRef = doc(db, "stockMovements", id);
    await updateDoc(movementRef, {
      ...data,
      quantity: Number(data.quantity) || 0,
      updatedAt: serverTimestamp() 
    });
    revalidatePath('/stock');
    revalidatePath('/');
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
    revalidatePath('/stock');
    revalidatePath('/');
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting stock movement:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { success: false, error: errorMessage };
  }
}
