/**
 * Marketplace Feed Ranking — LAZEMNI
 *
 * Ranks listings by a composite score:
 *   +3  if the listing has more than 3 images
 *   +2  if isFeatured
 *   +1  if isHighlighted
 *   +recency component (decays over time)
 */

export type RankableListing = {
  id: number;
  isFeatured: boolean;
  isHighlighted: boolean;
  createdAt: Date | string;
  images?: string[] | null;
  imagesCount?: number;
};

/**
 * Returns a new array sorted by descending rank score.
 * Original array is not mutated.
 */
export function rankListings<T extends RankableListing>(listings: T[]): T[] {
  const DAY_MS = 86_400_000;
  const now = Date.now();

  return [...listings].sort((a, b) => {
    const score = (item: T): number => {
      let s = 0;

      const imgCount =
        item.imagesCount ??
        (Array.isArray(item.images) ? item.images.length : 0);

      if (imgCount > 3) s += 3;
      if (item.isFeatured) s += 2;
      if (item.isHighlighted) s += 1;

      const ageMs = now - new Date(item.createdAt).getTime();
      const ageDays = ageMs / DAY_MS;
      s += Math.max(0, 10 - ageDays * 0.5);

      return s;
    };

    return score(b) - score(a);
  });
}
