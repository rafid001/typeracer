"use client";

import type { GameStatus, Player, PlayerScore } from "@/types/types";
import { useEffect, useState, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

// Define game props type with mode
interface GameProps {
  gameId: string;
  name: string;
  mode: "single" | "multi";
}

// Define new types for detailed stats
type CharacterStats = {
  correct: number;
  incorrect: number;
  missing: number;
  extra: number;
};

type DetailedStats = {
  wpm: number;
  accuracy: number;
  characters: CharacterStats;
  consistency: number;
  time: number;
  raw: number; // Raw WPM without penalties
};

export default function GamePlayer({ gameId, name, mode }: GameProps) {
  const [ioInstance, setIoInstance] = useState<Socket>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("not-started");
  const [paragraph, setParagraph] = useState<string>("");
  const [host, setHost] = useState<string>("");
  const [inputParagraph, setInputParagraph] = useState<string>("");
  const [timer, setTimer] = useState<number>(60);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(
    null
  );
  const [showingResults, setShowingResults] = useState<boolean>(false);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [errorHistory, setErrorHistory] = useState<number[]>([]);
  const [wordElements, setWordElements] = useState<JSX.Element[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null); // Track when typing actually begins
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0); // Track last WPM update time
  const [correctChars, setCorrectChars] = useState<number>(0); //

  // Process paragraph text into word elements for better display
  useEffect(() => {
    if (!paragraph) return;
    const words = paragraph.split(/\s+/);
    const elements = words.map((word, i) => (
      <span key={i} className="mr-2">
        {word}
      </span>
    ));
    setWordElements(elements);
  }, [paragraph]);

  // Socket connection and setup listeners (remain the same)
  useEffect(() => {
    const socketUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080/";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected successfully with ID:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      toast.error(`Connection error: ${error.message}`);
    });

    setIoInstance(socket);
    socket.emit("join-game", gameId, name);

    return () => {
      console.log("Disconnecting socket");
      removeListeners();
      socket.disconnect();
    };
  }, [gameId, name]);

  useEffect(() => {
    setupListeners();
    return () => removeListeners();
  }, [ioInstance]);

  // Calculate WPM and accuracy whenever input changes
  useEffect(() => {
    if (!ioInstance || gameStatus !== "in-progress") return;

    // Start tracking time when first character is typed
    if (inputParagraph.length === 1 && startTime === null) {
      const now = Date.now();
      setStartTime(now);
      setLastUpdateTime(now);
    }

    // Calculate correct characters
    const newCorrectChars = inputParagraph
      .split("")
      .filter((char, i) => paragraph[i] === char).length;
    setCorrectChars(newCorrectChars);

    // Only calculate WPM if typing has started
    if (startTime !== null) {
      const now = Date.now();
      const timeElapsedInMinutes = (now - startTime) / 60000; // Convert to minutes

      // Standard WPM calculation: (correct characters / 5) / minutes
      const wordsTyped = newCorrectChars / 5;
      const calculatedWpm = Math.round(
        wordsTyped / Math.max(0.016667, timeElapsedInMinutes)
      ); // Minimum 1 second

      setWpm(calculatedWpm);
      setElapsedTime((now - startTime) / 1000); // In seconds

      // Update WPM history (for consistency calculation)
      if (now - lastUpdateTime > 1000) {
        // Update at most once per second
        setWpmHistory((prev) => [...prev, calculatedWpm]);
        setLastUpdateTime(now);
      }

      // Emit both the typed text and current WPM
      ioInstance.emit("player-typed", {
        text: inputParagraph,
        wpm: calculatedWpm,
        correctChars: newCorrectChars,
      });
    } else {
      // If typing hasn't started yet but there's input, still send the text
      ioInstance.emit("player-typed", {
        text: inputParagraph,
        wpm: 0,
        correctChars: newCorrectChars,
      });
    }

    // Calculate accuracy
    const totalChars = inputParagraph.length;
    const calculatedAccuracy =
      totalChars > 0 ? Math.round((newCorrectChars / totalChars) * 100) : 100;
    setAccuracy(calculatedAccuracy);

    // Check if test is completed
    if (
      mode === "single" &&
      inputParagraph.length >= paragraph.length &&
      paragraph.length > 0
    ) {
      calculateDetailedStats();
      ioInstance.emit("complete");
    }
  }, [
    inputParagraph,
    gameStatus,
    ioInstance,
    mode,
    paragraph,
    startTime,
    lastUpdateTime,
  ]);

  // Timer effect - use countdown timer
  useEffect(() => {
    if (gameStatus === "in-progress") {
      // Reset all tracking states when game starts
      setStartTime(null);
      setLastUpdateTime(0);
      setCorrectChars(0);
      setWpmHistory([]);
      setErrorHistory([]);
      setElapsedTime(0);
      setTimer(60);

      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (gameStatus === "finished") {
        setTimer(0);
        calculateDetailedStats();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus]);

  function calculateDetailedStats() {
    if (!paragraph) return;

    const typedChars = inputParagraph.split("");
    const targetChars = paragraph.split("");

    let correct = correctChars;
    let incorrect = inputParagraph.length - correctChars;
    let missing = Math.max(0, targetChars.length - typedChars.length);
    let extra = Math.max(0, typedChars.length - targetChars.length);

    // Calculate raw WPM (all typed characters / 5 / minutes)
    const timeElapsedInMinutes = elapsedTime / 60;
    const rawWPM =
      timeElapsedInMinutes > 0
        ? Math.round(typedChars.length / 5 / timeElapsedInMinutes)
        : 0;

    // Calculate consistency based on WPM variance
    let consistency = 75; // Default value
    if (wpmHistory.length > 5) {
      const avg =
        wpmHistory.reduce((sum, curr) => sum + curr, 0) / wpmHistory.length;
      const squareDiffs = wpmHistory.map((value) => Math.pow(value - avg, 2));
      const avgSquareDiff =
        squareDiffs.reduce((sum, curr) => sum + curr, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      consistency = Math.max(
        0,
        Math.min(100, Math.round(100 - (stdDev / avg) * 100))
      );
    }

    // For multiplayer mode, make sure we're using the server's WPM value if available
    let displayWpm = wpm;
    if (mode === "multi" && ioInstance) {
      const currentPlayer = players.find((p) => p.id === ioInstance.id);
      if (currentPlayer && currentPlayer.wpm) {
        displayWpm = currentPlayer.wpm;
      }
    }

    const stats: DetailedStats = {
      wpm: displayWpm,
      accuracy,
      characters: {
        correct,
        incorrect,
        missing,
        extra,
      },
      consistency,
      time: elapsedTime,
      raw: rawWPM,
    };

    setDetailedStats(stats);
    setShowingResults(true);
  }
  function calculatePlayerWpm(player: Player): number {
    // Use stored WPM if available
    if (player.wpm !== undefined) return player.wpm;

    // Fallback calculation
    if (elapsedTime <= 0) return 0;
    const minutes = elapsedTime / 60;
    const words = player.score / 5;
    return Math.round(words / Math.max(0.016667, minutes));
  }

  function setupListeners() {
    if (!ioInstance) return;

    ioInstance.on("connect", () => {
      console.log("Connected with socket ID:", ioInstance.id);
    });

    ioInstance.on("players", (players: Player[]) => {
      console.log("Received players update:", players);
      setPlayers(players);
    });

    ioInstance.on("player-joined", (player: Player) => {
      console.log("Player joined:", player);
      setPlayers((prev) => [...prev, player]);
    });

    ioInstance.on("player-left", (id: string) => {
      console.log("Player left:", id);
      setPlayers((prev) => prev.filter((player) => player.id !== id));
    });

    ioInstance.on("player-score", ({ id, score, wpm }: PlayerScore) => {
      console.log(
        "✅ SCORE UPDATE FROM SERVER:",
        { id, score, wpm },
        "Current socket ID:",
        ioInstance.id
      );

      // Update players array with new score and wpm
      setPlayers((prev) => {
        const updatedPlayers = prev.map((player) => {
          if (player.id === id) {
            console.log(
              `Updating player ${player.name}'s score from ${player.score} to ${score} with WPM: ${wpm || "not provided"}`
            );
            return {
              ...player,
              score,
              wpm: wpm || 0, // Fallback to 0 if wpm not provided
            };
          }
          return player;
        });

        console.log("Updated players array:", updatedPlayers);
        return updatedPlayers;
      });
    });

    ioInstance.on("game-started", (paragraph: string) => {
      console.log(
        "Game started with paragraph:",
        paragraph.substring(0, 30) + "..."
      );
      setParagraph(paragraph);
      setGameStatus("in-progress");
      setElapsedTime(0);
      setTimer(60); // Set to 60 seconds (1 minute)
      setInputParagraph("");
      setShowingResults(false);
      setDetailedStats(null);
    });

    ioInstance.on("game-finished", () => {
      console.log("Game finished event received");
      console.log(
        "Final player WPM values:",
        players.map((p) => ({ name: p.name, wpm: p.wpm, score: p.score }))
      );
      setGameStatus("finished");
      setInputParagraph("");

      // Short delay to ensure we have the latest player data
      setTimeout(() => {
        console.log(
          "Calculating detailed stats with player data:",
          players.map((p) => ({ name: p.name, wpm: p.wpm, score: p.score }))
        );
        calculateDetailedStats();
      }, 500);
    });

    ioInstance.on("new-host", (id: string) => {
      console.log("New host assigned:", id);
      setHost(id);
    });

    ioInstance.on("error", (message: string) => {
      console.error("Error from server:", message);
      toast.error(message);
    });

    ioInstance.on("disconnected", () => {
      console.log("Socket disconnected");
      setGameStatus("finished");
      setInputParagraph("");
      calculateDetailedStats();
    });
  }

  function removeListeners() {
    if (!ioInstance) return;

    ioInstance.off("connect");
    ioInstance.off("players");
    ioInstance.off("player-joined");
    ioInstance.off("player-left");
    ioInstance.off("player-score");
    ioInstance.off("game-started");
    ioInstance.off("game-finished");
    ioInstance.off("new-host");
    ioInstance.off("error");
  }

  function startGame() {
    if (!ioInstance) {
      console.error("Cannot start game: Socket not initialized");
      toast.error("Connection error. Please refresh the page.");
      return;
    }

    console.log("Sending start-game event");
    ioInstance.emit("start-game");
  }

  function restartTest() {
    setShowingResults(false);
    startGame();
  }

  window.onbeforeunload = () => {
    if (ioInstance) {
      ioInstance.emit("leave");
    }
  };

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function copyGameId() {
    navigator.clipboard
      .writeText(gameId)
      .then(() => {
        toast.success("Game ID copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy game ID");
      });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top stats bar */}
      <div className="py-3 border-b border-border/40 px-4 flex justify-center">
        <div className="flex items-center space-x-8 text-sm font-mono">
          {gameStatus === "in-progress" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">wpm</span>
                <span className="font-bold">{wpm}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">acc</span>
                <span className="font-bold">{accuracy}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">time</span>
                <span className="font-bold">{formatTime(timer)}</span>
              </div>
            </>
          )}

          {gameStatus !== "in-progress" && (
            <div className="flex items-center gap-2">
              <span className="text-primary">⌨️</span>
              <span className="font-bold">typeracer</span>
            </div>
          )}
        </div>
      </div>

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {gameStatus === "not-started" && (
          <div className="text-center space-y-6">
            <h2 className="text-xl font-mono">
              {mode === "single" ? "practice mode" : "waiting for racers"}
            </h2>
            <div className="space-y-2">
              {mode === "multi" && (
                <>
                  <div className="text-sm text-muted-foreground">
                    players: {players.length}
                  </div>

                  <div className="flex justify-center items-center mt-4 gap-2 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      game id:{" "}
                      <span className="text-foreground/90">{gameId}</span>
                    </div>
                    <button
                      onClick={copyGameId}
                      className="inline-flex items-center h-6 px-2 text-xs font-mono bg-background/30 hover:bg-background/60 border border-border/40 rounded-md transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
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
                    </button>
                  </div>
                </>
              )}

              <Button
                onClick={startGame}
                className="font-mono"
                variant="outline"
              >
                {mode === "single" ? "start typing" : "start race"}
              </Button>
            </div>
          </div>
        )}

        {gameStatus === "in-progress" && !showingResults && (
          <div className="w-full max-w-2xl mx-auto py-8">
            <div className="mt-10 mb-20 relative">
              {/* Improved text display with better spacing and layout */}
              <div className="font-mono text-lg leading-loose mx-auto bg-background/30 p-6 rounded-md border border-border/20">
                <div className="text-center mb-2 text-xs text-muted-foreground">
                  type the text below
                </div>

                <div className="relative">
                  {/* Text with colored character highlighting */}
                  <div className="flex flex-wrap" aria-hidden="true">
                    {paragraph.split("").map((char, index) => {
                      const isTyped = index < inputParagraph.length;
                      const isCorrect =
                        isTyped && char === inputParagraph[index];
                      const isWrong = isTyped && char !== inputParagraph[index];
                      const isCurrent = index === inputParagraph.length;

                      return (
                        <span
                          key={index}
                          className={`
                            ${
                              isTyped
                                ? isCorrect
                                  ? "text-muted-foreground"
                                  : "text-red-500"
                                : "text-foreground/80"
                            }
                            ${isCurrent ? "border-l-2 border-primary animate-pulse" : ""}
                            ${char === " " ? "mr-1.5" : ""}
                          `}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>

                  {/* Invisible textarea for typing */}
                  <Textarea
                    ref={textareaRef}
                    value={inputParagraph}
                    onChange={(e) => setInputParagraph(e.target.value)}
                    className="absolute inset-0 opacity-0 resize-none cursor-text h-full"
                    disabled={gameStatus !== "in-progress" || !ioInstance}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {showingResults && detailedStats && (
          <div className="w-full py-10">
            <div className="max-w-lg mx-auto">
              {/* Different display for single player and multiplayer results */}
              {mode === "single" ? (
                // Single player detailed stats
                <>
                  {/* Main Stats */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <div className="text-muted-foreground text-sm font-mono mb-1">
                        wpm
                      </div>
                      <div className="text-6xl font-mono text-primary">
                        {detailedStats.wpm}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-sm font-mono mb-1">
                        acc
                      </div>
                      <div className="text-6xl font-mono text-yellow-500">
                        {detailedStats.accuracy}%
                      </div>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="w-full h-40 bg-background/30 border border-border/40 rounded-sm mb-6 relative overflow-hidden">
                    {/* WPM line chart visualization */}
                    <div className="absolute inset-0 flex items-end">
                      {wpmHistory.map((wpm, i) => {
                        const height = `${Math.min(100, wpm)}%`;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-primary/20 to-primary/5"
                            style={{ height, transition: "height 0.2s ease" }}
                          >
                            {i % 5 === 0 && (
                              <div className="w-0.5 h-full bg-primary/20 mx-auto"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Error markers */}
                    {errorHistory.map(
                      (errors, i) =>
                        errors > 0 && (
                          <div
                            key={`error-${i}`}
                            className="absolute top-2 w-1 h-1 bg-red-500 rounded-full"
                            style={{
                              left: `${(i / Math.max(1, wpmHistory.length)) * 100}%`,
                            }}
                          />
                        )
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-8">
                    <div className="text-center p-2">
                      <div className="text-muted-foreground text-xs font-mono mb-1">
                        test type
                      </div>
                      <div className="font-mono text-sm">
                        time {Math.floor(detailedStats.time / 60)}:
                        {(detailedStats.time % 60).toString().padStart(2, "0")}
                      </div>
                    </div>

                    <div className="text-center p-2">
                      <div className="text-muted-foreground text-xs font-mono mb-1">
                        raw
                      </div>
                      <div className="font-mono text-yellow-500 text-2xl">
                        {detailedStats.raw}
                      </div>
                    </div>

                    <div className="text-center p-2">
                      <div className="text-muted-foreground text-xs font-mono mb-1">
                        characters
                      </div>
                      <div className="font-mono text-yellow-500 text-lg">
                        {detailedStats.characters.correct}/
                        <span className="text-red-500">
                          {detailedStats.characters.incorrect}
                        </span>
                        /
                        <span className="text-orange-500">
                          {detailedStats.characters.missing}
                        </span>
                        /
                        <span className="text-blue-500">
                          {detailedStats.characters.extra}
                        </span>
                      </div>
                    </div>

                    <div className="text-center p-2">
                      <div className="text-muted-foreground text-xs font-mono mb-1">
                        consistency
                      </div>
                      <div className="font-mono text-yellow-500 text-2xl">
                        {detailedStats.consistency}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Multiplayer race results
                <div className="space-y-6">
                  <h2 className="text-2xl font-mono text-center">
                    race results
                  </h2>

                  <div className="w-full border border-border/40 rounded-md overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 bg-card/40 text-xs font-mono text-muted-foreground py-2 px-3">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5">player</div>
                      <div className="col-span-3 text-center font-bold">
                        WPM
                      </div>
                      <div className="col-span-3 text-center">words</div>
                    </div>

                    {/* Player rows */}
                    {players
                      .sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
                      .map((player, index) => {
                        return (
                          <div
                            key={player.id}
                            className={`
                              grid grid-cols-12 items-center py-3 px-3 text-sm font-mono border-t border-border/20
                              ${player.id === ioInstance?.id ? "bg-primary/5" : index % 2 === 0 ? "bg-card/20" : ""}
                            `}
                          >
                            <div className="col-span-1 text-center">
                              {index === 0 && (
                                <span className="text-yellow-500">🏆</span>
                              )}
                              {index !== 0 && (
                                <span className="text-muted-foreground">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="col-span-5 flex items-center">
                              <span className="truncate">{player.name}</span>
                              {player.id === ioInstance?.id && (
                                <span className="ml-1 text-xs text-primary">
                                  *
                                </span>
                              )}
                              {player.id === host && (
                                <span className="ml-1 text-xs text-amber-500">
                                  ⭐
                                </span>
                              )}
                            </div>
                            <div className="col-span-3 text-center font-bold text-primary text-lg">
                              {player.wpm !== undefined
                                ? player.wpm
                                : calculatePlayerWpm(player)}
                            </div>
                            <div className="col-span-3 text-center text-muted-foreground">
                              {player.score}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-8">
                <Button
                  onClick={restartTest}
                  className="font-mono"
                  variant="outline"
                >
                  {mode === "single" ? "restart test" : "new race"}
                </Button>

                {mode === "single" && (
                  <Button
                    onClick={() => setShowingResults(false)}
                    className="font-mono"
                    variant="ghost"
                  >
                    back to test
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {gameStatus === "finished" && !showingResults && (
          <div className="text-center space-y-6">
            <h2 className="text-xl font-mono">race complete</h2>
            <div className="space-y-5">
              <div className="grid gap-2 max-w-sm mx-auto">
                {players
                  .sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
                  .map((player, index) => {
                    return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center justify-between py-2 px-3 font-mono text-sm
                          ${player.id === ioInstance?.id ? "bg-primary/5 border border-primary/20" : ""}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {index + 1}
                          </span>
                          <span>{player.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            words:
                          </span>
                          <span>{player.score}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            wpm:
                          </span>
                          <span className="text-primary font-bold text-base">
                            {player.wpm !== undefined
                              ? player.wpm
                              : calculatePlayerWpm(player)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <Button
                onClick={startGame}
                className="font-mono"
                variant="outline"
              >
                new race
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mini leaderboard - only show in multiplayer mode */}
      {mode === "multi" &&
        gameStatus === "in-progress" &&
        !showingResults &&
        players.length > 1 && (
          <div className="fixed right-4 top-16 max-w-xs w-full bg-background/80 backdrop-blur border border-border/40 p-3 rounded-md">
            <div className="text-xs font-mono text-muted-foreground mb-2">
              leaderboard
            </div>
            <div className="space-y-1.5">
              {players
                .sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
                .map((player, index) => {
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between font-mono text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="truncate max-w-[100px]">
                          {player.name}
                          {player.id === ioInstance?.id && (
                            <span className="ml-1 text-primary">*</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">w:</span>
                        <span>{player.score}</span>
                        <span className="text-muted-foreground ml-1">wpm:</span>
                        <span className="text-primary text-sm font-bold">
                          {player.wpm || calculatePlayerWpm(player)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      {/* Command info footer */}
      {gameStatus === "in-progress" && !showingResults && (
        <div className="fixed bottom-3 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-mono">
          <span>tab + enter - restart</span>
        </div>
      )}
    </div>
  );
}
