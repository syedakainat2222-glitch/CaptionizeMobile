'use server';

export async function aiSuggestedCorrections(input: { text: string }) {
  // Mock implementation for now
  console.log('AI suggested corrections called with:', input.text);
  return { suggestions: [] as string[] };
}
