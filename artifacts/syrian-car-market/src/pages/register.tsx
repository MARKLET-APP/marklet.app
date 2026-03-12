import { useForm } from "react-hook-form";
import { useRegister } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Register() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuthStore();
  const registerMutation = useRegister();
  
  const { register: formRegister, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", identifier: "", password: "", role: "buyer" }
  });

  const onSubmit = (data: any) => {
    // Determine if identifier is email or phone basic check
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
      onError: () => {
        alert("فشل إنشاء الحساب.");
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-3xl border shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">إنشاء حساب</h1>
          <p className="text-muted-foreground">انضم لأكبر تجمع للسيارات في سوريا</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold">الاسم الكامل</label>
            <input 
              {...formRegister("name", { required: "الاسم مطلوب" })} 
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">البريد الإلكتروني أو رقم الهاتف</label>
            <input 
              {...formRegister("identifier", { required: "مطلوب" })} 
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">كلمة المرور</label>
            <input 
              type="password"
              {...formRegister("password", { required: "مطلوبة" })} 
              className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none text-left dir-ltr" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">نوع الحساب</label>
            <select {...formRegister("role")} className="w-full rounded-xl border-2 px-4 py-3 bg-background focus:border-primary outline-none">
              <option value="buyer">مشتري (للبحث وشراء السيارات)</option>
              <option value="seller">بائع / معرض (لنشر الإعلانات)</option>
            </select>
          </div>

          <Button type="submit" disabled={registerMutation.isPending} className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20">
            {registerMutation.isPending ? "جاري الإنشاء..." : "تسجيل حساب جديد"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب مسبقاً؟ <Link href="/login" className="text-primary font-bold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
