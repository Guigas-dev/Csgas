
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Eye, EyeOff, Loader2, ChevronLeft, ChevronRight, AlertTriangle, DatabaseZap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { clearFirestoreCollection, type ClearableCollectionName } from "./actions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";


interface SystemUser {
  id: string;
  name: string;
  email: string;
  accessLevel: "Admin" | "Usuário";
}

const initialUsersData: SystemUser[] = [
  { id: "u1", name: "Administrador Master", email: "admin@vendafacil.com", accessLevel: "Admin" },
  { id: "u2", name: "Usuário Padrão", email: "user@vendafacil.com", accessLevel: "Usuário" },
  { id: "u3", name: "Ana Silva", email: "ana.silva@example.com", accessLevel: "Usuário" },
  { id: "u4", name: "Bruno Costa", email: "bruno.costa@example.com", accessLevel: "Admin" },
  { id: "u5", name: "Carla Dias", email: "carla.dias@example.com", accessLevel: "Usuário" },
  { id: "u6", name: "Daniel Faria", email: "daniel.faria@example.com", accessLevel: "Usuário" },
  { id: "u7", name: "Eduarda Lima", email: "eduarda.lima@example.com", accessLevel: "Admin" },
  { id: "u8", name: "Fábio Melo", email: "fabio.melo@example.com", accessLevel: "Usuário" },
  { id: "u9", name: "Gabriela Nogueira", email: "gabriela.nogueira@example.com", accessLevel: "Usuário" },
  { id: "u10", name: "Hugo Santos", email: "hugo.santos@example.com", accessLevel: "Admin" },
  { id: "u11", name: "Isabela Ribeiro", email: "isabela.ribeiro@example.com", accessLevel: "Usuário" },
  { id: "u12", name: "João Pedro Alves", email: "joao.alves@example.com", accessLevel: "Usuário" },
];

