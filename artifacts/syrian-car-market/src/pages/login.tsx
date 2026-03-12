import { useForm } from "react-hook-form";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const loginMutation = useLogin();
  
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
        alert("فشل تسجيل الدخول، يرجى التحقق من البيانات.");
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-3xl border shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">تسجيل الدخول</h1>
          <p className="text-muted-foreground">أهلاً بك مجدداً في سوق السيارات السوري</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold">البريد الإلكتروني أو رقم الهاتف</label>
            <input 
              {...register("identifier", { required: "هذا الحقل مطلوب" })} 
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr" 
            />
            {errors.identifier && <p className="text-destructive text-xs">{errors.identifier.message as string}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور</label>
            <input 
              type="password"
              {...register("password", { required: "كلمة المرور مطلوبة" })} 
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr" 
            />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
          </div>

          <Button type="submit" disabled={loginMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
            {loginMutation.isPending ? "جاري الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟ <Link href="/register" className="text-primary font-bold hover:underline">إنشاء حساب جديد</Link>
        </p>
      </div>
    </div>
  );
}
