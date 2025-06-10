
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
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

interface SystemUser {
  id: string;
  name: string;
  email: string;
  accessLevel: "Admin" | "Usuário";
}

const initialUsersData: SystemUser[] = [
  { id: "u1", name: "Administrador Master", email: "admin@vendafacil.com", accessLevel: "Admin" },
  { id: "u2", name: "Usuário Padrão", email: "user@vendafacil.com", accessLevel: "Usuário" },
];

const accessLevelsOptions: SystemUser["accessLevel"][] = ["Admin", "Usuário"];

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>(initialUsersData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); 

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
        setUsers(prev => prev.filter(u => u.id !== id));
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
          // Verifica se o email está sendo alterado e se o novo email já existe (excluindo o usuário atual)
          if (formData.email.toLowerCase() !== editingUser.email.toLowerCase()) {
            const emailExists = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase() && u.id !== editingUser.id);
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
          setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
          toast({ title: "Usuário Atualizado!", description: "Os dados do usuário foram atualizados." });
        } else {
          // Verifica se o email já existe para novo usuário
          const emailExists = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
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
          setUsers(prev => [...prev, newUser]);
          toast({ title: "Usuário Adicionado!", description: "Novo usuário cadastrado com sucesso." });
        }
        setIsFormOpen(false);
        setIsSubmitting(false);
    }, 1000);
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

      <Card>
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
              {users.map((user) => (
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
          {users.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum usuário cadastrado.</p>}
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
    </div>
  );
}
