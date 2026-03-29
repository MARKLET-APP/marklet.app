import { Search, Heart, Bell, Car, MapPin, Fuel, Settings2 } from "lucide-react";

const cars = [
  { id: 1, brand: "تويوتا", model: "كامري", year: 2022, price: "12,500", city: "دمشق", fuel: "بنزين", km: "45,000", badge: null },
  { id: 2, brand: "كيا", model: "سيراتو", year: 2021, price: "9,800", city: "حلب", fuel: "بنزين", km: "62,000", badge: "مميز" },
  { id: 3, brand: "هيونداي", model: "تاكسون", year: 2023, price: "18,000", city: "دمشق", fuel: "هايبرد", km: "12,000", badge: "موثّق" },
];

const cats = ["الكل", "للبيع", "للإيجار", "قطع غيار"];

export function SilverSlate() {
  return (
    <div dir="rtl" className="min-h-screen" style={{ background: "#F8FAFC", color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>
      {/* Header - dark navy with silver logo */}
      <div style={{ background: "#0f172a", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "#1a6b35", borderRadius: "8px", padding: "6px 10px", fontWeight: "bold", fontSize: "16px", color: "white" }}>M</div>
          <span style={{ fontWeight: "bold", fontSize: "18px", color: "white" }}>MARKLET</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Bell size={20} color="#94A3B8" />
          <Heart size={20} color="#94A3B8" />
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "16px" }}>
        <div style={{ background: "white", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Search size={18} color="#94A3B8" />
          <span style={{ color: "#94A3B8", fontSize: "14px" }}>ابحث عن سيارة...</span>
        </div>
      </div>

      {/* Categories - green active on light bg */}
      <div style={{ padding: "0 16px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
        {cats.map((cat, i) => (
          <div key={i} style={{
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            background: i === 0 ? "#1a6b35" : "white",
            color: i === 0 ? "white" : "#64748B",
            border: i !== 0 ? "1px solid #E2E8F0" : "none",
          }}>{cat}</div>
        ))}
      </div>

      {/* Section title */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: "bold", fontSize: "15px", color: "#1e293b" }}>أحدث الإعلانات</span>
        <span style={{ color: "#1a6b35", fontSize: "13px" }}>عرض الكل</span>
      </div>

      {/* Car Cards - light with silver borders */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {cars.map(car => (
          <div key={car.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ height: "140px", background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Car size={48} color="#94A3B8" />
              {car.badge === "مميز" && (
                <div style={{
                  position: "absolute", top: "8px", right: "8px",
                  background: "#C9861A", color: "white",
                  padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold"
                }}>⭐ {car.badge}</div>
              )}
              {car.badge === "موثّق" && (
                <div style={{
                  position: "absolute", top: "8px", right: "8px",
                  background: "#1a6b35", color: "white",
                  padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold"
                }}>✓ {car.badge}</div>
              )}
            </div>
            <div style={{ padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "15px", color: "#1e293b" }}>{car.brand} {car.model} {car.year}</div>
                  <div style={{ color: "#64748B", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                    <MapPin size={11} />{car.city}
                  </div>
                </div>
                <div style={{ color: "#1a6b35", fontWeight: "bold", fontSize: "16px" }}>${car.price}</div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <span style={{ color: "#64748B", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Fuel size={11} />{car.fuel}
                </span>
                <span style={{ color: "#64748B", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Settings2 size={11} />{car.km} كم
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav - light */}
      <div style={{ marginTop: "20px", background: "white", padding: "12px 0", display: "flex", justifyContent: "space-around", borderTop: "1px solid #E2E8F0" }}>
        {["الرئيسية", "إعلاناتي", "نشر", "المفضلة", "حسابي"].map((item, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "11px", color: i === 0 ? "#1a6b35" : "#94A3B8" }}>
            <div style={{ fontSize: "18px", marginBottom: "3px" }}>{["🏠","📋","➕","❤️","👤"][i]}</div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
