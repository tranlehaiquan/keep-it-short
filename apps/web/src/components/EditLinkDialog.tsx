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
import { updateShortLink, type ShortLinkItem } from "@/apis/history";

const editSchema = z
  .object({
    url: z
      .string()
      .transform((u) => (u.match(/^https?:\/\//i) ? u : `https://${u}`))
      .pipe(z.string().url("Please enter a valid URL"))
      .optional()
      .or(z.literal("")),
    expiredAt: z.string().optional(),
  })
  .refine((d) => !!d.url || !!d.expiredAt, {
    message: "Provide a URL or expiration date",
  });

type EditFormValues = z.infer<typeof editSchema>;

const resolver: Resolver<EditFormValues> = async (values) => {
  const result = await editSchema.safeParseAsync(values);
  if (result.success) return { values: result.data, errors: {} };
  const errors = result.error.flatten().fieldErrors as Partial<Record<keyof EditFormValues, string[]>>;
  return {
    values: {},
    errors: Object.fromEntries(
      Object.entries(errors).map(([key, msgs]) => [
        key,
        { type: "validation", message: msgs?.[0] ?? "Invalid value" },
      ]),
    ) as Record<keyof EditFormValues, { type: string; message: string }>,
  };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: ShortLinkItem | null;
  onSuccess?: () => void;
}

const EditLinkDialog: React.FC<Props> = ({ open, onOpenChange, link, onSuccess }) => {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<EditFormValues>({
    resolver,
    defaultValues: { url: "", expiredAt: "" },
  });

  React.useEffect(() => {
    if (open && link) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError(null);
      form.reset({
        url: link.url,
        expiredAt: new Date(link.expiredAt).toISOString().slice(0, 16),
      });
    }
  }, [open, link, form]);

  const onSubmit = async (data: EditFormValues) => {
    if (!link) return;
    setSubmitError(null);
    try {
      const body: { url?: string; expiredAt?: string } = {};
      if (data.url && data.url !== link.url) body.url = data.url;
      if (data.expiredAt) {
        const newDate = new Date(data.expiredAt).toISOString();
        if (newDate !== new Date(link.expiredAt).toISOString()) {
          body.expiredAt = newDate;
        }
      }
      if (!body.url && !body.expiredAt) {
        onOpenChange(false);
        return;
      }
      await updateShortLink(link.slug, body);
      toast.success("Link updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to update link");
    }
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit link — /{link.slug}</DialogTitle>
          <DialogDescription>
            Update the target URL or expiration date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <Controller
            control={form.control}
            name="url"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Target URL</FieldLabel>
                <Input
                  {...field}
                  placeholder="https://example.com"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="expiredAt"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Expiration</FieldLabel>
                <Input
                  {...field}
                  type="datetime-local"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditLinkDialog;
