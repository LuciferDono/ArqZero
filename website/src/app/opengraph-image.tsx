import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ArqZero — Terminal-Native AI Engineering Agent';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{ color: '#00D4AA', fontSize: 72, fontWeight: 'bold', marginBottom: 24 }}>
          ◆ ArqZero
        </div>
        <div style={{ color: '#D4D4D4', fontSize: 32, textAlign: 'center', maxWidth: 800, lineHeight: 1.4 }}>
          Terminal-native AI engineering agent
        </div>
        <div style={{ color: '#D4D4D4', fontSize: 32, textAlign: 'center', maxWidth: 800, lineHeight: 1.4 }}>
          with structured methodologies
        </div>
        <div style={{ color: '#6B7280', fontSize: 22, marginTop: 32, display: 'flex', gap: 24 }}>
          <span>42 capabilities</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>verification gates</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>any LLM</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>$12/mo</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
