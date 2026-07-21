// auth--login.tsx
// Centered login form with email/password, social login, and registration link.
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Separator,
} from '@sinkra/ds-core'
import { Field, FieldLabel, FieldGroup, Input } from '@sinkra/ds-core'

export function AuthLogin() {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Entrar na sua conta</CardTitle>
          <CardDescription>
            Insira suas credenciais para acessar a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" placeholder="seu@email.com" />
              </Field>
              <Field>
                <FieldLabel>Senha</FieldLabel>
                <Input type="password" placeholder="********" />
              </Field>
            </FieldGroup>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="rounded" />
                Lembrar de mim
              </label>
              <a href="#" className="text-primary hover:underline">
                Esqueceu a senha?
              </a>
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              ou continue com
            </span>
          </div>
          <Button variant="outline" className="w-full">
            Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Nao tem conta?{' '}
            <a href="#" className="text-primary hover:underline">
              Criar conta
            </a>
          </p>
        </CardFooter>
      </Card>
    </section>
  )
}
