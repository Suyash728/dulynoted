import { ImageResponse } from 'next/og';
import { fail } from '@/lib/api';
import { loadSampleText } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Demo upload: the scholarship notice as a skewed "phone photo" of paper, dated relative to today (IST). */
export async function GET(): Promise<Response> {
  try {
    const { text } = await loadSampleText('scholarship');
    const lines = text.split('\n').filter((l) => l.trim());
    const image = new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#6b5b4a' }}>
          <div
            style={{
              width: 900,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '44px 52px',
              background: '#f4efe3',
              transform: 'rotate(-2.2deg)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
              color: '#222',
              fontSize: 22,
              lineHeight: 1.45,
            }}
          >
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', fontWeight: i < 2 ? 700 : 400 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ),
      { width: 1100, height: 900 },
    );
    image.headers.set('Cache-Control', 'public, max-age=600');
    return image;
  } catch (err) {
    console.error('[api/samples/png]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not render the sample photo', 500);
  }
}
