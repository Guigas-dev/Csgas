
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import type { StockMovementEntry, StockMovementFormData } from "./actions";
import { revalidateStockRelatedPages } from "./actions";

const movementOrigins = ["Manual", "Venda", "Ajuste", "Perda"];

export default function StockPage() {
  const [stockMovements, setStockMovements] = useState<StockMovementEntry[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  // currentMovementType is handled by formData.type
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const initialFormData: StockMovementFormData = {
    type: 'INPUT',
    origin: 'Manual',
    quantity: 0,
    notes: '',
  };
  const [formData, setFormData] = useState<StockMovementFormData>(initialFormData);

  const fetchStockMovements = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "stockMovements"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const movementsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt as Timestamp,
        } as StockMovementEntry;
      });
      setStockMovements(movementsData);
    } catch (error) {
      console.error("Error fetching stock movements: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar movimentações",
        description: "Não foi possível carregar o histórico de estoque.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStockMovements();
  }, [toast]); // Removed fetchStockMovements from dependencies

  const currentStockLevel = stockMovements.reduce((acc, mov) => {
    return mov.type === "INPUT" ? acc + mov.quantity : acc - mov.quantity;
  }, 0);

  const handleOpenForm = (type: "INPUT" | "OUTPUT") => {
    setFormData({ ...initialFormData, type, quantity: 1, notes: '' }); 
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Omit<StockMovementEntry, 'id' | 'createdAt'> = {
      ...formData,
      quantity: parseInt(String(formData.quantity)) || 0,
    };

    try {
      await addDoc(collection(db, 'stockMovements'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Movimentação Registrada!", description: "A movimentação de estoque foi adicionada." });
      setIsFormOpen(false);
      await revalidateStockRelatedPages();
      fetchStockMovements();
    } catch (error: unknown) {
      console.error('Error adding stock movement:', error);
      let errorMessage = 'Falha ao registrar movimentação de estoque.';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ variant: "destructive", title: "Erro ao Registrar", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <PageHeader
        title="Controle de Estoque"
        description="Monitore o nível e a movimentação de botijões de gás."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => handleOpenForm("INPUT")} className="bg-success hover:bg-success/90 text-success-foreground" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> Entrada Manual
            </Button>
            <Button onClick={() => handleOpenForm("OUTPUT")} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              <MinusCircle className="mr-2 h-4 w-4" /> Saída Manual
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Nível Atual do Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando nível...</p>
            </div>
          ) : (
            <p className="text-3xl font-bold text-primary">{currentStockLevel} unidades</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Ref. Venda</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockMovements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${mov.type === "INPUT" ? "bg-success/80 text-success-foreground" : "bg-destructive/80 text-destructive-foreground"}`}>
                        {mov.type === "INPUT" ? "Entrada" : "Saída"}
                      </span>
                    </TableCell>
                    <TableCell>{mov.origin}</TableCell>
                    <TableCell>{format(mov.createdAt.toDate(), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>{mov.quantity}</TableCell>
                    <TableCell>{mov.relatedSaleId || "N/A"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={mov.notes}>{mov.notes || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           {(!isLoading && stockMovements.length === 0) && <p className="text-center text-muted-foreground py-4">Nenhuma movimentação de estoque registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Registrar Movimentação Manual ({formData.type === "INPUT" ? "Entrada" : "Saída"})
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes da movimentação de estoque.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="quantity" className="text-muted-foreground">Quantidade</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
                  className="bg-input text-foreground" 
                  required 
                  min="1"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="origin" className="text-muted-foreground">Origem</Label>
                <Select value={formData.origin} onValueChange={val => setFormData({...formData, origin: val})} disabled={isSubmitting}>
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Origem da movimentação" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementOrigins.filter(o => o !== "Venda").map(orig => <SelectItem key={orig} value={orig}>{orig}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-muted-foreground">Observações</Label>
                <Input 
                  id="notes" 
                  value={formData.notes || ""} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="bg-input text-foreground" 
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
