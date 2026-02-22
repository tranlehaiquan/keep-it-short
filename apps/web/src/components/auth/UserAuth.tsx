import React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";

interface Props {
  className?: string;
}

const UserAuth: React.FC<Props> = (props) => {
  const { useSession } = authClient;
  const { data: session, isPending, error, refetch } = useSession();

  if (isPending) {
    return <div className={props.className}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={props.className}>
        Error: {error.message}
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={props.className}>
        <Button>Log In</Button>
      </div>
    );
  }

  return (
    <div className={props.className}>
      Welcome, {session.user.name || session.user.email}!
      <Button onClick={() => authClient.signOut()}>Log Out</Button>
    </div>
  );
};

export default UserAuth;
