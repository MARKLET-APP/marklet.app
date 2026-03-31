import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Real Estate filters ───────────────────────────────────────────────────
export interface RealEstateFilters {
  listingType?: string;
  subCategory?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  rooms?: string;
}

export function filterRealEstate(data: any[], filters: RealEstateFilters): any[] {
  return data.filter(item => {
    if (filters.listingType && item.listingType !== filters.listingType) return false;
    if (filters.subCategory && item.subCategory !== filters.subCategory) return false;
    if (filters.province && item.province !== filters.province) return false;
    if (filters.minPrice && Number(item.price) < filters.minPrice) return false;
    if (filters.maxPrice && Number(item.price) > filters.maxPrice) return false;
    if (filters.minArea && Number(item.area) < filters.minArea) return false;
    if (filters.rooms && String(item.rooms) !== filters.rooms) return false;
    return true;
  });
}

// ── Jobs filters ──────────────────────────────────────────────────────────
export interface JobFilters {
  jobType?: string;
  subCategory?: string;
  field?: string;
  experience?: string;
  province?: string;
}

export function filterJobs(data: any[], filters: JobFilters): any[] {
  return data.filter(item => {
    if (filters.jobType && item.jobType !== filters.jobType) return false;
    if (filters.subCategory && item.subCategory !== filters.subCategory) return false;
    if (filters.field && item.field !== filters.field) return false;
    if (filters.experience && item.experience !== filters.experience) return false;
    if (filters.province && item.province !== filters.province) return false;
    return true;
  });
}
