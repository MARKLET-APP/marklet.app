export function Comparison() {
  const names = [
    {
      ar: "واجد",
      en: "WAJED",
      rating: 5,
      tagline: "شو واجد معك؟",
      desc: "من اللهجة الشامية — يعبّر عن السوق الحي الذي تجد فيه كل شيء. قصير، مرح، قريب من المستخدم.",
      color: "#16a34a",
      badge: null,
      icon: (
        <svg viewBox="0 0 56 56" width="50" height="50" fill="none">
          <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="3.5"/>
          <line x1="34" y1="34" x2="50" y2="50" stroke="#C9861A" strokeWidth="4.5" strokeLinecap="round"/>
          <text x="17" y="30" fill="white" fontSize="16" fontWeight="bold" fontFamily="Georgia,serif">W</text>
        </svg>
      ),
    },
    {
      ar: "دبّر",
      en: "DABBER",
      rating: 4,
      tagline: "دبّر حالك من هون",
      desc: "تعبير شامي أصيل يعني \"حلّ احتياجك هنا\" — طريف ومحبوب، لكن أقل رسمية كعلامة تجارية.",
      color: "#f59e0b",
      badge: null,
      icon: (
        <svg viewBox="0 0 56 56" width="50" height="50" fill="none">
          <rect x="8" y="8" width="40" height="40" rx="11" stroke="white" strokeWidth="3"/>
          <text x="15" y="38" fill="#C9861A" fontSize="22" fontWeight="bold" fontFamily="Georgia,serif">D</text>
          <circle cx="40" cy="16" r="6" fill="#C9861A"/>
          <text x="37" y="20" fill="white" fontSize="10" fontWeight="bold">✓</text>
        </svg>
      ),
    },
    {
      ar: "تاجر",
      en: "TAJIR",
      rating: 4,
      tagline: "سوق كل تاجر",
      desc: "كلمة عربية خالدة تمنح المنصة مصداقية فورية — موثوق ومهني، ويناسب جميع الفئات.",
      color: "#60a5fa",
      badge: null,
      icon: (
        <svg viewBox="0 0 56 56" width="50" height="50" fill="none">
          <polygon points="28,6 52,46 4,46" stroke="white" strokeWidth="3" fill="none" strokeLinejoin="round"/>
          <text x="20" y="42" fill="#C9861A" fontSize="18" fontWeight="bold" fontFamily="Georgia,serif">T</text>
        </svg>
      ),
    },
    {
      ar: "سند",
      en: "SANAD",
      rating: 5,
      tagline: "سندك في كل صفقة",
      desc: "وثيقة ملكية + دعم وثقة — اسم فريد وعميق المعنى، يحمل الأمان والضمان في كل معاملة.",
      color: "#C9861A",
      badge: "⭐ الأقوى",
      icon: (
        <svg viewBox="0 0 56 56" width="50" height="50" fill="none">
          <rect x="12" y="6" width="32" height="42" rx="5" stroke="white" strokeWidth="3"/>
          <line x1="18" y1="20" x2="38" y2="20" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="18" y1="28" x2="38" y2="28" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="18" y1="36" x2="30" y2="36" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="42" cy="42" r="9" fill="#16a34a"/>
          <text x="38.5" y="46.5" fill="white" fontSize="11" fontWeight="bold">✓</text>
        </svg>
      ),
    },
    {
      ar: "كلاسيا",
      en: "CLASSIA",
      rating: 3,
      tagline: "Classifieds × Syria",
      desc: "دمج إبداعي بين Classifieds وSyria — عصري وقابل للتوسع دولياً، لكن أقل عمقاً محلياً.",
      color: "#a78bfa",
      badge: null,
      icon: (
        <svg viewBox="0 0 56 56" width="50" height="50" fill="none">
          <circle cx="28" cy="28" r="20" stroke="white" strokeWidth="3"/>
          <text x="16" y="36" fill="#C9861A" fontSize="20" fontWeight="bold" fontFamily="Georgia,serif">C</text>
          <line x1="34" y1="16" x2="46" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="46" cy="10" r="4" fill="#C9861A"/>
        </svg>
      ),
    },
  ];

  const stars = (n: number) =>
    [1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= n ? "#C9861A" : "#1a4040", fontSize: "18px", lineHeight: 1 }}>★</span>
    ));

  return (
    <div dir="rtl" style={{
      background: "#062f2f",
      padding: "32px 28px 28px",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{
          display: "inline-block",
          background: "#0a3535",
          border: "1px solid #16a34a44",
          borderRadius: "20px",
          padding: "4px 16px",
          fontSize: "12px",
          color: "#16a34a",
          letterSpacing: "2px",
          fontWeight: "700",
          marginBottom: "12px",
        }}>اختيار الاسم التجاري</div>
        <div style={{ fontSize: "28px", fontWeight: "bold", color: "white", marginBottom: "6px", lineHeight: 1.2 }}>
          مقارنة الأسماء المقترحة
        </div>
        <div style={{ fontSize: "13px", color: "#4a7a6a", letterSpacing: "1px" }}>Brand Name Comparison</div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {names.map((n, i) => (
          <div key={i} style={{
            background: n.rating === 5 ? "#0c3535" : "#0a2e2e",
            borderRadius: "18px",
            padding: "20px 18px",
            border: `1.5px solid ${n.rating === 5 ? n.color + "66" : "#163333"}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "18px",
            position: "relative",
          }}>
            {/* Badge */}
            {n.badge && (
              <div style={{
                position: "absolute", top: "14px", left: "16px",
                background: "linear-gradient(135deg, #C9861A, #e8a835)",
                color: "white",
                padding: "3px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 8px #C9861A44",
              }}>{n.badge}</div>
            )}

            {/* Icon */}
            <div style={{
              width: "72px",
              height: "72px",
              background: "#062f2f",
              borderRadius: "16px",
              border: `2px solid ${n.color}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 4px 16px ${n.color}22`,
            }}>
              {n.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "26px", fontWeight: "800", color: "white", lineHeight: 1 }}>{n.ar}</span>
                <span style={{
                  fontSize: "13px",
                  color: n.color,
                  fontWeight: "700",
                  letterSpacing: "3px",
                  background: n.color + "18",
                  padding: "2px 10px",
                  borderRadius: "8px",
                }}>{n.en}</span>
              </div>
              <div style={{
                fontSize: "13px",
                color: "#C9861A",
                marginBottom: "8px",
                fontStyle: "italic",
                opacity: 0.9,
              }}>"{n.tagline}"</div>
              <div style={{
                fontSize: "13px",
                color: "#6a9a8a",
                lineHeight: "1.7",
                marginBottom: "10px",
              }}>{n.desc}</div>
              <div style={{ display: "flex", gap: "2px" }}>{stars(n.rating)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer recommendation */}
      <div style={{
        marginTop: "24px",
        padding: "20px",
        background: "linear-gradient(135deg, #0c3535, #0a2520)",
        borderRadius: "16px",
        textAlign: "center",
        border: "1.5px solid #C9861A55",
        boxShadow: "0 4px 24px #C9861A18",
      }}>
        <div style={{ fontSize: "12px", color: "#6a9a8a", marginBottom: "8px", letterSpacing: "1px" }}>
          ✦ التوصية النهائية ✦
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#C9861A", marginBottom: "4px" }}>
          سند &nbsp;·&nbsp; SANAD
        </div>
        <div style={{
          fontSize: "13px",
          color: "#4a7a6a",
          display: "flex",
          justifyContent: "center",
          gap: "16px",
        }}>
          <span>✓ فريد</span>
          <span>✓ موثوق</span>
          <span>✓ قابل للتوسع</span>
        </div>
      </div>
    </div>
  );
}
