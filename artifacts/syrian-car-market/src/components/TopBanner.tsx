import { useEffect, useState } from "react";

const items = [
  "﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾",
  "سبحان الله وبحمده، سبحان الله العظيم",
  "قال ﷺ: «إنما الأعمال بالنيات»",
  "﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾",
  "أذكر الله في كل حال — لا حول ولا قوة إلا بالله",
  "قال ﷺ: «الدين النصيحة»",
];

export function TopBanner() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 py-1.5 px-4 text-center overflow-hidden">
      <p
        className="text-sm font-medium text-primary transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {items[index]}
      </p>
    </div>
  );
}
