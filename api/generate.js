const HF_API_KEY = "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";

const REGION_PROMPTS = {
  "القبائل":   "person wearing traditional Kabyle Berber costume, colorful embroidered dress, silver jewelry, Amazigh clothing, mountain village background",
  "تلمسان":    "person wearing traditional Tlemcen chedda dress, gold embroidery, Andalusian Moorish costume, palace background",
  "جانت":      "person wearing traditional Tuareg indigo blue robes and turban, Sahara desert background",
  "بسكرة":     "person wearing traditional Algerian burnous white robe, palm oasis background",
  "قسنطينة":   "person wearing traditional Constantine embroidered costume, suspended bridges background",
  "الأوراس":   "person wearing traditional Chaoui costume, colorful woven dress, silver ornaments, mountain background",
  "وهران":     "person wearing traditional Oran embroidered costume, Mediterranean sea background",
  "ميزاب":     "person wearing traditional Mozabite white modest dress, ancient Ghardaia city background",
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

    const prompt = REGION_PROMPTS[region] || "person wearing traditional Algerian costume";

    // تحويل base64 إلى blob
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // استخدام Hugging Face img2img
    const formData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: "image/jpeg" });
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 20,
            guidance_scale: 7.5,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    // الناتج صورة binary
    const imageArrayBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(imageArrayBuffer).toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64Result}`;

    return res.status(200).json({ imageUrl });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
