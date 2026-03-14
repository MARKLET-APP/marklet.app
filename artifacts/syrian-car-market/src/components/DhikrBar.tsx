import { useState, useEffect } from "react";

const adhkar = [
  "سبحان الله",
  "الحمد لله",
  "الله أكبر",
  "لا إله إلا الله",
  "سبحان الله وبحمده",
  "سبحان الله العظيم",
  "لا حول ولا قوة إلا بالله",
  "أستغفر الله",
  "اللهم صل وسلم على نبينا محمد",
  "اللهم اغفر لي ولوالدي",
  "اللهم ارزقني رزقاً طيباً",
  "اللهم بارك لي في يومي",
  "اللهم اجعل هذا اليوم خيراً",
  "اللهم إني أسألك العافية",
  "اللهم إني أسألك الجنة",
  "اللهم قني عذاب النار",
  "اللهم اهدني وسددني",
  "اللهم اغفر للمؤمنين والمؤمنات",
  "اللهم اشرح صدري",
  "اللهم يسر أمري",
  "اللهم ارزقني الحكمة",
  "اللهم اجعلني من الصالحين",
  "اللهم تقبل منا",
  "اللهم احفظ بلادنا وأهلنا",
  "قال ﷺ: إنما الأعمال بالنيات",
];

export function DhikrBar() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * adhkar.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % adhkar.length);
        setVisible(true);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#eaf7ef] border-b border-[#c8e6d4] py-1.5 px-4 text-center overflow-hidden">
      <p
        className="text-sm font-medium text-[#2f6d4f] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {adhkar[index]}
      </p>
    </div>
  );
}
