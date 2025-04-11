export type Player = {
  id: string;
  name: string;
  score: number;
  wpm?: number;
};

export type PlayerScore = {
  id: string;
  score: number;
  wpm?: number;
};

export type GameStatus = "not-started" | "in-progress" | "finished";

export type GameProps = {
  name: string;
  gameId: string;
  mode: "single" | "multi";
};
