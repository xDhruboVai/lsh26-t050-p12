import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Reads amount, date and shop from a photo of a bill, using Gemini 2.0 Flash.
 *
 * The contract that matters is the CONFIDENCE, not the values: the problem
 * states that a field the reader is unsure about must be shown as unsure and
 * never filled in. So the model scores each field and the client blanks
 * anything below its threshold rather than presenting a guess as fact.
 *
 * Called over REST rather than through a client library. One less dependency,
 * no SDK version drift, and the whole contract is visible in this file.
 *
 * With no GEMINI_API_KEY the route answers in "mock" mode, clearly flagged, so
 * the review-and-correct flow still demos end to end.
 */

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const CATEGORIES = [
  'Rent', 'Groceries', 'Food', 'Transport', 'Utilities',
  'Mobile', 'Health', 'Education', 'Entertainment', 'Clothing',
];

/**
 * Gemini's structured-output schema is an OpenAPI subset: `nullable` rather
 * than a union type, and no `additionalProperties`.
 */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    amount_bdt: {
      type: 'STRING',
      nullable: true,
      description:
        'The grand total actually paid, as a plain decimal string such as "2475.00". No currency symbol, no thousands separators. Null if no total is legible.',
    },
    date: {
      type: 'STRING',
      nullable: true,
      description: 'Transaction date as YYYY-MM-DD. Null if not legible.',
    },
    shop: {
      type: 'STRING',
      nullable: true,
      description: 'Merchant or shop name as printed. Null if not legible.',
    },
    category: {
      type: 'STRING',
      nullable: true,
      enum: CATEGORIES,
      description: 'Best-fitting spending category. Null if genuinely unclear.',
    },
    confidence: {
      type: 'OBJECT',
      description:
        'How certain you are of each field, 0 to 1. Be honest and understate rather than overstate. A field you returned as null must score near 0.',
      properties: {
        amount: { type: 'NUMBER' },
        date: { type: 'NUMBER' },
        shop: { type: 'NUMBER' },
      },
      required: ['amount', 'date', 'shop'],
    },
    notes: {
      type: 'STRING',
      nullable: true,
      description: 'One short sentence about anything unreadable or ambiguous. Null if the image is clean.',
    },
  },
  required: ['amount_bdt', 'date', 'shop', 'category', 'confidence'],
} as const;

const PROMPT = [
  'This is a photo of a shop bill, restaurant receipt, or mobile-money confirmation from Bangladesh.',
  'Read the grand total actually paid, the transaction date, and the merchant name.',
  'Amounts are in Bangladeshi taka. Ignore any currency symbol and return a plain decimal string.',
  'Prefer the grand total over any subtotal or individual item line.',
  'If the image is blurred, cropped, or a field is genuinely unreadable, return null for that field',
  'and score it low. Never infer or estimate an amount that is not printed on the bill.',
].join(' ');

const MOCK = {
  mode: 'mock' as const,
  amount_bdt: null,
  date: null,
  shop: null,
  category: null,
  confidence: { amount: 0, date: 0, shop: 0 },
  notes: 'Mock reader: GEMINI_API_KEY is not set, so nothing was read from the image.',
};

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

export async function POST(request: Request) {
  let body: { image?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with an "image" field.' }, { status: 400 });
  }

  const image = body.image ?? '';
  if (!image) {
    return NextResponse.json(
      { error: 'No image received. Pick a photo and try again.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(MOCK);

  // Strip a data: URL prefix if the client sent one, and recover the real type.
  const commaAt = image.indexOf(',');
  const base64 = commaAt >= 0 ? image.slice(commaAt + 1) : image;
  const declared = /^data:([^;,]+)/.exec(image)?.[1];
  const mimeType = declared ?? body.mediaType ?? 'image/jpeg';

  try {
    const res = await fetch(ENDPOINT(MODEL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          // Reading a printed number is not a creative task.
          temperature: 0,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    const data = (await res.json()) as GeminiResponse;

    if (!res.ok) {
      const detail = data.error?.message ?? `${res.status} ${res.statusText}`;
      return NextResponse.json(
        { error: `The reader refused the request: ${detail}. Enter the fields by hand.` },
        { status: 502 },
      );
    }

    if (data.promptFeedback?.blockReason) {
      return NextResponse.json(
        { error: 'That image was blocked by the reader. Enter the fields by hand.' },
        { status: 502 },
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({
        ...MOCK,
        mode: 'live',
        notes: 'The reader returned nothing usable. Enter the fields by hand.',
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json({
        ...MOCK,
        mode: 'live',
        notes: 'The reader did not return valid JSON. Enter the fields by hand.',
      });
    }

    // Never trust the model's own bookkeeping. A field it returned as null is
    // unknown regardless of the score it gave itself, and the client relies on
    // confidence alone to decide what to leave blank.
    const c = (parsed.confidence ?? {}) as Record<string, unknown>;
    const score = (key: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return 0;
      const n = Number(c[key]);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
    };

    return NextResponse.json({
      mode: 'live',
      amount_bdt: parsed.amount_bdt ?? null,
      date: parsed.date ?? null,
      shop: parsed.shop ?? null,
      category: parsed.category ?? null,
      notes: parsed.notes ?? null,
      confidence: {
        amount: score('amount', parsed.amount_bdt),
        date: score('date', parsed.date),
        shop: score('shop', parsed.shop),
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json(
      {
        error: timedOut
          ? 'The reader took too long. Enter the fields by hand.'
          : 'Could not reach the reader. Enter the fields by hand.',
      },
      { status: 502 },
    );
  }
}
