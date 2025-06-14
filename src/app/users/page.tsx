
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Eye, EyeOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context"; // For checking current logged-in user, if needed for restrictions
import {
  fetchAppUsers,
  addAppUser,
  updateAppUser,
  deleteAppUser,
  type AppUser,
  type AppUserFormData,
} from "./actions";

const accessLevelsOptions: AppUser["accessLevel"][] = ["Admin", "Usuário"];
const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [paginatedUsers, setPaginatedUsers] = useState<AppUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser: loggedInUser } = useAuth(); // Get the currently logged-in Firebase Auth user

  const initialFormState: AppUserFormData & { password?: string; confirmPassword?: string } = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    accessLevel: "Usuário",
  };
  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const users = await fetchAppUsers();
    setAllUsers(users);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  const handleEditUser = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Password fields are for change only
      confirmPassword: "",
      accessLevel: user.accessLevel,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!loggedInUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para excluir usuários." });
      return;
    }
    // Prevent logged in admin from deleting themselves
    if (loggedInUser.email === userToDelete.email && userToDelete.accessLevel === "Admin") {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta de administrador.",
      });
      return;
    }
    // Prevent deleting the last admin user
    const adminUsers = allUsers.filter(u => u.accessLevel === "Admin");
    if (userToDelete.accessLevel === "Admin" && adminUsers.length <= 1) {
       toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Não é possível excluir o único administrador do sistema.",
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário ${userToDelete.name}?`)) return;

    setIsSubmitting(true);
    const result = await deleteAppUser(userToDelete.id);
    if (result.success) {
      toast({ title: "Usuário Removido!", description: "O registro do usuário foi removido." });
      await loadUsers(); // Re-fetch users
       // Adjust current page if necessary after deletion
      const newTotalPages = Math.ceil((allUsers.length - 1) / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalPages === 0 || allUsers.length -1 === 0) {
        setCurrentPage(1);
      }
    } else {
      toast({ variant: "destructive", title: "Erro ao Remover", description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!loggedInUser) {
      toast({ variant: "destructive", title: "Não autenticado", description: "Faça login para gerenciar usuários." });
      setIsSubmitting(false);
      return;
    }

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
    // Password handling for actual Firebase Auth users would be different (e.g., using Admin SDK or specific Firebase Auth functions)
    // For this app_users collection, we are not storing passwords. This form is for app-level user roles.
    // The password fields here are more of a UI placeholder if this were tied to Firebase Auth user creation.

    const userPayload: AppUserFormData = {
      name: formData.name,
      email: formData.email,
      accessLevel: formData.accessLevel,
    };

    let result;
    if (editingUser) {
      // Prevent logged in admin from demoting themselves if they are the last admin
      if (loggedInUser.email === editingUser.email && editingUser.accessLevel === "Admin" && userPayload.accessLevel === "Usuário") {
        const adminUsers = allUsers.filter(u => u.accessLevel === "Admin");
        if (adminUsers.length <= 1) {
          toast({
            variant: "destructive",
            title: "Ação não permitida",
            description: "Não é possível remover o status de administrador do único administrador.",
          });
          setIsSubmitting(false);
          return;
        }
      }
      result = await updateAppUser(editingUser.id, userPayload);
    } else {
      result = await addAppUser(userPayload);
    }

    if (result.success) {
      toast({ title: editingUser ? "Usuário Atualizado!" : "Usuário Adicionado!", description: `Os dados do usuário foram ${editingUser ? 'atualizados' : 'cadastrados'}.` });
      setIsFormOpen(false);
      await loadUsers(); // Re-fetch users
    } else {
      toast({ variant: "destructive", title: editingUser ? "Erro ao Atualizar" : "Erro ao Adicionar", description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Adicione, edite ou remova usuários do sistema."
        actions={
          <Button onClick={handleAddUser} className="bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting || isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Usuário
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : (
            <>
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
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)} className="hover:text-destructive" disabled={isSubmitting || (loggedInUser?.email === user.email && user.accessLevel === "Admin")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isLoading && paginatedUsers.length === 0 && allUsers.length > 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhum usuário encontrado para esta página.</p>
              )}
              {!isLoading && allUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhum usuário cadastrado. Clique em "Adicionar Usuário" para começar.</p>
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
                  value={formData.password || ""}
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
                  value={formData.confirmPassword || ""}
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
                <Select value={formData.accessLevel} onValueChange={(val: AppUser["accessLevel"]) => setFormData({...formData, accessLevel: val})} disabled={isSubmitting}>
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
    </div>
  );
}
    
