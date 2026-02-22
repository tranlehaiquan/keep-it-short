import React from "react";
import { authClient } from "@/lib/auth-client";
import type { ControllerRenderProps } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";

export type AuthDialogMode = "login" | "signup";

const authFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AuthFormValues = z.infer<typeof authFormSchema>;

const authFormResolver: Resolver<AuthFormValues> = async (values) => {
  const result = await authFormSchema.safeParseAsync(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const errors = result.error.flatten().fieldErrors as Partial<
    Record<keyof AuthFormValues, string[]>
  >;
  return {
    values: {},
    errors: Object.fromEntries(
      Object.entries(errors).map(([key, msgs]) => [
        key,
        { type: "validation", message: msgs?.[0] ?? "Invalid value" },
      ])
    ) as Record<keyof AuthFormValues, { type: string; message: string }>,
  };
};

export interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AuthDialogMode;
  onSuccess?: () => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onOpenChange,
  mode,
  onSuccess,
}) => {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<AuthFormValues>({
    resolver: authFormResolver,
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const closeDialog = () => {
    onOpenChange(false);
    setSubmitError(null);
    form.reset({ name: "", email: "", password: "" });
  };

  React.useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({ name: "", email: "", password: "" });
    }
  }, [open, form]);

  const onSubmit = async (data: AuthFormValues) => {
    setSubmitError(null);
    const { email, password, name } = data;

    if (mode === "login") {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        setSubmitError(signInError.message ?? "Sign in failed");
        return;
      }
    } else {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: (name ?? "").trim(),
      });
      if (signUpError) {
        setSubmitError(signUpError.message ?? "Sign up failed");
        return;
      }
    }

    closeDialog();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "Log in" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Enter your email and password to sign in."
              : "Enter your details to create an account."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
            {mode === "signup" && (
              <FormField
                control={form.control}
                name="name"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<AuthFormValues, "name">;
                }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your name"
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({
                field,
              }: {
                field: ControllerRenderProps<AuthFormValues, "email">;
              }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({
                field,
              }: {
                field: ControllerRenderProps<AuthFormValues, "password">;
              }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  {mode === "signup" && (
                    <p className="text-muted-foreground text-xs">
                      At least 8 characters
                    </p>
                  )}
                </FormItem>
              )}
            />
            {submitError && (
              <p className="text-destructive text-sm" role="alert">
                {submitError}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Please wait…"
                  : mode === "login"
                    ? "Log in"
                    : "Sign up"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
