import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export type LoginMode = "signin" | "signup";

export function LoginView({
  email,
  password,
  firstName = "",
  lastName = "",
  confirmPassword = "",
  busy = false,
  mode,
  error,
  onEmailChange,
  onPasswordChange,
  onFirstNameChange = () => {},
  onLastNameChange = () => {},
  onConfirmPasswordChange = () => {},
  onModeChange,
  onSso,
  onSubmit,
}: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  busy?: boolean;
  mode: LoginMode;
  error?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFirstNameChange?: (value: string) => void;
  onLastNameChange?: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  onModeChange: (mode: LoginMode) => void;
  onSso: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-from to-brand-to shadow-lg">
            <ShieldCheck className="size-7 text-brand-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Opportunity Tracker</h1>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={onSubmit}>
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(event) => onFirstNameChange(event.target.value)}
                      placeholder="First name"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(event) => onLastNameChange(event.target.value)}
                      placeholder="Last name"
                      className="h-11"
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">User Name</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="Enter your email"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                    placeholder="Re-enter your password"
                    className="h-11"
                    required
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={busy} className="h-11 w-full">
                {busy ? "Please wait…" : mode === "signin" ? "Login" : "Create account"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button type="button" variant="outline" className="h-11 w-full" onClick={onSso} disabled={busy}>
              <KeyRound className="mr-2 size-4" />
              Login with SSO
            </Button>
          </CardContent>
        </Card>

        <button
          type="button"
          className="mt-4 w-full text-center text-[13px] text-muted-foreground hover:underline"
          onClick={() => onModeChange(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
