import { NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_API_KEY);

export async function POST(request: Request) {
  try {
    const { imageBase64, productName, details } = await request.json();

    // Extract raw base64 data for Hugging Face
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const buffer = Buffer.from(base64Data, "base64");

    // 1. Analyze the image using a reliable free Vision model
    let imageDescription = "A product photo";
    try {
      const captionResult = await hf.imageToText({
        data: buffer,
        model: "nlpconnect/vit-gpt2-image-captioning", // Reliable free model
      });
      imageDescription = captionResult.generated_text;
    } catch (imgError) {
      console.log("Image captioning failed, using fallback:", imgError);
    }

    // 2. Generate the listing using a reliable free Text model
    const prompt = `You are an expert e-commerce copywriter. 
    Analyze this product description and user hints to generate a listing.
    Image Description: "${imageDescription}"
    User Name Hint: "${productName || "None"}"
    User Details Hint: "${details || "None"}"
    
    Return ONLY a valid JSON object (no markdown, no backticks):
    {
      "title": "A catchy, SEO-optimized title (max 80 chars)",
      "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
      "description": "A persuasive, 2-paragraph product description"
    }`;

    const textResult = await hf.textGeneration({
      model: "HuggingFaceH4/zephyr-7b-beta", // Reliable free model
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: { max_new_tokens: 500, temperature: 0.7 },
    });

    const generatedText = textResult.generated_text;
    
    // Extract the JSON from the model's response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    const parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      title: productName || "Amazing Product", 
      bullets: ["High quality", "Great design", "Durable", "Easy to use", "Great value"], 
      description: generatedText 
    };

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Failed to generate listing" }, { status: 500 });
  }
}