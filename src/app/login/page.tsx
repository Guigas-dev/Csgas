
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const VendaFacilLogoFull = () => (
  <div className="flex items-center justify-center mb-6">
    <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary mr-3">
      <defs>
        <linearGradient id="gradLogin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: "hsl(var(--primary))", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor: "hsl(var(--accent))", stopOpacity:1}} />
        </linearGradient>
      </defs>
      <path fill="url(#gradLogin)" d="M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z M50 15 L85 32.5 V 67.5 L50 85 L15 67.5 V 32.5 Z"></path>
      <text x="50" y="62" fontSize="40" fill="hsl(var(--primary-foreground))" textAnchor="middle" fontWeight="bold" className="font-headline">V</text>
    </svg>
    <h1 className="text-3xl font-bold text-foreground font-headline">VendaFacil</h1>
  </div>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@vendafacil.com"); // Default for convenience
  const [password, setPassword] = useState("password"); // Default for convenience
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock authentication
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);

    if (email === "admin@vendafacil.com" && password === "password") {
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o dashboard...",
      });
      router.push("/"); // Redirect to dashboard
    } else {
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: "Email ou senha inválidos.",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl bg-card border-border/30">
      <CardHeader className="text-center">
        <VendaFacilLogoFull />
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
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
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
              />
              <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">Lembrar-me</Label>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary-hover-bg text-primary-foreground" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
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