const accessLevelsOptions: SystemUser["accessLevel"][] = ["Admin", "Usuário"];
const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<SystemUser[]>(initialUsersData);
  const [paginatedUsers, setPaginatedUsers] = useState<SystemUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();

  const initialFormState = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    accessLevel: "Usuário" as SystemUser["accessLevel"],
  };
  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [collectionToClear, setCollectionToClear] = useState<ClearableCollectionName | null>(null);
  const [isClearingData, setIsClearingData] = useState(false);


  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedUsers(allUsers.slice(startIndex, endIndex));
  }, [allUsers, currentPage]);

  const totalPages = Math.ceil(allUsers.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData(initialFormState);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      confirmPassword: "",
      accessLevel: user.accessLevel,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFormOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (id === "u1") {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Não é possível excluir o administrador principal.",
      });
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
        setAllUsers(prev => {
          const updatedUsers = prev.filter(u => u.id !== id);
          const newTotalPages = Math.ceil(updatedUsers.length / ITEMS_PER_PAGE);
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
          } else if (newTotalPages === 0) {
            setCurrentPage(1);
          }
          return updatedUsers;
        });
        toast({ title: "Usuário Removido!", description: "O registro do usuário foi removido." });
        setIsSubmitting(false);
    }, 500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.password !== formData.confirmPassword && (!editingUser || formData.password)) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "As senhas não coincidem.",
      });
      setIsSubmitting(false);
      return;
    }
    if (!editingUser && !formData.password) {
        toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "O campo senha é obrigatório para novos usuários.",
      });
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
        if (editingUser) {
          if (formData.email.toLowerCase() !== editingUser.email.toLowerCase()) {
            const emailExists = allUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser.id);
            if (emailExists) {
              toast({
                variant: "destructive",
                title: "Erro ao Atualizar",
                description: "Este email já está em uso por outro usuário.",
              });
              setIsSubmitting(false);
              return;
            }
          }
          const updatedUser = {
             ...editingUser,
            name: formData.name,
            email: formData.email,
            accessLevel: formData.accessLevel,
          };
          setAllUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
          toast({ title: "Usuário Atualizado!", description: "Os dados do usuário foram atualizados." });
        } else {
          const emailExists = allUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
          if (emailExists) {
            toast({
              variant: "destructive",
              title: "Erro ao Adicionar",
              description: "Este email já está cadastrado.",
            });
            setIsSubmitting(false);
            return;
          }
          const newUser: SystemUser = {
            id: String(Date.now()),
            name: formData.name,
            email: formData.email,
            accessLevel: formData.accessLevel,
          };
          setAllUsers(prev => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)));
          toast({ title: "Usuário Adicionado!", description: "Novo usuário cadastrado com sucesso." });
        }
        setIsFormOpen(false);
        setIsSubmitting(false);
    }, 1000);
  };

  const openClearConfirmationDialog = (collectionName: ClearableCollectionName) => {
    setCollectionToClear(collectionName);
    setIsAlertDialogOpen(true);
  };

  const handleConfirmClearData = async () => {
    if (!collectionToClear) return;

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para limpar os dados.",
      });
      setIsAlertDialogOpen(false);
      return;
    }

    setIsClearingData(true);
    const result = await clearFirestoreCollection(collectionToClear);

    if (result.success) {
      toast({ title: "Dados Limpos!", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Erro ao Limpar Dados", description: result.message });
    }

    setIsAlertDialogOpen(false);
    setIsClearingData(false);
    setCollectionToClear(null);
  };

  const getCollectionDisplayName = (collectionName: ClearableCollectionName | null): string => {
    if (!collectionName) return "";
    switch (collectionName) {
        case "customers": return "Clientes";
        case "sales": return "Vendas";
        case "defaults": return "Inadimplências";
        case "stockMovements": return "Movimentações de Estoque";
        default: return collectionName;
    }
  };


  return (
    <div>
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Adicione, edite ou remova usuários do sistema."
        actions={
          <Button onClick={handleAddUser} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${user.accessLevel === "Admin" ? "bg-primary/20 text-primary font-medium" : "bg-muted text-muted-foreground"}`}>
                      {user.accessLevel}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} className="hover:text-accent" disabled={isSubmitting}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)} className="hover:text-destructive" disabled={user.id === 'u1' || isSubmitting}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {paginatedUsers.length === 0 && allUsers.length > 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum usuário encontrado para esta página.</p>
          )}
          {allUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhum usuário cadastrado.</p>
          )}
          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
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
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFormOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormOpen(open); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</SheetTitle>
            <SheetDescription>
              {editingUser ? 'Atualize os dados do usuário.' : 'Preencha os dados do novo usuário.'}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <form onSubmit={handleFormSubmit} id="user-form" className="py-4 pr-6 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="userName" className="text-muted-foreground">Nome</Label>
                <Input id="userName" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="userEmail" className="text-muted-foreground">Email</Label>
                <Input id="userEmail" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-input text-foreground" required disabled={isSubmitting}/>
              </div>
              <div className="space-y-1 relative">
                <Label htmlFor="userPassword" className="text-muted-foreground">Senha {editingUser ? "(Deixe em branco para não alterar)" : ""}</Label>
                <Input
                  id="userPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="bg-input text-foreground pr-10"
                  required={!editingUser}
                  placeholder={editingUser ? "Nova senha (opcional)" : "Senha obrigatória"}
                  disabled={isSubmitting}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1 relative">
                <Label htmlFor="userConfirmPassword" className="text-muted-foreground">Confirmar Senha</Label>
                <Input
                  id="userConfirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="bg-input text-foreground pr-10"
                  required={!editingUser || (!!formData.password)}
                  placeholder={editingUser && !formData.password ? "Confirme a nova senha (se alterada)" : "Confirme a senha"}
                  disabled={isSubmitting}
                />
                 <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isSubmitting}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="accessLevel" className="text-muted-foreground">Nível de Acesso</Label>
                <Select value={formData.accessLevel} onValueChange={(val: SystemUser["accessLevel"]) => setFormData({...formData, accessLevel: val})} disabled={isSubmitting}>
                  <SelectTrigger className="w-full bg-input text-foreground">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevelsOptions.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </form>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </SheetClose>
            <Button type="submit" form="user-form" className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingUser ? 'Salvar Alterações' : 'Adicionar Usuário')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DatabaseZap className="mr-2 h-5 w-5 text-destructive" />
            Ferramentas de Limpeza de Dados
          </CardTitle>
          <CardDescription>
            Use estas ferramentas com <strong className="text-destructive">extremo cuidado</strong>. A exclusão de dados é <strong className="text-destructive">permanente</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Abaixo você pode limpar todos os registros de coleções específicas no banco de dados. Esta ação não pode ser desfeita.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="destructive"
              onClick={() => openClearConfirmationDialog("customers")}
              disabled={isClearingData}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpar Clientes
            </Button>
            <Button
              variant="destructive"
              onClick={() => openClearConfirmationDialog("sales")}
              disabled={isClearingData}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpar Vendas
            </Button>
            <Button
              variant="destructive"
              onClick={() => openClearConfirmationDialog("defaults")}
              disabled={isClearingData}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpar Inadimplências
            </Button>
            <Button
              variant="destructive"
              onClick={() => openClearConfirmationDialog("stockMovements")}
              disabled={isClearingData}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpar Mov. Estoque
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              Confirmar Exclusão de Dados
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir <strong className="text-destructive">todos os registros</strong> da coleção de <strong className="text-destructive">{getCollectionDisplayName(collectionToClear)}</strong>?
              Esta ação é <strong className="text-destructive">permanente</strong> e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingData}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearData}
              disabled={isClearingData}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              {isClearingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sim, Excluir Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    
