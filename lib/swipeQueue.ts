import type { FilmCardData } from "@/components/FilmCard";

// A plain in-memory handoff between whatever screen a film card was tapped
// from and the swipe screen — avoids serializing a whole film list through
// router params. Set right before navigating to /swipe, read once on mount.
let queue: FilmCardData[] = [];

export function setSwipeQueue(films: FilmCardData[]) {
  queue = films;
}

export function getSwipeQueue(): FilmCardData[] {
  return queue;
}
