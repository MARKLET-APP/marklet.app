import { Link } from "wouter";
import { Search, ChevronLeft, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/CarCard";
import { useGetFeaturedCars, useListCars } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: featuredCars, isLoading: loadingFeatured } = useGetFeaturedCars();
  const { data: latestCars, isLoading: loadingLatest } = useListCars({ limit: 6, sortBy: 'createdAt:desc' });

  const categories = [
    { id: 'sedan', name: 'سيدان', icon: '🚗' },
    { id: 'suv', name: 'دفع رباعي', icon: '🚙' },
    { id: 'pickup', name: 'بيك أب', icon: '🛻' },
    { id: 'luxury', name: 'فاخرة', icon: '✨' },
    { id: 'electric', name: 'كهربائية', icon: '⚡' },
  ];

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Hero Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="relative z-20 max-w-3xl w-full px-6 text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-xl leading-tight"
          >
            السوق الأول لبيع وشراء <span className="text-accent">السيارات</span> في سوريا
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 drop-shadow-md"
          >
            آلاف السيارات المعروضة يومياً بأسعار تناسب الجميع، مع ميزات الذكاء الاصطناعي لتسهيل اختيارك.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-2 rounded-2xl shadow-2xl max-w-2xl mx-auto flex items-center gap-2"
          >
            <div className="flex-1 flex items-center bg-muted/50 rounded-xl px-4 py-3">
              <Search className="w-5 h-5 text-muted-foreground ms-2" />
              <input 
                type="text" 
                placeholder="ابحث عن ماركة، موديل، أو مدينة..." 
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button size="lg" className="rounded-xl px-8 font-bold text-base h-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
              بحث
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-secondary/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">موثوقية عالية</p>
              <p className="text-sm text-muted-foreground">بائعون موثقون</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">ذكاء اصطناعي</p>
              <p className="text-sm text-muted-foreground">تسعير ووصف دقيق</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">سرعة بالتواصل</p>
              <p className="text-sm text-muted-foreground">محادثات فورية</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">تصفح حسب الفئة</h2>
            <p className="text-muted-foreground mt-1">اختر الشكل الذي يناسب احتياجاتك</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={cat.id}
            >
              <Link 
                href={`/search?category=${cat.id}`}
                className="flex flex-col items-center justify-center p-6 bg-card border rounded-2xl hover-elevate group"
              >
                <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="font-bold text-foreground group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-12 bg-secondary/20 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="w-3 h-8 bg-accent rounded-full inline-block"></span>
                إعلانات مميزة
              </h2>
            </div>
            <Link href="/search?featured=true" className="text-primary font-semibold flex items-center gap-1 hover:underline">
              عرض الكل <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCars?.slice(0, 3).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Cars */}
      <section className="py-12 max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">أحدث الإعلانات</h2>
            <p className="text-muted-foreground mt-1">سيارات أضيفت مؤخراً للسوق</p>
          </div>
          <Link href="/search" className="text-primary font-semibold flex items-center gap-1 hover:underline">
            تصفح السوق <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>

        {loadingLatest ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {latestCars?.cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* Vehicle Report CTA */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">قبل أن تشتري، تأكد من تاريخ المركبة</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              استخدم خدمة تقرير المركبة للحصول على سجل الحوادث، العداد، والحالة الفنية المدعومة بالذكاء الاصطناعي عبر إدخال رقم الشاسيه.
            </p>
            <Link href="/vehicle-info">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold text-lg px-8 rounded-xl shadow-xl hover:-translate-y-1 transition-transform">
                استعلم عن مركبة الآن
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
