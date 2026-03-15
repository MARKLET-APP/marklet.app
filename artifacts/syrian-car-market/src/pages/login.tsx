import { useForm } from "react-hook-form";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function Login() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const loginMutation = useLogin();
  const { t } = useLanguage();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { identifier: "", password: "" }
  });

  const onSubmit = (data: any) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuth(res.user, res.token);
        navigate("/");
      },
      onError: () => {
        alert(t("auth.login.error"));
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-3xl border shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">{t("auth.login.title")}</h1>
          <p className="text-muted-foreground">{t("auth.login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.login.email")}</label>
            <input
              {...register("identifier", { required: t("common.requiredField") })}
              autoComplete="username"
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr"
            />
            {errors.identifier && <p className="text-destructive text-xs">{errors.identifier.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.login.password")}</label>
            <input
              type="password"
              {...register("password", { required: t("common.requiredField") })}
              autoComplete="current-password"
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr"
            />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
          </div>

          <Button type="submit" disabled={loginMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
            {loginMutation.isPending ? t("auth.login.loggingIn") : t("auth.login.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">{t("auth.login.createAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
