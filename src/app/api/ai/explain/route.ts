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
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return new NextResponse(
        JSON.stringify({ error: "Failed to fetch response from Gemini API" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated.";

    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error("AI Explanation error:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
