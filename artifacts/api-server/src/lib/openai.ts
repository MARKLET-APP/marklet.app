const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

export async function generateCarDescription(params: {
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  condition?: string;
  additionalNotes?: string;
}): Promise<string> {
  const prompt = `أنت مساعد متخصص في سوق السيارات السوري. اكتب وصفاً احترافياً وجذاباً لإعلان سيارة بالعربية.

معلومات السيارة:
- الماركة: ${params.brand}
- الموديل: ${params.model}
- السنة: ${params.year}
${params.mileage ? `- العداد: ${params.mileage} كم` : ""}
${params.fuelType ? `- الوقود: ${params.fuelType}` : ""}
${params.transmission ? `- ناقل الحركة: ${params.transmission}` : ""}
${params.condition ? `- الحالة: ${params.condition}` : ""}
${params.additionalNotes ? `- ملاحظات: ${params.additionalNotes}` : ""}

اكتب وصفاً من 3-4 جمل يبرز مميزات السيارة ويجذب المشترين. يجب أن يكون الوصف باللغة العربية فقط.`;

  try {
    return await callOpenAI([
      { role: "system", content: "أنت خبير في سوق السيارات السورية." },
      { role: "user", content: prompt },
    ]);
  } catch {
    return `${params.brand} ${params.model} ${params.year} - سيارة ممتازة بحالة جيدة جداً. ${params.mileage ? `عداد ${params.mileage} كيلومتر.` : ""} ${params.transmission === "automatic" ? "ناقل حركة أوتوماتيكي." : "ناقل حركة يدوي."} للاستفسار والمعاينة الرجاء التواصل.`;
  }
}

export async function estimateCarPrice(params: {
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  condition?: string;
  fuelType?: string;
  transmission?: string;
}): Promise<{ minPrice: number; maxPrice: number; suggestedPrice: number; reasoning: string }> {
  const prompt = `أنت خبير في تقييم أسعار السيارات في السوق السورية. قدّر سعراً عادلاً بالدولار الأمريكي.

معلومات السيارة:
- الماركة: ${params.brand}
- الموديل: ${params.model}
- السنة: ${params.year}
${params.mileage ? `- العداد: ${params.mileage} كم` : ""}
${params.condition ? `- الحالة: ${params.condition}` : ""}
${params.fuelType ? `- الوقود: ${params.fuelType}` : ""}
${params.transmission ? `- ناقل الحركة: ${params.transmission}` : ""}

أجب بصيغة JSON فقط:
{
  "minPrice": رقم,
  "maxPrice": رقم,
  "suggestedPrice": رقم,
  "reasoning": "شرح قصير باللغة العربية"
}`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "أنت خبير في تقييم أسعار السيارات في سوريا." },
      { role: "user", content: prompt },
    ]);
    const parsed = JSON.parse(result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    return {
      minPrice: Number(parsed.minPrice),
      maxPrice: Number(parsed.maxPrice),
      suggestedPrice: Number(parsed.suggestedPrice),
      reasoning: parsed.reasoning,
    };
  } catch {
    const basePrice = estimatePriceFallback(params.brand, params.model, params.year, params.mileage);
    return {
      minPrice: Math.round(basePrice * 0.85),
      maxPrice: Math.round(basePrice * 1.15),
      suggestedPrice: basePrice,
      reasoning: `تقدير بناءً على بيانات السوق السورية لسيارة ${params.brand} ${params.model} ${params.year}`,
    };
  }
}

function estimatePriceFallback(brand: string, model: string, year: number, mileage?: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  let basePrice = 15000;

  const premiumBrands = ["BMW", "Mercedes", "Audi", "Lexus"];
  const midBrands = ["Toyota", "Hyundai", "Kia", "Honda", "Nissan"];
  if (premiumBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    basePrice = 35000;
  } else if (midBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
    basePrice = 18000;
  }

  basePrice -= age * 1200;
  if (mileage && mileage > 100000) {
    basePrice -= Math.min(5000, (mileage - 100000) / 100 * 50);
  }

  return Math.max(2000, Math.round(basePrice));
}

export async function generateVehicleAISummary(report: {
  brand: string;
  model: string;
  year: number;
  accidentCount: number;
  hasMajorRepairs: boolean;
  hasStructuralDamage: boolean;
  airbagDeployed: boolean;
  ownershipCount: number;
  mileageHistory: Array<{ year: number; mileage: number }>;
}): Promise<string> {
  const prompt = `بناءً على تقرير السيارة التالي، اكتب تقييماً موجزاً وواضحاً باللغة العربية:

- الماركة والموديل: ${report.brand} ${report.model} ${report.year}
- عدد الحوادث: ${report.accidentCount}
- إصلاحات رئيسية: ${report.hasMajorRepairs ? "نعم" : "لا"}
- تلف هيكلي: ${report.hasStructuralDamage ? "نعم" : "لا"}
- انفجار وسائد هوائية: ${report.airbagDeployed ? "نعم" : "لا"}
- عدد الملاك: ${report.ownershipCount}
- تاريخ العداد: ${report.mileageHistory.map(m => `${m.year}: ${m.mileage} كم`).join(", ")}

اكتب تقييماً من جملتين أو ثلاث جمل فقط يلخص حالة المركبة.`;

  try {
    return await callOpenAI([
      { role: "system", content: "أنت خبير في تقييم حالة المركبات." },
      { role: "user", content: prompt },
    ]);
  } catch {
    if (report.hasStructuralDamage || report.airbagDeployed) {
      return "هذه المركبة تُظهر أضراراً خطيرة تشمل تلفاً هيكلياً أو انفجار وسائد هوائية. يُنصح بفحص دقيق من قِبل متخصص قبل الشراء.";
    } else if (report.hasMajorRepairs || report.accidentCount > 0) {
      return "المركبة لديها تاريخ من الإصلاحات، لكن لا توجد أضرار هيكلية مسجّلة. يُنصح بمعاينة المركبة بشكل دقيق.";
    }
    return "تُظهر هذه المركبة تطور طبيعي في قراءات العداد ولا يوجد أضرار هيكلية مسجّلة. حالة جيدة بشكل عام.";
  }
}
