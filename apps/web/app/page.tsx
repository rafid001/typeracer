"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();

  const joinGame = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const inviteCode = formData.get("inviteCode") as string;

    if (!inviteCode) return toast.error("Invite code is required");

    router.push(`/game/${inviteCode}`);
  };

  const createGame = () => {
    const inviteCode = uuidv4();
    router.push(`/game/${inviteCode}`);
  };

  const handleClick = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md px-4">
        <div className="mb-12 text-center">
          <button
            className="inline-flex items-center justify-center mb-3 bg-transparent border-none cursor-pointer"
            onClick={() => handleClick()}
          >
            <span className="text-primary text-3xl mr-1">⌨️</span>
            <h1 className="text-3xl font-mono font-bold tracking-tight">
              typeracer
            </h1>
          </button>
          <p className="text-muted-foreground text-sm">
            simple. precise. competitive.
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col">
            <form onSubmit={joinGame} className="space-y-2">
              <Input
                type="text"
                placeholder="game code"
                name="inviteCode"
                className="h-10 text-center font-mono"
                autoComplete="off"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full h-10 font-mono"
              >
                join race
              </Button>
            </form>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-px bg-border flex-grow"></div>
            <span>or</span>
            <div className="h-px bg-border flex-grow"></div>
          </div>

          <Button onClick={createGame} className="w-full h-10 font-mono">
            create new race
          </Button>
        </div>

        <div className="mt-20 flex justify-center gap-6 text-xs text-muted-foreground">
          <span className="cursor-pointer hover:text-primary transition-colors">
            about
          </span>
          <span className="cursor-pointer hover:text-primary transition-colors">
            settings
          </span>
          <span className="cursor-pointer hover:text-primary transition-colors">
            account
          </span>
        </div>
      </div>
    </main>
  );
}
