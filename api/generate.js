const REPLICATE_API_KEY = "r8_EKbgyJBZsAYIyKV8ROzZj380IxDholx4Uv2Hb";

const REGION_PROMPTS = {
  "القبائل":   "wearing traditional Kabyle Berber costume, colorful embroidered dress, silver jewelry, Amazigh clothing, mountain village background, professional photo, high quality",
  "تلمسان":    "wearing traditional Tlemcen chedda dress, gold embroidery, Andalusian Moorish costume, palace background, professional photo, high quality",
  "جانت":      "wearing traditional Tuareg indigo blue robes and turban, Sahara desert background, professional photo, high quality",
  "بسكرة":     "wearing traditional Algerian burnous white robe, palm oasis background, professional photo, high quality",
  "قسنطينة":   "wearing traditional Constantine embroidered costume, suspended bridges background, professional photo, high quality",
  "الأوراس":   "wearing traditional Chaoui costume, colorful woven dress, silver ornaments, mountain background, professional photo, high quality",
  "وهران":     "wearing traditional Oran embroidered costume, Mediterranean sea background, professional photo, high quality",
  "ميزاب":     "wearing traditional Mozabite white modest dress, ancient Ghardaia city background, professional photo, high quality",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, region } = req.body;
    if (!imageBase64 || !region) return res.status(400).json({ error: "imageBase64 و region مطلوبان" });

    const prompt = REGION_PROMPTS[region] || "wearing traditional Algerian costume, professional photo";

    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "9a9b6aa5ac2793993aaaff48fd0e05fc5be213bc85a0bafd24e578d3bb81e628",
        input: {
          image: `data:image/jpeg;base64,${imageBase64}`,
          prompt: prompt,
          negative_prompt: "ugly, deformed, blurry, bad face, extra limbs, disfigured, watermark",
          num_inference_steps: 20,
          guidance_scale: 7.5,
          prompt_strength: 0.6,
          scheduler: "K_EULER"
        }
      })
    });

    const prediction = await replicateRes.json();
    if (prediction.error) throw new Error(prediction.error);

    // Polling للنتيجة
    let result = prediction;
    let attempts = 0;
    while (result.status !== "succeeded" && result.status !== "failed" && attempts < 40) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { "Authorization": `Bearer ${REPLICATE_API_KEY}` }
      });
      result = await poll.json();
      attempts++;
    }

    if (result.status === "succeeded" && result.output) {
      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      return res.status(200).json({ imageUrl });
    }

    throw new Error(result.error || "فشل توليد الصورة");

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
