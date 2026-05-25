// ═══════════════════════════════════════════════
//  سيرفر تراث الجزائر — Vercel Serverless Function
//  يستقبل طلب التلبيس ويرسله لـ Replicate API
// ═══════════════════════════════════════════════

const REPLICATE_API_KEY = "r8_EKbgyJBZsAYIyKV8ROzZj380IxDholx4Uv2Hb";

export default async function handler(req, res) {
  // السماح بالطلبات من أي موقع (CORS)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // طلب OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, region } = req.body;

    if (!imageBase64 || !region) {
      return res.status(400).json({ error: "imageBase64 و region مطلوبان" });
    }

    // وصف اللباس حسب المنطقة
    const regionPrompts = {
      "القبائل":   "wearing traditional Kabyle Berber costume, colorful embroidered dress with silver jewelry, traditional Amazigh clothing, village background",
      "تلمسان":    "wearing traditional Tlemcen Andalusian costume, elegant chedda dress with gold embroidery, Moorish palace background",
      "جانت":      "wearing traditional Tuareg clothing, indigo blue robes and turban, Sahara desert Tassili background",
      "بسكرة":     "wearing traditional Saharan Algerian burnous, white robe with camel wool, palm oasis background",
      "قسنطينة":   "wearing traditional Constantine costume, embroidered velvet dress, suspended bridges background",
      "الأوراس":   "wearing traditional Chaoui Aures costume, colorful woven dress with silver ornaments, mountain background",
      "وهران":     "wearing traditional Oran coastal costume, elegant embroidered clothing, Mediterranean sea background",
      "الهقار":    "wearing traditional Tuareg Hoggar blue robes, silver jewelry, volcanic mountain background",
      "ميزاب":     "wearing traditional Mozabite white costume, elegant modest dress, ancient Ghardaia city background",
      "سطيف":      "wearing traditional Setif Algerian costume, embroidered traditional dress, Roman ruins background",
    };

    const prompt = regionPrompts[region] ||
      "wearing traditional Algerian costume, beautiful embroidered traditional clothing, Algerian heritage background";

    // إرسال طلب لـ Replicate
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "wait"
      },
      body: JSON.stringify({
        version: "854e8727697a057c525cdb45ab037f64ecca770a658769d47da539234aa29a45",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
          prompt: prompt,
          negative_prompt: "ugly, deformed, blurry, bad anatomy, wrong face",
          num_inference_steps: 30,
          guidance_scale: 7.5,
          strength: 0.75,
        }
      })
    });

    const data = await replicateRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error });
    }

    // إذا احتاج polling
    if (data.status === "starting" || data.status === "processing") {
      // انتظر النتيجة
      let result = data;
      let attempts = 0;
      while (result.status !== "succeeded" && result.status !== "failed" && attempts < 30) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { "Authorization": `Bearer ${REPLICATE_API_KEY}` }
        });
        result = await pollRes.json();
        attempts++;
      }

      if (result.status === "succeeded" && result.output) {
        return res.status(200).json({ imageUrl: result.output[0] || result.output });
      } else {
        return res.status(500).json({ error: "فشل توليد الصورة" });
      }
    }

    // نتيجة فورية
    if (data.output) {
      return res.status(200).json({ imageUrl: data.output[0] || data.output });
    }

    return res.status(500).json({ error: "لم تُولَّد صورة" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
