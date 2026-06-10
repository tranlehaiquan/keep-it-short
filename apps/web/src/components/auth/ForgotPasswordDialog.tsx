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
  email: z.string().email("Please enter a valid email"),
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
  onSuccess?: () => void;
}

const ForgotPasswordDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const [sent, setSent] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver,
    defaultValues: { email: "" },
  });

  const close = () => {
    onOpenChange(false);
    setSubmitError(null);
    setSent(false);
    form.reset({ email: "" });
  };

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError(null);
      setSent(false);
      form.reset({ email: "" });
    }
  }, [open, form]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
        }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Failed to send reset email");
      setSent(true);
      toast.success("Reset email sent");
      onSuccess?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to send reset email");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Forgot password</DialogTitle>
          <DialogDescription>
            {sent
              ? `If an account exists for this email, a reset link has been sent.`
              : `Enter your email and we'll send you a reset link.`}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    {...field}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
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
                {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </DialogFooter>
          </form>
        )}
        {sent && (
          <DialogFooter>
            <Button onClick={close}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
