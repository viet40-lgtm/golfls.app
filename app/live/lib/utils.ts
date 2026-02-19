import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function splitName(name: string) {
  if (!name) return { first: '', last: '' };
  const parts = name.trim().split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  return { first, last };
}

export function getCourseHandicap(player: any, course?: any, round?: any) {
  // 1. Try pre-calculated data
  if (player?.liveRoundData?.course_hcp !== undefined && player?.liveRoundData?.course_hcp !== null) {
    return player.liveRoundData.course_hcp;
  }
  // 2. Try raw properties
  if (player?.course_handicap !== undefined) return player.course_handicap;

  // 3. Calculate if data available
  // Formula: Index * (Slope / 113) + (Rating - Par)
  if (player?.index === undefined || !course) return 0;

  const tee = getPlayerTee(player, course);
  const slope = tee?.slope || 113;
  const rating = tee?.rating || (course.holes?.reduce((s: number, h: any) => s + (h.par || 0), 0) || 72);
  const par = course.holes?.reduce((s: number, h: any) => s + (h.par || 0), 0) || 72;

  return Math.round((player.index * (slope / 113)) + (rating - par));
}

export function getPlayerTee(player: any, course?: any) {
  if (!player || !course) return null;

  if (player.preferred_tee_box) {
    const found = course.tee_boxes.find((t: any) => t.name === player.preferred_tee_box || t.id === player.preferred_tee_box);
    if (found) return found;
  }
  return course.tee_boxes?.[0] || null;
}

export function getScore(player: any, holeNo: number) {
  if (!player?.scores) return 0;
  const s = player.scores.find((sc: any) => sc.hole?.hole_number === holeNo || sc.hole_number === holeNo);
  return s ? s.strokes : 0;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 1.09361); // to yards
}
