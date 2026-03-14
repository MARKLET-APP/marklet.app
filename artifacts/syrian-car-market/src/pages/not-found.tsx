import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-3xl font-bold text-foreground">404 — {t("notFound.title")}</h1>
        <p className="text-muted-foreground">{t("notFound.subtitle")}</p>
        <Link href="/">
          <Button className="rounded-xl">{t("notFound.home")}</Button>
        </Link>
      </div>
    </div>
  );
}
