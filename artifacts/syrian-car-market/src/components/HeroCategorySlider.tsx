// UI_ID: COMP_HERO_CATEGORY_SLIDER_01
// NAME: منزلق فئات الهيرو — يتنقل بين فئات السوق بنفس تصميم صورة السيارة

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Building2, Briefcase, Hash, Wrench, Bike, type LucideIcon } from "lucide-react";

/* ── إعدادات كل شريحة ─────────────────────────────────────── */
interface Slide {
  key: string;
  label: string;
  Icon: LucideIcon;
  bgColor: string;       // لون الهالة الخلفية
  accentColor: string;   // لون الأيقونة
  isCarSlide?: boolean;  // الشريحة الأولى تستخدم صورة hero-car.png
}

const SLIDES: Slide[] = [
  {
    key: "cars",
    label: "سيارات",
    Icon: Car,
    bgColor: "rgba(26,107,53,0.35)",
    accentColor: "#4ade80",
    isCarSlide: true,
  },
  {
    key: "real-estate",
    label: "عقارات",
    Icon: Building2,
    bgColor: "rgba(201,134,26,0.30)",
    accentColor: "#fbbf24",
  },
  {
    key: "jobs",
    label: "وظائف",
    Icon: Briefcase,
    bgColor: "rgba(59,130,246,0.28)",
    accentColor: "#93c5fd",
  },
  {
    key: "plates",
    label: "لوحات",
    Icon: Hash,
    bgColor: "rgba(168,85,247,0.28)",
    accentColor: "#c4b5fd",
  },
  {
    key: "parts",
    label: "قطع غيار",
    Icon: Wrench,
    bgColor: "rgba(239,68,68,0.25)",
    accentColor: "#fca5a5",
  },
  {
    key: "bikes",
    label: "دراجات",
    Icon: Bike,
    bgColor: "rgba(20,184,166,0.28)",
    accentColor: "#5eead4",
  },
];

const SLIDE_DURATION = 4000; // ms بين الشرائح

/* ── SVG الهيكل الخلفي لكل فئة ─────────────────────────────── */
function CategoryOutlineSVG({ slide }: { slide: Slide }) {
  const { Icon } = slide;
  // نعيد رسم الأيقونة كخلفية شفافة بنفس طريقة car-outline.svg
  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{ opacity: 0.06 }}
    >
      <Icon
        size={420}
        strokeWidth={0.6}
        color="white"
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

/* ── البطاقة المرئية لكل فئة (Desktop — تحل مكان hero-car.png) ── */
function DesktopSlideGraphic({
  slide,
  baseUrl,
}: {
  slide: Slide;
  baseUrl: string;
}) {
  if (slide.isCarSlide) {
    return (
      <img
        src={`${baseUrl}assets/hero-car.png`}
        alt="سيارة"
        style={{
          width: "520px",
          opacity: 0.92,
          filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.4))",
        }}
      />
    );
  }

  const { Icon, bgColor, accentColor, label } = slide;
  return (
    <div
      style={{
        width: 320,
        height: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        position: "relative",
      }}
    >
      {/* هالة خلفية */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: bgColor,
          filter: "blur(40px)",
        }}
      />
      {/* دائرة الأيقونة */}
      <div
        style={{
          position: "relative",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
          border: `2px solid ${accentColor}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
          boxShadow: `0 0 60px ${bgColor}, inset 0 1px 1px rgba(255,255,255,0.1)`,
        }}
      >
        <Icon size={110} color={accentColor} strokeWidth={1.2} />
      </div>
      {/* التسمية */}
      <div
        style={{
          position: "relative",
          color: accentColor,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 2,
          textShadow: `0 2px 12px ${bgColor}`,
          direction: "rtl",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── البطاقة المرئية للموبايل (تظهر داخل الـ Hero بدل الإخفاء) ── */
function MobileSlideGraphic({ slide }: { slide: Slide }) {
  const { Icon, bgColor, accentColor, label } = slide;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: `1.5px solid ${accentColor}50`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 32px ${bgColor}`,
        }}
      >
        <Icon size={50} color={accentColor} strokeWidth={1.4} />
      </div>
      <span
        style={{
          color: accentColor,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: 1,
          direction: "rtl",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── المكوّن الرئيسي ──────────────────────────────────────── */
export function HeroCategorySlider({ baseUrl }: { baseUrl: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((i) => (i + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[current];

  return (
    <>
      {/* ── خلفية الهيكل الشفاف — تتبدل مع الفئة ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`outline-${slide.key}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none"
        >
          {slide.isCarSlide ? (
            /* السيارة تستخدم car-outline.svg الأصلي */
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url("${baseUrl}assets/car-outline.svg")`,
                backgroundSize: "650px",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                opacity: 0.05,
                animation: "backgroundMove 30s linear infinite",
              }}
            />
          ) : (
            <CategoryOutlineSVG slide={slide} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── الصورة / الأيقونة الكبيرة — Desktop ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`desktop-${slide.key}`}
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          className="absolute hidden md:flex items-end justify-center pointer-events-none"
          style={{
            bottom: slide.isCarSlide ? "-40px" : "10px",
            right: "5%",
            zIndex: 1,
            animation: "carFloat 6s ease-in-out infinite",
          }}
        >
          <DesktopSlideGraphic slide={slide} baseUrl={baseUrl} />
        </motion.div>
      </AnimatePresence>

      {/* ── الأيقونة الصغيرة — Mobile فقط (absolute في الجزء العلوي الأيمن) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`mobile-${slide.key}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="md:hidden absolute pointer-events-none"
          style={{ top: 16, right: 16, zIndex: 20 }}
        >
          <MobileSlideGraphic slide={slide} />
        </motion.div>
      </AnimatePresence>

      {/* ── نقاط التنقل ── */}
      <div
        className="absolute flex gap-1.5 pointer-events-none"
        style={{
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            style={{
              width: i === current ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === current ? slide.accentColor : "rgba(255,255,255,0.3)",
              transition: "all 0.4s ease",
            }}
          />
        ))}
      </div>
    </>
  );
}
