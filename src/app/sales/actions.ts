
'use server';

import { revalidatePath } from 'next/cache';
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  doc, 
  writeBatch,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  limit,
  deleteDoc
} from 'firebase/firestore';

import type { StockMovementEntry } from "../stock/actions";
import type { DefaultEntry } from "../defaults/actions";


export interface SaleFormData {
  customerId: string | null;
  customerName?: string;
  value: number;
  paymentMethod: string;
  date: Date;
  status: string; // "Paid", "Pending", "Overdue"
  paymentDueDate?: Date | null;
  gasCanistersQuantity: number;
  observations: string;
  subtractFromStock: boolean;
  lucro_bruto?: number; // Lucro bruto da venda de botijões
  custo_botijao?: number;
}

export interface Sale extends Omit<SaleFormData, 'date' | 'paymentDueDate'> {
  id: string;
  date: Timestamp;
  paymentDueDate?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addOrUpdateSale(
  data: SaleFormData, 
  customers: {id: string, name: string}[],
  saleMode: 'quick' | 'customer' | null,
  editingSaleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);

    // --- Determine Customer ---
    const payloadCustomerId = saleMode === 'customer' ? data.customerId : null;
    let payloadCustomerName = ""; 
    if (saleMode === 'customer' && payloadCustomerId) { 
      const selectedCust = customers.find(c => c.id === payloadCustomerId);
      payloadCustomerName = selectedCust ? selectedCust.name : "Cliente Desconhecido";
    } else { 
      payloadCustomerName = data.customerName?.trim() || "Consumidor Final";
    }

    // --- Prepare Sale Payload ---
    const custoBotijao = data.custo_botijao || 94.00; // Fallback to default if not provided
    const saleDataForFirestore = {
      customerId: payloadCustomerId,
      customerName: payloadCustomerName,
      value: Number(data.value) || 0,
      paymentMethod: data.paymentMethod,
      date: Timestamp.fromDate(data.date),
      status: data.status,
      paymentDueDate: data.status === 'Pending' && data.paymentDueDate ? Timestamp.fromDate(data.paymentDueDate) : null,
      gasCanistersQuantity: Number(data.gasCanistersQuantity) || 0,
      observations: data.observations || '',
      subtractFromStock: data.subtractFromStock,
      lucro_bruto: (Number(data.value) || 0) - (custoBotijao * (Number(data.gasCanistersQuantity) || 0)),
      custo_botijao: custoBotijao, // Save the cost price used for this sale
    };

    // --- Create or Update Sale Doc ---
    const saleDocRef = editingSaleId ? doc(db, 'sales', editingSaleId) : doc(collection(db, 'sales'));
    if (editingSaleId) {
      batch.update(saleDocRef, { ...saleDataForFirestore, updatedAt: serverTimestamp() });
    } else {
      batch.set(saleDocRef, { ...saleDataForFirestore, createdAt: serverTimestamp() });
    }
    const saleId = saleDocRef.id;

    // --- Handle Stock Movement ---
    if (data.subtractFromStock && saleId && saleDataForFirestore.gasCanistersQuantity > 0) {
      const stockMovementRef = doc(collection(db, 'stockMovements'));
      const stockMovementPayload: Omit<StockMovementEntry, 'id' | 'createdAt'> & { createdAt: any } = {
        type: 'OUTPUT',
        origin: 'Venda',
        quantity: saleDataForFirestore.gasCanistersQuantity,
        notes: `Saída automática por venda ID: ${saleId}`,
        relatedSaleId: saleId,
        createdAt: serverTimestamp()
      };
      batch.set(stockMovementRef, stockMovementPayload);
    }
    
    // --- Handle Defaults (Pending Payments) ---
    const defaultsQuery = query(collection(db, "defaults"), where("saleId", "==", saleId), limit(1));
    const defaultsSnapshot = await getDocs(defaultsQuery);
    const existingDefaultDoc = defaultsSnapshot.docs.length > 0 ? defaultsSnapshot.docs[0] : null;

    if (saleDataForFirestore.status === 'Pending' && saleDataForFirestore.paymentDueDate) {
      const defaultPayload: Omit<DefaultEntry, 'id' | 'createdAt' | 'updatedAt' | 'dueDate'> & { dueDate: Timestamp; createdAt?: any; updatedAt?: any} = {
        customerId: saleDataForFirestore.customerId,
        customerName: saleDataForFirestore.customerName,
        value: saleDataForFirestore.value,
        dueDate: saleDataForFirestore.paymentDueDate,
        paymentStatus: 'Pending', 
        saleId: saleId,
      };
      if (existingDefaultDoc) {
        batch.update(existingDefaultDoc.ref, { ...defaultPayload, updatedAt: serverTimestamp() });
      } else {
        const newDefaultRef = doc(collection(db, 'defaults'));
        batch.set(newDefaultRef, { ...defaultPayload, createdAt: serverTimestamp() });
      }
    } else if (existingDefaultDoc) {
      if (saleDataForFirestore.status === 'Paid') {
        batch.update(existingDefaultDoc.ref, { paymentStatus: 'Paid', updatedAt: serverTimestamp() });
      } else {
        batch.delete(existingDefaultDoc.ref);
      }
    }
    
    // Commit all batched writes
    await batch.commit();

    // Revalidate relevant pages
    revalidatePath('/sales');
    revalidatePath('/stock');
    revalidatePath('/');
    revalidatePath('/defaults');
    revalidatePath('/cash-closing');
    revalidatePath('/cash-closing-history');

    return { success: true };

  } catch (e: unknown) {
    console.error('Error saving sale:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao salvar venda.';
    return { success: false, error: errorMessage };
  }
}


export async function deleteSale(saleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    const saleRef = doc(db, 'sales', saleId);
    batch.delete(saleRef);

    const defaultsQuery = query(collection(db, "defaults"), where("saleId", "==", saleId), limit(1));
    const defaultsSnapshot = await getDocs(defaultsQuery);
    if (!defaultsSnapshot.empty) {
      const defaultDocRef = defaultsSnapshot.docs[0].ref;
      batch.delete(defaultDocRef);
    }
    
    // Note: This does not automatically revert the stock movement for simplicity.
    // That would require finding the related stock movement and creating a new 'INPUT' movement to cancel it.
    // For now, deleting a sale requires a manual stock adjustment if needed.
    
    await batch.commit();

    revalidatePath('/sales');
    revalidatePath('/defaults');
    revalidatePath('/');
    revalidatePath('/cash-closing');
    revalidatePath('/cash-closing-history');
    
    return { success: true };
  } catch (e: unknown) {
    console.error('Error deleting sale:', e);
    const errorMessage = e instanceof Error ? e.message : 'Falha ao excluir venda.';
    return { success: false, error: errorMessage };
  }
}

    