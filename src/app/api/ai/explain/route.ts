import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    await requireUser();

    const {
      questionStem,
      choices,
      studentResponse,
      correctAnswer,
    } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    console.log("[AI Explain] GEMINI_API_KEY status:", apiKey ? "Configured (length: " + apiKey.length + ")" : "Not configured");
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server. Please check your environment variables in Vercel or your local .env file." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `
You are an expert SAT tutor. A student got a question incorrect and needs an explanation.
Be encouraging, concise, and explain EXACTLY why their answer is wrong and why the correct answer is right. 
IMPORTANT: Format your response using basic HTML tags (e.g., <p>, <b>, <i>, <ul>, <li>). Do NOT use Markdown. For any math expressions, use $...$ for inline math and $$...$$ for display math.

Question Context:
Stem: ${questionStem}
Choices: ${JSON.stringify(choices)}
Correct Answer: ${correctAnswer}
Student's Answer: ${studentResponse}
    `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      let errorMessage = "Failed to fetch response from Gemini API";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {}
      return new NextResponse(
        JSON.stringify({ error: `Gemini API Error: ${errorMessage}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[AI Explain] Raw Gemini API Response:", JSON.stringify(data));
    const firstCandidate = data.candidates?.[0];
    console.log("[AI Explain] Finish Reason:", firstCandidate?.finishReason);
    const explanation = firstCandidate?.content?.parts?.[0]?.text || "No explanation generated.";

    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error("AI Explanation error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
