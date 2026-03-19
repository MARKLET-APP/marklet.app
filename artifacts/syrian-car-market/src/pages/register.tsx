import { useForm } from "react-hook-form";
import { useRegister } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const registerMutation = useRegister();
  const { t } = useLanguage();
  const { toast } = useToast();

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", identifier: "", password: "", role: "buyer" }
  });

  const onSubmit = (data: any) => {
    const isEmail = data.identifier.includes('@');
    const payload = {
      name: data.name,
      password: data.password,
      role: data.role,
      email: isEmail ? data.identifier : undefined,
      phone: !isEmail ? data.identifier : undefined,
    };

    registerMutation.mutate({ data: payload as any }, {
      onSuccess: (res) => {
        setAuth(res.user, res.token);
        navigate("/");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || t("common.error");
        toast({ title: "خطأ في إنشاء الحساب", description: msg, variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-3xl border shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">{t("auth.register.title")}</h1>
          <p className="text-muted-foreground">{t("auth.register.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.register.name")}</label>
            <input
              {...formRegister("name", { required: t("common.requiredField") })}
              autoComplete="name"
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none"
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.register.email")}</label>
            <input
              {...formRegister("identifier", { required: t("common.requiredField") })}
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr"
            />
            {errors.identifier && <p className="text-destructive text-xs">{errors.identifier.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.register.password")}</label>
            <input
              type="password"
              {...formRegister("password", { required: t("common.requiredField") })}
              autoComplete="new-password"
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr"
            />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.register.role")}</label>
            <select {...formRegister("role")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
              <option value="buyer">{t("auth.register.role.buyer")}</option>
              <option value="seller">{t("auth.register.role.seller")}</option>
              <option value="dealer">{t("auth.register.role.dealer")}</option>
            </select>
          </div>

          <Button type="submit" disabled={registerMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
            {registerMutation.isPending ? t("auth.register.creating") : t("auth.register.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.register.hasAccount")}{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">{t("auth.register.login")}</Link>
        </p>
      </div>
    </div>
  );
}
