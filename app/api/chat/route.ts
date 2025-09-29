import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';

export async function POST(req: NextRequest) {
	if (!API_KEY) {
		return NextResponse.json(
			{ error: 'GEMINI_API_KEY environment variable not set' },
			{ status: 500 }
		);
	}

	try {
		const { prompt } = await req.json();

		if (!prompt) {
			return NextResponse.json(
				{ error: 'Prompt is required' },
				{ status: 400 }
			);
		}

		// The Gemini REST API endpoint URL
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

		// The request payload, structured for the REST API
		const finalPrompt = `
  You are a friendly and encouraging AI study assistant. 
  A student has asked the following question: "${prompt}"

  If the user' message require solving or explination, Please explain the answer in a step-by-step guide. 
  Use simple language, relatable analogies (like recipes or tools), 
  and break down complex terms. Use markdown for headings and bold 
  for key terms. Use emojis to make the explanation engaging and fun.
`;

		const payload = {
			contents: [{ parts: [{ text: finalPrompt }] }],
			// Optional: add generationConfig and safetySettings here if needed
		};

		// Make the API call using fetch
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error('Gemini API Error:', errorData);
			return NextResponse.json(
				{ error: 'Failed to fetch response from Gemini API.' },
				{ status: response.status }
			);
		}

		const data = await response.json();

		// Safely extract the text from the response
		const text =
			data.candidates?.[0]?.content?.parts?.[0]?.text ||
			'Sorry, I could not generate a response.';
		console.log('Generated text:', text);
		// Send the complete text back to the frontend
		return NextResponse.json({ text });
	} catch (error) {
		console.error('Error in API route:', error);
		return NextResponse.json(
			{ error: 'An internal server error occurred.' },
			{ status: 500 }
		);
	}
}
