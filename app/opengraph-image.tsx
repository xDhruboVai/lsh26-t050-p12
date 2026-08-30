import { ImageResponse } from 'next/og';

export const alt = 'Ledger — see where the month went, and when each goal lands';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Rendered once at build time. Uses no custom font on purpose: fetching a
 * typeface here would add a build-time network dependency for an image nobody
 * reads closely, and the fallback renders fine at this size.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#12160f',
          padding: '72px 80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
              width: 68,
              height: 68,
              borderRadius: 16,
              background: '#1c2419',
              padding: '0 14px',
            }}
          >
            <div style={{ display: 'flex', height: 10, borderRadius: 5, background: '#ecff68', width: 27 }} />
            <div style={{ display: 'flex', height: 10, borderRadius: 5, background: '#35c4a1', width: 16 }} />
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              letterSpacing: 6,
              color: '#8b9a93',
              textTransform: 'uppercase',
            }}
          >
            Ledger
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 70,
              lineHeight: 1.08,
              color: '#e9eee7',
              fontWeight: 700,
              maxWidth: 900,
            }}
          >
            See where the month went, and when each goal lands.
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#a2ada4', maxWidth: 820 }}>
            Photograph a bill, forecast the rest of the month, and put a real date on every
            savings pocket.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 40 }}>
          <div style={{ display: 'flex', width: '100%', height: 14, borderRadius: 7, background: '#2a3327' }}>
            <div style={{ display: 'flex', width: '46%', height: 14, borderRadius: 7, background: '#ecff68' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#8b9a93' }}>
            <div style={{ display: 'flex' }}>46% of salary spent, day 18 of 30</div>
            <div style={{ display: 'flex', color: '#35c4a1' }}>BDT 30,570 left at month end</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
