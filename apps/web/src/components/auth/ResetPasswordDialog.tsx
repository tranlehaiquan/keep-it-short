import React from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

const resolver: Resolver<FormValues> = async (values) => {
  const result = await schema.safeParseAsync(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors = result.error.flatten().fieldErrors as Partial<Record<keyof FormValues, string[]>>;
  return {
    values: {},
    errors: Object.fromEntries(
      Object.entries(errors).map(([key, msgs]) => [
        key,
        { type: "validation", message: msgs?.[0] ?? "Invalid value" },
      ]),
    ) as Record<keyof FormValues, { type: string; message: string }>,
  };
};

const getApiBase = () =>
  import.meta.env.DEV ? "http://localhost:4000" : window.location.origin;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
}

const ResetPasswordDialog: React.FC<Props> = ({ open, onOpenChange, token }) => {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver,
    defaultValues: { password: "" },
  });

  const close = () => {
    onOpenChange(false);
    setSubmitError(null);
    form.reset({ password: "" });
  };

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError(null);
      form.reset({ password: "" });
    }
  }, [open, form]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: data.password,
          token,
        }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { status?: boolean };
      if (!res.ok || !json.status) throw new Error("Failed to reset password");
      toast.success("Password reset successfully. You can now log in.");
      close();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to reset password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Enter your new password below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>New password</FieldLabel>
                <Input
                  {...field}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
                <p className="text-muted-foreground text-xs">At least 8 characters</p>
              </Field>
            )}
          />
          {submitError && (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={form.formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
