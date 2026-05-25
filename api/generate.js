const REPLICATE_API_KEY = "r8_EKbgyJBZsAYIyKV8ROzZj380IxDholx4Uv2Hb";

const REGION_PROMPTS = {
  "القبائل":   "wearing traditional Kabyle Berber costume with colorful embroidered dress and silver jewelry, Amazigh traditional clothing, mountain village background, professional photo",
  "تلمسان":    "wearing traditional Tlemcen Algerian chedda dress with gold embroidery, elegant Andalusian Moorish costume, palace background, professional photo",
  "جانت":      "wearing traditional Tuareg indigo blue robes and turban, Sahara desert Tassili background, professional photo",
  "بسكرة":     "wearing traditional Algerian Saharan burnous white robe, palm oasis background, professional photo",
  "قسنطينة":   "wearing traditional Constantine Algerian embroidered costume, suspended bridges background, professional photo",
  "الأوراس":   "wearing traditional Chaoui Aures Algerian costume with colorful woven dress and silver ornaments, mountain background, professional photo",
  "وهران":     "wearing traditional Oran Algerian coastal embroidered costume, Mediterranean sea background, professional photo",
  "ميزاب":     "wearing traditional Mozabite white Algerian modest dress, ancient Ghardaia city background, professional photo",
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

    const prompt = REGION_PROMPTS[region] || "wearing traditional Algerian heritage costume, professional photo";

    // استخدام نموذج stability-ai/stable-diffusion-img2img
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
          negative_prompt: "ugly, deformed, blurry, bad face, extra limbs, disfigured",
          num_inference_steps: 20,
          guidance_scale: 7.5,
          prompt_strength: 0.6,
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
