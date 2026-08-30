import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Reads amount, date and shop from a photo of a bill.
 *
 * The contract that matters is the CONFIDENCE, not the values: the problem
 * states that a field the reader is unsure about must be shown as unsure and
 * never filled in. So the model is asked to score each field, and the client
 * blanks anything below its threshold rather than presenting a guess as fact.
 *
 * With no ANTHROPIC_API_KEY the route answers in "mock" mode, clearly flagged,
 * so the review-and-correct flow still demos end to end.
 */

const MODEL = 'claude-sonnet-5';

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'record_receipt',
  description: 'Record the fields read from a receipt or bill image.',
  input_schema: {
    type: 'object',
    properties: {
      amount_bdt: {
        type: ['string', 'null'],
        description:
          'The grand total paid, as a decimal string like "2475.00". Null if no total is legible.',
      },
      date: {
        type: ['string', 'null'],
        description: 'Transaction date as YYYY-MM-DD. Null if not legible.',
      },
      shop: {
        type: ['string', 'null'],
        description: 'Merchant or shop name as printed. Null if not legible.',
      },
      category: {
        type: ['string', 'null'],
        description:
          'One of Rent, Groceries, Food, Transport, Utilities, Mobile, Health, Education, Entertainment, Clothing. Null if unclear.',
      },
      confidence: {
        type: 'object',
        description: 'How certain you are of each field, 0 to 1. Be honest; understate rather than overstate.',
        properties: {
          amount: { type: 'number' },
          date: { type: 'number' },
          shop: { type: 'number' },
        },
        required: ['amount', 'date', 'shop'],
      },
      notes: {
        type: ['string', 'null'],
        description: 'One short sentence on anything unreadable or ambiguous. Null if the image is clean.',
      },
    },
    required: ['amount_bdt', 'date', 'shop', 'category', 'confidence'],
  },
};

const PROMPT = [
  'This is a photo of a shop bill, restaurant receipt, or mobile-money confirmation from Bangladesh.',
  'Read the grand total actually paid, the transaction date, and the merchant name.',
  'Amounts are in Bangladeshi taka; ignore any currency symbol and return a plain decimal string.',
  'If the image is blurred, cropped, or a field is genuinely unreadable, return null for that field',
  'and give it a low confidence. Do not infer or estimate an amount that is not printed.',
  'Prefer the grand total over any subtotal or item line.',
].join(' ');

const MOCK = {
  mode: 'mock' as const,
  amount_bdt: null,
  date: null,
  shop: 'Meena Bazar',
  category: 'Groceries',
  confidence: { amount: 0.0, date: 0.0, shop: 0.4 },
  notes: 'Mock extractor: ANTHROPIC_API_KEY is not set, so nothing was read from the image.',
};

export async function POST(request: Request) {
  let body: { image?: string; mediaType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with an "image" field.' }, { status: 400 });
  }

  const image = body.image ?? '';
  const mediaType = (body.mediaType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  if (!image) {
    return NextResponse.json({ error: 'No image received. Pick a photo and try again.' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(MOCK);
  }

  // Strip a data: URL prefix if the client sent one.
  const base64 = image.includes(',') ? image.slice(image.indexOf(',') + 1) : image;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'record_receipt' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const call = message.content.find((c) => c.type === 'tool_use');
    if (!call || call.type !== 'tool_use') {
      return NextResponse.json({
        ...MOCK,
        mode: 'live',
        notes: 'The reader could not produce a structured result. Enter the fields by hand.',
      });
    }

    return NextResponse.json({ mode: 'live', ...(call.input as object) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Could not read the receipt: ' + detail + '. Enter the fields by hand.' },
      { status: 502 },
    );
  }
}
