
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, ArrowRightLeft } from "lucide-react";
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

// Dummy data
const initialStockMovements = [
  { id: "sm1", type: "INPUT", origin: "Manual", date: new Date(2024, 6, 10, 10, 0), quantity: 50, notes: "Compra inicial" },
  { id: "sm2", type: "OUTPUT", origin: "Sale", date: new Date(2024, 6, 15, 14, 30), quantity: 1, relatedSaleId: "s1", notes: "" },
  { id: "sm3", type: "OUTPUT", origin: "Sale", date: new Date(2024, 6, 14, 11, 15), quantity: 2, relatedSaleId: "s2", notes: "" },
];

const movementTypes = ["INPUT", "OUTPUT"];
const movementOrigins = ["Manual", "Sale", "Adjustment", "Loss"];


export default function StockPage() {
  const [stockMovements, setStockMovements] = useState(initialStockMovements);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentMovementType, setCurrentMovementType] = useState<"INPUT" | "OUTPUT">("INPUT");
  
  const initialFormData = {
    type: 'INPUT' as "INPUT" | "OUTPUT",
    origin: 'Manual',
    quantity: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);

  const currentStockLevel = stockMovements.reduce((acc, mov) => {
    return mov.type === "INPUT" ? acc + mov.quantity : acc - mov.quantity;
  }, 0);

  const handleOpenForm = (type: "INPUT" | "OUTPUT") => {
    setCurrentMovementType(type);
    setFormData({ ...initialFormData, type });
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMovement = {
      id: String(Date.now()),
      type: formData.type,
      origin: formData.origin,
      date: new Date(),
      quantity: parseInt(formData.quantity) || 0,
      notes: formData.notes,
    };
    setStockMovements(prev => [newMovement, ...prev].sort((a,b) => b.date.getTime() - a.date.getTime()));
    setIsFormOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Controle de Estoque"
        description="Monitore o nível e a movimentação de botijões de gás."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => handleOpenForm("INPUT")} className="bg-success hover:bg-success/90 text-success-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Entrada Manual
            </Button>
            <Button onClick={() => handleOpenForm("OUTPUT")} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <MinusCircle className="mr-2 h-4 w-4" /> Saída Manual
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Nível Atual do Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{currentStockLevel} unidades</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${mov.type === "INPUT" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                      {mov.type === "INPUT" ? "Entrada" : "Saída"}
                    </span>
                  </TableCell>
                  <TableCell>{mov.origin}</TableCell>
                  <TableCell>{format(mov.date, "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{mov.quantity}</TableCell>
                  <TableCell>{mov.relatedSaleId || "N/A"}</TableCell>
                  <TableCell>{mov.notes || "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {stockMovements.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma movimentação de estoque registrada.</p>}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
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
                  onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  className="bg-input text-foreground" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="origin" className="text-muted-foreground">Origem</Label>
                <Select value={formData.origin} onValueChange={val => setFormData({...formData, origin: val})}>
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Origem da movimentação" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementOrigins.map(orig => <SelectItem key={orig} value={orig}>{orig}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-muted-foreground">Observações</Label>
                <Input 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="bg-input text-foreground" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
