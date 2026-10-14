import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const EMPTY = { current: "", next: "", confirm: "" };

/** One password field with its own independent show/hide toggle, matching
 * the pattern already used on the sign-in screen (LoginView). */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { changePassword } = useAuth();
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(EMPTY);
    setError(undefined);
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    const result = await changePassword(values.current, values.next, values.confirm);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Password changed.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password, then choose a new one.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <PasswordField
            id="current-password"
            label="Existing password"
            value={values.current}
            onChange={(v) => setValues((s) => ({ ...s, current: v }))}
            autoFocus
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={values.next}
            onChange={(v) => setValues((s) => ({ ...s, next: v }))}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={values.confirm}
            onChange={(v) => setValues((s) => ({ ...s, confirm: v }))}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
