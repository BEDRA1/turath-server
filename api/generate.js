const REPLICATE_API_KEY = "r8_EKbgyJBZsAYIyKV8ROzZj380IxDholx4Uv2Hb";

const REGION_PROMPTS = {
  "القبائل":   "wearing traditional Kabyle Berber costume, colorful embroidered dress, silver jewelry, mountain village background, professional photo",
  "تلمسان":    "wearing traditional Tlemcen chedda dress, gold embroidery, Andalusian costume, palace background, professional photo",
  "جانت":      "wearing traditional Tuareg blue robes and turban, Sahara desert background, professional photo",
  "بسكرة":     "wearing traditional Algerian burnous white robe, palm oasis background, professional photo",
  "قسنطينة":   "wearing traditional Constantine embroidered costume, bridges background, professional photo",
  "الأوراس":   "wearing traditional Chaoui costume, colorful woven dress, mountain background, professional photo",
  "وهران":     "wearing traditional Oran embroidered costume, Mediterranean sea background, professional photo",
  "ميزاب":     "wearing traditional Mozabite white dress, ancient Ghardaia city background, professional photo",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, region } = req.body;
    if (!imageBase64 || !region) {
      return res.status(400).json({ error: "imageBase64 و region مطلوبان" });
    }

    const prompt = REGION_PROMPTS[region] || "wearing traditional Algerian costume, professional photo";
    const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

    // إنشاء prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9a9b6aa5ac2793993aaaff48fd0e05fc5be213bc85a0bafd24e578d3bb81e628",
        input: {
          image: imageDataUrl,
          prompt: prompt,
          negative_prompt: "ugly, deformed, blurry, bad face, extra limbs, watermark",
          num_inference_steps: 15,
          guidance_scale: 7,
          prompt_strength: 0.55,
          scheduler: "K_EULER"
        }
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Replicate error: ${errText}`);
    }

    const prediction = await createRes.json();
    if (prediction.error) throw new Error(prediction.error);

    // Polling مع timeout أقل
    let result = prediction;
    const maxWait = 240000; // 4 دقائق
    const startTime = Date.now();

    while (
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      Date.now() - startTime < maxWait
    ) {
      await new Promise(r => setTimeout(r, 4000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { "Authorization": `Bearer ${REPLICATE_API_KEY}` } }
      );
      result = await pollRes.json();
    }

    if (result.status === "succeeded" && result.output) {
      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      return res.status(200).json({ imageUrl });
    }

    throw new Error(result.error || "فشل توليد الصورة - حاول مرة أخرى");

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
