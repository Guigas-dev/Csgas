
"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Loader2, ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { revalidateStockRelatedPages, updateStockMovement, deleteStockMovement } from "./actions";
import { useAuth } from "@/contexts/auth-context";

const movementOrigins = ["Manual", "Ajuste", "Perda"]; // "Venda" is handled automatically
const ITEMS_PER_PAGE = 10;

export default function StockPage() {
  const [allStockMovementsCache, setAllStockMovementsCache] = useState<StockMovementEntry[]>([]);
  const [paginatedStockMovements, setPaginatedStockMovements] = useState<StockMovementEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovementEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const initialFormData: StockMovementFormData = useMemo(() => ({
    type: 'INPUT',
    origin: 'Manual',
    quantity: 1, 
    notes: '',
  }), []);
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
      setAllStockMovementsCache(movementsData);
      setCurrentPage(1);
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
  }, [toast]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedStockMovements(allStockMovementsCache.slice(startIndex, endIndex));
  }, [allStockMovementsCache, currentPage]);

  const totalPages = Math.ceil(allStockMovementsCache.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };
  
  const currentStockLevel = allStockMovementsCache.reduce((acc, mov) => {
    return mov.type === "INPUT" ? acc + mov.quantity : acc - mov.quantity;
  }, 0);

  const handleOpenForm = (type: "INPUT" | "OUTPUT", movementToEdit?: StockMovementEntry) => {
    if (movementToEdit) {
      if (movementToEdit.origin === 'Venda' || movementToEdit.relatedSaleId) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Movimentações geradas por vendas não podem ser editadas diretamente." });
        return;
      }
      setEditingMovement(movementToEdit);
      setFormData({
        type: movementToEdit.type, // Type is not editable for existing entries
        origin: movementToEdit.origin,
        quantity: movementToEdit.quantity,
        notes: movementToEdit.notes || '',
        relatedSaleId: movementToEdit.relatedSaleId,
      });
    } else {
      setEditingMovement(null);
      setFormData({ ...initialFormData, type, quantity: 1, notes: '' }); 
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    const payload: StockMovementFormData = {
      ...formData,
      quantity: parseInt(String(formData.quantity)) || 0,
    };

    try {
      if (editingMovement) {
        // For updates, we only send editable fields. Type and relatedSaleId are not editable.
        const updatePayload = { 
          origin: payload.origin, 
          quantity: payload.quantity, 
          notes: payload.notes 
        };
        const result = await updateStockMovement(editingMovement.id, updatePayload);
        if (result.success) {
          toast({ title: "Movimentação Atualizada!", description: "A movimentação de estoque foi atualizada." });
        } else {
          throw new Error(result.error || "Falha ao atualizar movimentação.");
        }
      } else {
        await addDoc(collection(db, 'stockMovements'), {
          ...payload, // This includes type and relatedSaleId (which would be undefined for new manual entries)
          createdAt: serverTimestamp(),
        });
        toast({ title: "Movimentação Registrada!", description: "A movimentação de estoque foi adicionada." });
      }
      setIsFormOpen(false);
      setEditingMovement(null);
      await revalidateStockRelatedPages();
      fetchStockMovements();
    } catch (error: unknown) {
      console.error('Error saving stock movement:', error);
      let errorMessage = 'Falha ao salvar movimentação de estoque.';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ variant: "destructive", title: "Erro ao Salvar", description: errorMessage });
    }
    setIsSubmitting(false);
  };

  const handleDeleteMovement = async (movementId: string, origin?: string, relatedSaleId?: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para esta ação." });
      return;
    }
     if (origin === 'Venda' || relatedSaleId) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Movimentações geradas por vendas não podem ser excluídas diretamente." });
        return;
      }
    if (!confirm("Tem certeza que deseja excluir esta movimentação de estoque?")) return;

    setIsSubmitting(true);
    try {
      const result = await deleteStockMovement(movementId);
      if (result.success) {
        toast({ title: "Movimentação Excluída!", description: "O registro foi removido com sucesso." });
        await revalidateStockRelatedPages();
        fetchStockMovements();
      } else {
        throw new Error(result.error || "Falha ao excluir movimentação.");
      }
    } catch (error: unknown) {
      console.error('Error deleting stock movement:', error);
      let errorMessage = 'Falha ao excluir movimentação de estoque.';
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ variant: "destructive", title: "Erro ao Excluir", description: errorMessage });
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
            <Button onClick={() => handleOpenForm("INPUT")} className="bg-success hover:bg-success/90 text-success-foreground" disabled={isSubmitting || isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Entrada Manual
            </Button>
            <Button onClick={() => handleOpenForm("OUTPUT")} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting || isLoading}>
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Ref. Venda</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStockMovements.map((mov) => {
                    const isSaleGenerated = mov.origin === 'Venda' || !!mov.relatedSaleId;
                    return (
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
                        <TableCell className="max-w-[150px] truncate" title={mov.notes || undefined}>{mov.notes || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenForm(mov.type, mov)} 
                            className="hover:text-accent" 
                            disabled={isSubmitting || isSaleGenerated}
                            title={isSaleGenerated ? "Não editável (gerado por venda)" : "Editar"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteMovement(mov.id, mov.origin, mov.relatedSaleId)} 
                            className="hover:text-destructive" 
                            disabled={isSubmitting || isSaleGenerated}
                            title={isSaleGenerated ? "Não excluível (gerado por venda)" : "Excluir"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {!isLoading && paginatedStockMovements.length === 0 && allStockMovementsCache.length > 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma movimentação encontrada para esta página.</p>
              )}
              {!isLoading && allStockMovementsCache.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma movimentação de estoque registrada.</p>
              )}
              {!isLoading && totalPages > 0 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isSubmitting}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) { setIsFormOpen(open); if (!open) setEditingMovement(null); }}}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">
              {editingMovement ? `Editar Movimentação (${formData.type})` : `Registrar Movimentação Manual (${formData.type})`}
            </SheetTitle>
            <SheetDescription>
              {editingMovement ? "Atualize os detalhes da movimentação." : "Preencha os detalhes da nova movimentação de estoque."}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <form onSubmit={handleFormSubmit} id="stock-form" className="py-4 pr-6 space-y-4">
              {/* Type is not editable directly here; it's set when opening the form */}
              <input type="hidden" value={formData.type} />

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
                <Select 
                  value={formData.origin} 
                  onValueChange={val => setFormData({...formData, origin: val})} 
                  disabled={isSubmitting || !!editingMovement?.relatedSaleId || formData.origin === 'Venda'} // Cannot change origin if it was a sale
                >
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Origem da movimentação" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* If editing a sale-generated movement, only show its origin (Venda), otherwise show manual origins */}
                    {(editingMovement?.relatedSaleId || formData.origin === 'Venda') ? (
                      <SelectItem value="Venda">Venda (Automática)</SelectItem>
                    ) : (
                      movementOrigins.map(orig => <SelectItem key={orig} value={orig}>{orig}</SelectItem>)
                    )}
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
            </form>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </SheetClose>
            <Button type="submit" form="stock-form" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingMovement ? "Salvar Alterações" : "Registrar")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
