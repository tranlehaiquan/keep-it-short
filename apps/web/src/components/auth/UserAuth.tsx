import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import AuthDialog, { type AuthDialogMode } from "./AuthDialog";

interface Props {
  className?: string;
}

const UserAuth: React.FC<Props> = (props) => {
  const { useSession } = authClient;
  const { data: session, isPending, error, refetch } = useSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthDialogMode>("login");

  const openDialog = (mode: AuthDialogMode) => {
    setAuthMode(mode);
    setDialogOpen(true);
  };

  if (isPending) {
    return <div className={cn("animate-pulse", props.className)}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={props.className}>
        <span className="text-destructive">Error: {error.message}</span>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <>
        <div className={cn("flex items-center gap-2", props.className)}>
          <Button onClick={() => openDialog("login")}>Log In</Button>
          <Button variant="outline" onClick={() => openDialog("signup")}>
            Sign Up
          </Button>
        </div>
        <AuthDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={authMode}
          onSuccess={refetch}
        />
      </>
    );
  }

  const displayName = session.user.name || session.user.email || "User";
  const hasImage = session.user.image;

  return (
    <div className={cn("flex items-center gap-3", props.className)}>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="text-sm font-medium">{displayName}</span>
        {session.user.email && (
          <span className="text-muted-foreground text-xs">{session.user.email}</span>
        )}
      </div>
      {hasImage ? (
        <img
          src={session.user.image ?? ""}
          alt=""
          className="size-9 rounded-full object-cover ring-2 ring-border"
        />
      ) : (
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-medium">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
        Log Out
      </Button>
    </div>
  );
};

export default UserAuth;
