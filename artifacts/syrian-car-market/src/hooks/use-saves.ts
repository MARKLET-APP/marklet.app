import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export type ListingSaveType =
  | "car_sale"
  | "car_rent"
  | "car_parts"
  | "junk"
  | "plate_numbers"
  | "motorcycles"
  | "buy_request"
  | "rent_request";

interface SavedId {
  listingType: string;
  listingId: number;
}

export function useSaves() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: savedIds = [] } = useQuery<SavedId[]>({
    queryKey: ["saves", "ids"],
    queryFn: () => apiRequest("/api/saves/ids"),
    enabled: !!user,
    staleTime: 30000,
  });

  const isSaved = (type: ListingSaveType, id: number) =>
    savedIds.some(s => s.listingType === type && s.listingId === id);

  const saveMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) =>
      apiRequest("/api/saves", "POST", { listingType: type, listingId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saves"] });
      toast({ title: "تم الحفظ", description: "تم إضافة الإعلان إلى المحفوظات" });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) =>
      apiRequest(`/api/saves/${type}/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saves"] });
      toast({ title: "تم الحذف", description: "تم حذف الإعلان من المحفوظات" });
    },
  });

  const toggleSave = (type: ListingSaveType, id: number) => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", description: "سجّل دخولك لحفظ الإعلانات", variant: "destructive" });
      return;
    }
    if (isSaved(type, id)) {
      unsaveMutation.mutate({ type, id });
    } else {
      saveMutation.mutate({ type, id });
    }
  };

  const isLoading = saveMutation.isPending || unsaveMutation.isPending;

  return { isSaved, toggleSave, isLoading, savedIds };
}
