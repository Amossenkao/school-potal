import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/proxy';

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

		const user = await authenticateRequest(req);

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// The Gemini REST API endpoint URL
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

		// The request payload, structured for the REST API
		const finalPrompt = `
  You are a friendly and encouraging AI study assistant. 
  A user has asked the following question: "${prompt}"
	Please provide a clear and concise answer to help them understand the topic better.
	Here are some guidelines to follow:
	- Use simple language and avoid jargon.
	- Encourage the userr to ask follow-up questions if they need more help.
	- Be positive and supportive in your tone.

	Here is the user's profile to help you tailor your response:
	${user}
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
