import { Search, Heart, Bell, Car, MapPin, Fuel, Settings2, ChevronLeft } from "lucide-react";

const cars = [
  { id: 1, brand: "تويوتا", model: "كامري", year: 2022, price: "12,500", city: "دمشق", fuel: "بنزين", km: "45,000", badge: null },
  { id: 2, brand: "كيا", model: "سيراتو", year: 2021, price: "9,800", city: "حلب", fuel: "بنزين", km: "62,000", badge: "مميز" },
  { id: 3, brand: "هيونداي", model: "تاكسون", year: 2023, price: "18,000", city: "دمشق", fuel: "هايبرد", km: "12,000", badge: null },
];

const cats = ["الكل", "للبيع", "للإيجار", "قطع غيار"];

export function Current() {
  return (
    <div dir="rtl" className="min-h-screen font-sans" style={{ background: "#062f2f", color: "white", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#051f1f", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "#16a34a", borderRadius: "8px", padding: "6px 10px", fontWeight: "bold", fontSize: "16px" }}>M</div>
          <span style={{ fontWeight: "bold", fontSize: "18px" }}>MARKLET</span>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Bell size={20} color="#9ca3af" />
          <Heart size={20} color="#9ca3af" />
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: "16px" }}>
        <div style={{ background: "#0a3030", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Search size={18} color="#6b7280" />
          <span style={{ color: "#6b7280", fontSize: "14px" }}>ابحث عن سيارة...</span>
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: "0 16px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
        {cats.map((cat, i) => (
          <div key={i} style={{
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            background: i === 0 ? "#16a34a" : "#0a3030",
            color: i === 0 ? "white" : "#9ca3af",
          }}>{cat}</div>
        ))}
      </div>

      {/* Featured badge */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: "bold", fontSize: "15px" }}>أحدث الإعلانات</span>
        <span style={{ color: "#16a34a", fontSize: "13px" }}>عرض الكل</span>
      </div>

      {/* Car Cards */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {cars.map(car => (
          <div key={car.id} style={{ background: "#0a3030", borderRadius: "14px", overflow: "hidden", border: "1px solid #164444" }}>
            {/* Image placeholder */}
            <div style={{ height: "140px", background: "linear-gradient(135deg, #0f4444, #0d5c3c)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Car size={48} color="#1a6b35" />
              {car.badge && (
                <div style={{
                  position: "absolute", top: "8px", right: "8px",
                  background: "#C9861A", color: "white",
                  padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold"
                }}>{car.badge}</div>
              )}
            </div>
            {/* Info */}
            <div style={{ padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "15px" }}>{car.brand} {car.model} {car.year}</div>
                  <div style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                    <MapPin size={11} />{car.city}
                  </div>
                </div>
                <div style={{ color: "#16a34a", fontWeight: "bold", fontSize: "16px" }}>${car.price}</div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <span style={{ color: "#6b7280", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Fuel size={11} />{car.fuel}
                </span>
                <span style={{ color: "#6b7280", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Settings2 size={11} />{car.km} كم
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div style={{ marginTop: "20px", background: "#051f1f", padding: "12px 0", display: "flex", justifyContent: "space-around", borderTop: "1px solid #164444" }}>
        {["الرئيسية", "إعلاناتي", "نشر", "المفضلة", "حسابي"].map((item, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "11px", color: i === 0 ? "#16a34a" : "#6b7280" }}>
            <div style={{ fontSize: "18px", marginBottom: "3px" }}>{["🏠","📋","➕","❤️","👤"][i]}</div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
