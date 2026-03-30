export function Comparison() {
  const names = [
    {
      ar: "واجد",
      en: "WAJED",
      rating: 5,
      tagline: "شو واجد معك؟",
      desc: "من اللهجة الشامية — يعبّر عن السوق الحي الذي تجد فيه كل شيء",
      color: "#16a34a",
      icon: (
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <circle cx="20" cy="20" r="13" stroke="white" strokeWidth="3.5"/>
          <line x1="29" y1="29" x2="42" y2="42" stroke="#C9861A" strokeWidth="4" strokeLinecap="round"/>
          <text x="14" y="26" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">W</text>
        </svg>
      ),
    },
    {
      ar: "دبّر",
      en: "DABBER",
      rating: 4,
      tagline: "دبّر حالك من هون",
      desc: "تعبير شامي أصيل — حلّ احتياجك وبيعك وشرائك في مكان واحد",
      color: "#f59e0b",
      icon: (
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <rect x="6" y="6" width="36" height="36" rx="10" stroke="white" strokeWidth="3"/>
          <text x="11" y="32" fill="#C9861A" fontSize="18" fontWeight="bold" fontFamily="sans-serif">D</text>
          <circle cx="34" cy="14" r="5" fill="#C9861A"/>
          <text x="31" y="18" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">✓</text>
        </svg>
      ),
    },
    {
      ar: "تاجر",
      en: "TAJIR",
      rating: 4,
      tagline: "سوق كل تاجر",
      desc: "كلمة عربية خالدة — تمنح المنصة مصداقية وثقة فورية لدى المستخدم",
      color: "#3b82f6",
      icon: (
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <polygon points="24,4 44,38 4,38" stroke="white" strokeWidth="3" fill="none"/>
          <text x="18" y="34" fill="#C9861A" fontSize="15" fontWeight="bold" fontFamily="sans-serif">T</text>
        </svg>
      ),
    },
    {
      ar: "سند",
      en: "SANAD",
      rating: 5,
      tagline: "سندك في كل صفقة",
      desc: "وثيقة الملكية + الدعم والثقة — فريد ومميز، يحمل معنى الأمان والضمان",
      color: "#C9861A",
      icon: (
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <rect x="10" y="6" width="28" height="36" rx="5" stroke="white" strokeWidth="3"/>
          <line x1="16" y1="18" x2="32" y2="18" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="16" y1="25" x2="32" y2="25" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="16" y1="32" x2="25" y2="32" stroke="#C9861A" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="36" cy="36" r="7" fill="#16a34a"/>
          <text x="33" y="40" fill="white" fontSize="9" fontWeight="bold">✓</text>
        </svg>
      ),
    },
    {
      ar: "كلاسيا",
      en: "CLASSIA",
      rating: 3,
      tagline: "Classifieds × Syria",
      desc: "دمج بين Classifieds و Syria — عصري وقابل للتوسع خارج سوريا",
      color: "#8b5cf6",
      icon: (
        <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
          <circle cx="24" cy="24" r="18" stroke="white" strokeWidth="3"/>
          <text x="13" y="30" fill="#C9861A" fontSize="17" fontWeight="bold" fontFamily="sans-serif">C</text>
          <line x1="28" y1="16" x2="38" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="38" cy="10" r="3" fill="#C9861A"/>
        </svg>
      ),
    },
  ];

  const stars = (n: number) =>
    [1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= n ? "#C9861A" : "#2a4040", fontSize: "14px" }}>★</span>
    ));

  return (
    <div dir="rtl" style={{
      minHeight: "100vh",
      background: "#062f2f",
      padding: "28px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontSize: "13px", color: "#16a34a", letterSpacing: "3px", fontWeight: "600", marginBottom: "8px" }}>
          اختيار الاسم التجاري
        </div>
        <div style={{ fontSize: "22px", fontWeight: "bold", color: "white", marginBottom: "4px" }}>
          مقارنة الأسماء المقترحة
        </div>
        <div style={{ fontSize: "13px", color: "#4a7a5a" }}>Brand Name Comparison</div>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {names.map((n, i) => (
          <div key={i} style={{
            background: "#0a2e2e",
            borderRadius: "16px",
            padding: "16px",
            border: `1px solid ${n.rating === 5 ? n.color + "55" : "#163333"}`,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Best pick badge */}
            {n.rating === 5 && i === 3 && (
              <div style={{
                position: "absolute", top: "10px", left: "12px",
                background: "#C9861A", color: "white",
                padding: "2px 10px", borderRadius: "20px",
                fontSize: "10px", fontWeight: "bold", letterSpacing: "1px"
              }}>⭐ الأقوى</div>
            )}

            {/* Logo icon */}
            <div style={{
              width: "58px", height: "58px",
              background: "#062f2f",
              borderRadius: "14px",
              border: `2px solid ${n.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {n.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
                <span style={{ fontSize: "21px", fontWeight: "bold", color: "white" }}>{n.ar}</span>
                <span style={{ fontSize: "12px", color: n.color, fontWeight: "700", letterSpacing: "2px" }}>{n.en}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#C9861A", marginBottom: "5px", fontStyle: "italic" }}>
                "{n.tagline}"
              </div>
              <div style={{ fontSize: "12px", color: "#7a9e8e", lineHeight: "1.5" }}>
                {n.desc}
              </div>
              <div style={{ marginTop: "7px" }}>{stars(n.rating)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "22px", padding: "14px", background: "#0a2e2e",
        borderRadius: "12px", textAlign: "center",
        border: "1px solid #C9861A44"
      }}>
        <div style={{ fontSize: "12px", color: "#7a9e8e", marginBottom: "6px" }}>التوصية النهائية</div>
        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#C9861A" }}>
          سند · SANAD
        </div>
        <div style={{ fontSize: "11px", color: "#4a7a5a", marginTop: "4px" }}>
          فريد · موثوق · قابل للتوسع
        </div>
      </div>
    </div>
  );
}
