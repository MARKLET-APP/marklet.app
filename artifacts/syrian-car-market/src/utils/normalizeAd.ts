import type { ListingCardType } from "@/components/ListingCard";

export interface NormalizedAd {
  type: ListingCardType;
  data: any;
}

const TYPE_MAP: Record<string, ListingCardType> = {
  real_estate: "real-estate",
  "real-estate": "real-estate",
  job: "jobs",
  jobs: "jobs",
  moto: "moto",
  rental: "rental",
  part: "part",
  junk: "junk",
  plate: "plate",
};

export function normalizeAd(item: any, rawType: string): NormalizedAd {
  return {
    type: TYPE_MAP[rawType] ?? (rawType as ListingCardType),
    data: item,
  };
}
