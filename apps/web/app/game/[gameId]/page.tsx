"use client";

import Game from "@/components/game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function GameJoin({
  searchParams,
  params,
}: {
  searchParams: { name?: string; mode?: string };
  params: { gameId: string };
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("multi");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    router.push(
      `/game/${params.gameId}?name=${encodeURIComponent(name)}&mode=${mode}`
    );
  }

  const handleClick = () => {
    router.push("/");
  };

  function copyGameId() {
    navigator.clipboard
      .writeText(params.gameId)
      .then(() => {
        toast.success("Game ID copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy game ID");
      });
  }

  if (!searchParams.name) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
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
              test your typing speed
            </p>
          </div>

          <Card className="border border-border/60 bg-card/30 backdrop-blur-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-mono text-muted-foreground mb-2"
                >
                  enter your name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="name"
                  autoComplete="off"
                  className="font-mono text-base border-border/60 bg-background/50 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-mono text-muted-foreground mb-3">
                  mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("single")}
                    className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors ${
                      mode === "single"
                        ? "border-primary/50 bg-primary/5 text-primary"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <span className="text-lg mb-1">👤</span>
                    <span className="text-xs font-mono">single player</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("multi")}
                    className={`flex flex-col items-center justify-center p-3 rounded-md border transition-colors ${
                      mode === "multi"
                        ? "border-primary/50 bg-primary/5 text-primary"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <span className="text-lg mb-1">👥</span>
                    <span className="text-xs font-mono">multiplayer</span>
                  </button>
                </div>
              </div>

              {mode === "multi" && (
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-xs font-mono text-muted-foreground overflow-hidden text-ellipsis">
                      game id:{" "}
                      <span className="text-foreground">{params.gameId}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyGameId}
                      className="h-7 px-2 font-mono text-xs"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <rect
                          width="14"
                          height="14"
                          x="8"
                          y="8"
                          rx="2"
                          ry="2"
                        />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      copy
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={!name.trim()}
                className="w-full font-mono mt-5"
              >
                start typing
              </Button>
            </form>
          </Card>

          <div className="mt-8 text-xs text-center text-muted-foreground">
            <span className="font-mono">
              press{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border/50 text-muted-foreground">
                tab
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border/50 text-muted-foreground">
                enter
              </kbd>{" "}
              to start
            </span>
          </div>
        </div>
      </main>
    );
  } else {
    return (
      <Game
        gameId={params.gameId}
        name={searchParams.name}
        mode={(searchParams.mode as "single" | "multi") || "multi"}
      />
    );
  }
}
