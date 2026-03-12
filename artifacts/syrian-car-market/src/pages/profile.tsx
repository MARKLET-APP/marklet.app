import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { 
  useGetUser, 
  useUpdateUser, 
  useListCars, 
  useGetUserReviews 
} from "@workspace/api-client-react";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/CarCard";
import { 
  User, MapPin, Phone, ShieldCheck, Star, 
  Settings, LogOut, Loader2, Edit3 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, isHydrated, logout } = useAuthStore();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    province: user?.province || "",
    city: user?.city || "",
  });

  const { data: profileData, isLoading: loadingProfile, refetch: refetchProfile } = useGetUser(user?.id || 0, {
    query: { enabled: !!user?.id }
  });

  const { data: userCars, isLoading: loadingCars } = useListCars(
    { sellerId: user?.id },
    { query: { enabled: !!user?.id } }
  );

  const { data: reviews, isLoading: loadingReviews } = useGetUserReviews(user?.id || 0, {
    query: { enabled: !!user?.id }
  });

  const updateMutation = useUpdateUser();

  if (!isHydrated) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: editForm
      });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات ملفك الشخصي.",
      });
      setIsEditing(false);
      refetchProfile();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث البيانات.",
        variant: "destructive",
      });
    }
  };

  const currentProfile = profileData || user;

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-primary/10"></div>
            <div className="relative pt-8 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-background border-4 border-background shadow-lg flex items-center justify-center overflow-hidden mb-4">
                {currentProfile.avatarUrl ? (
                  <img src={currentProfile.avatarUrl} alt={currentProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 justify-center">
                {currentProfile.name}
                {currentProfile.isVerified && <ShieldCheck className="w-5 h-5 text-primary" />}
              </h2>
              <p className="text-muted-foreground mb-4">{currentProfile.role === 'dealer' ? 'معرض سيارات' : 'مستخدم عادي'}</p>
              
              <div className="flex items-center justify-center gap-1 text-accent font-bold mb-6">
                <Star className="w-5 h-5 fill-accent" />
                <span>{currentProfile.rating?.toFixed(1) || '0.0'}</span>
                <span className="text-muted-foreground font-normal text-sm">({currentProfile.reviewCount || 0} تقييم)</span>
              </div>

              {!isEditing ? (
                <div className="w-full space-y-3 mb-6 text-right">
                  <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                    <Phone className="w-5 h-5 text-primary" />
                    <span dir="ltr">{currentProfile.phone || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground p-3 bg-secondary/30 rounded-xl">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>{currentProfile.province} {currentProfile.city ? `، ${currentProfile.city}` : ''}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="rounded-xl w-full">
                      <Edit3 className="w-4 h-4 ml-2" /> تعديل
                    </Button>
                    <Button variant="destructive" variant="outline" onClick={logout} className="rounded-xl w-full text-destructive hover:text-destructive">
                      <LogOut className="w-4 h-4 ml-2" /> تسجيل خروج
                    </Button>
                  </div>
                  {currentProfile.role === 'admin' && (
                    <Link href="/admin">
                      <Button className="w-full mt-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                        <Settings className="w-4 h-4 ml-2" /> لوحة الإدارة
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="w-full space-y-4 text-right mb-6">
                  <div>
                    <label className="text-sm font-bold text-foreground mb-1 block">الاسم</label>
                    <input 
                      type="text" 
                      value={editForm.name} 
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" 
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-foreground mb-1 block">رقم الهاتف</label>
                    <input 
                      type="text" 
                      value={editForm.phone} 
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" 
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-foreground mb-1 block">المحافظة</label>
                      <input 
                        type="text" 
                        value={editForm.province} 
                        onChange={e => setEditForm({...editForm, province: e.target.value})}
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground mb-1 block">المدينة</label>
                      <input 
                        type="text" 
                        value={editForm.city} 
                        onChange={e => setEditForm({...editForm, city: e.target.value})}
                        className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 focus:border-primary outline-none" 
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 rounded-xl" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-xl">
                      إلغاء
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-2 space-y-8">
          {/* User's Listings */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">إعلاناتي</h3>
              <Link href="/add-listing">
                <Button variant="outline" size="sm" className="rounded-xl">إضافة إعلان جديد</Button>
              </Link>
            </div>
            
            {loadingCars ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !userCars?.cars || userCars.cars.length === 0 ? (
              <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <p>لا يوجد لديك أي إعلانات حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {userCars.cars.map(car => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            )}
          </div>

          {/* User's Reviews */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">التقييمات</h3>
            {loadingReviews ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !reviews || reviews.length === 0 ? (
              <div className="bg-card border rounded-2xl p-10 text-center text-muted-foreground shadow-sm">
                <p>لا يوجد تقييمات حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-card border rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-foreground">{review.reviewer?.name || 'مستخدم'}</div>
                      <div className="flex text-accent">
                        {Array.from({length: 5}).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-accent' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
                    <div className="text-xs text-muted-foreground/60 mt-3">
                      {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}