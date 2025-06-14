
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Flame } from "lucide-react"; // Added Flame
import { useAuth } from "@/contexts/auth-context";

const CSGASLogoFull = () => (
  <div className="flex items-center justify-center mb-6">
    <Flame className="text-primary mr-3 h-12 w-12" /> {/* Replaced SVG with Flame icon */}
    <h1 className="text-3xl font-bold text-foreground font-headline">CS GAS</h1>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, signInWithEmail, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("admin@vendafacil.com");
  const [password, setPassword] = useState("password");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (currentUser) {
      router.push("/"); 
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await signInWithEmail(email, password);

    if (result.success) {
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o dashboard...",
      });
      router.push("/"); 
    } else {
      let errorMessage = "Email ou senha inválidos.";
      if (result.error) {
        switch (result.error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Email ou senha inválidos.";
            break;
          case 'auth/invalid-email':
            errorMessage = "O formato do email é inválido.";
            break;
          default:
            errorMessage = `Ocorreu um erro ao tentar fazer login. ${result.error?.message ? `Detalhe: ${result.error.message}` : ''}`;
            break;
        }
      }
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: errorMessage,
      });
    }
    setIsSubmitting(false);
  };

  if (authLoading || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl bg-card border-border/30">
      <CardHeader className="text-center">
        <CSGASLogoFull />
        <CardTitle className="text-2xl text-foreground">Acesse sua conta</CardTitle>
        <CardDescription>Bem-vindo de volta! Faça login para continuar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input text-foreground"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
              <Link href="#" className="text-sm text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input text-foreground pr-10"
                disabled={isSubmitting}
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember-me" 
                checked={rememberMe} 
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                disabled={isSubmitting}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">Lembrar-me</Label>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isSubmitting || authLoading}>
            {isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6 border-t border-border/20 mt-6">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link href="#" className="text-primary hover:underline">
            Crie uma agora
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
