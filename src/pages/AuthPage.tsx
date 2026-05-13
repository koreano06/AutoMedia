import { FormEvent, useState } from 'react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    store_name: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(loginForm.username, loginForm.password);
      toast.success('Bem-vindo de volta!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (registerForm.password.length < 8) {
      toast.error('Use uma senha com pelo menos 8 caracteres.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: registerForm.name,
        username: registerForm.username,
        store_name: registerForm.store_name,
        password: registerForm.password,
      });
      toast.success('Usuário criado com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-[430px]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <Zap className="h-5 w-5" fill="currentColor" />
            </div>
            <h1 className="font-syne text-3xl font-bold tracking-tight">AutoMedia</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre para gerenciar seus produtos, vídeos e publicações.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-xl shadow-black/[0.06] sm:p-7">
            <div className="mb-6">
              <p className="font-syne text-2xl font-bold tracking-tight">
                {mode === 'login' ? 'Entrar no painel' : 'Criar usuário'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'login'
                  ? 'Use seu nome de usuário e senha.'
                  : 'Crie um acesso para operar o painel.'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
              {[
                { id: 'login', label: 'Entrar' },
                { id: 'register', label: 'Criar conta' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id as AuthMode)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                    mode === item.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {mode === 'login' ? (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <Label htmlFor="login-username">Nome de usuário</Label>
                  <Input
                    id="login-username"
                    value={loginForm.username}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, username: event.target.value }))
                    }
                    className="mt-1.5 h-11"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, password: event.target.value }))
                    }
                    className="mt-1.5 h-11"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Acesso inicial:</span> admin / admin123
                </div>
                <Button className="h-11 w-full gap-2" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div>
                  <Label htmlFor="register-name">Nome</Label>
                  <Input
                    id="register-name"
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="mt-1.5 h-11"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="register-username">Usuário</Label>
                    <Input
                      id="register-username"
                      value={registerForm.username}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, username: event.target.value }))
                      }
                      className="mt-1.5 h-11"
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-store">Loja</Label>
                    <Input
                      id="register-store"
                      value={registerForm.store_name}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, store_name: event.target.value }))
                      }
                      className="mt-1.5 h-11"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, password: event.target.value }))
                      }
                      className="mt-1.5 h-11"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-11"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
                <Button className="h-11 w-full gap-2" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar usuário'}
                  <Sparkles className="h-4 w-4" />
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              Login local para desenvolvimento. Depois conectamos com autenticação segura no backend.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
