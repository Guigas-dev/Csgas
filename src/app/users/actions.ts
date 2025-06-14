
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  accessLevel: "Admin" | "Usuário";
  // createdAt and updatedAt can be added if needed
}

export interface AppUserFormData {
  name: string;
  email: string;
  accessLevel: "Admin" | "Usuário";
  // password is not stored in Firestore user profile directly by this system
}

const USERS_COLLECTION = 'app_users';

export async function fetchAppUsers(): Promise<AppUser[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<AppUser, 'id'>),
    }));
  } catch (error) {
    console.error('Error fetching app users:', error);
    return [];
  }
}

export async function addAppUser(userData: AppUserFormData): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Check for existing email before adding
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', userData.email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, error: 'Este email já está cadastrado.' };
    }

    const docRef = await addDoc(collection(db, USERS_COLLECTION), {
      ...userData,
      email: userData.email.toLowerCase(), // Store email in lowercase for consistency
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    revalidatePath('/users');
    return { success: true, userId: docRef.id };
  } catch (error) {
    console.error('Error adding app user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao adicionar usuário.' };
  }
}

export async function updateAppUser(id: string, userData: Partial<AppUserFormData>): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, USERS_COLLECTION, id);
    
    // If email is being changed, check if the new email already exists for another user
    if (userData.email) {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', userData.email.toLowerCase())
      );
      const querySnapshot = await getDocs(q);
      const existingUser = querySnapshot.docs.find(docSnap => docSnap.id !== id);
      if (existingUser) {
        return { success: false, error: 'Este email já está em uso por outro usuário.' };
      }
      userData.email = userData.email.toLowerCase();
    }

    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    });
    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    console.error('Error updating app user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao atualizar usuário.' };
  }
}

export async function deleteAppUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic check: prevent deleting the main admin if it's identifiable
    // This is a placeholder; a more robust check might involve roles or specific UIDs.
    // For now, we assume the client side handles critical user deletion prevention.
    // Example: if (userEmail === 'admin@vendafacil.com' && numAdmins === 1) return { error: 'Cannot delete the only admin.'}

    const userRef = doc(db, USERS_COLLECTION, id);
    await deleteDoc(userRef);
    revalidatePath('/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting app user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Falha ao excluir usuário.' };
  }
}
