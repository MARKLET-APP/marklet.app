// UI_ID: LOGIN_01
// NAME: تسجيل الدخول
import { useForm } from "react-hook-form";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const loginMutation = useLogin();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { identifier: "", password: "" }
  });

  const onSubmit = (data: any) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setAuth(res.user, res.token);
        navigate("/");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.message || t("auth.login.error");
        toast({
          title: "خطأ في تسجيل الدخول",
          description: msg,
          variant: "destructive",
          duration: 4000,
        });
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-3xl border shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">{t("auth.login.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.login.subtitle")}</p>
        </div>

        <form
          data-ui-id="FORM_LOGIN_01"
          data-testid="FORM_LOGIN_01"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.login.email")}</label>
            <input
              {...register("identifier", { required: t("common.requiredField") })}
              data-ui-id="INPUT_EMAIL_01"
              data-testid="INPUT_EMAIL_01"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr text-base"
              style={{ fontSize: 16 }}
              placeholder="email@example.com"
            />
            {errors.identifier && <p className="text-destructive text-xs">{errors.identifier.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">{t("auth.login.password")}</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                {...register("password", { required: t("common.requiredField") })}
                data-ui-id="INPUT_PASSWORD_01"
                data-testid="INPUT_PASSWORD_01"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-border px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr text-base pe-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute inset-y-0 start-3 flex items-center text-muted-foreground"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
          </div>

          <Button
            type="submit"
            data-ui-id="BTN_LOGIN_01"
            data-testid="BTN_LOGIN_01"
            disabled={loginMutation.isPending}
            className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
          >
            {loginMutation.isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("auth.login.loggingIn")}
              </span>
            ) : t("auth.login.submit")}
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
