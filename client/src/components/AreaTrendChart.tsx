import React, { useState } from 'react';
import type { DailyTrendPoint } from '../services/apiService';

interface Props {
  data: DailyTrendPoint[];
}

interface FormattedPoint extends DailyTrendPoint {
  passRate: number | null;
  label: string;
}

const CAPSULE_H = 82;

const getColor = (rate: number | null): string => {
  if (rate === null) return '#94a3b8';
  if (rate >= 80) return '#10b981';
  if (rate >= 50) return '#f59e0b';
  return '#f43f5e';
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
type TooltipAlign = 'left' | 'center' | 'right';

const CapsuleTooltip: React.FC<{ d: FormattedPoint; align: TooltipAlign }> = ({ d, align }) => {
  const [y, m, day] = d.date.split('-');
  const color = getColor(d.passRate);

  const alignStyle: React.CSSProperties =
    align === 'left'  ? { left: 0 } :
    align === 'right' ? { right: 0 } :
                        { left: '50%', transform: 'translateX(-50%)' };

  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 10px)',
      ...alignStyle,
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: 9,
      padding: '9px 13px',
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 28px rgba(0,0,0,0.38)',
      border: '1px solid rgba(255,255,255,0.07)',
      pointerEvents: 'none',
      zIndex: 50,
      lineHeight: 1.65,
    }}>
      <div style={{
        color: '#64748b',
        fontSize: 9,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        marginBottom: 3,
      }}>
        {`${day}/${m}/${y}`}
      </div>
      <div style={{
        color,
        fontSize: 21,
        fontWeight: 800,
        lineHeight: 1,
        marginBottom: 7,
      }}>
        {d.passRate !== null ? `${d.passRate}%` : 'No data'}
      </div>
      {d.total > 0 && (
        <>
          <div style={{ color: '#6ee7b7', fontSize: 11 }}>✓ {d.passed} passed</div>
          <div style={{ color: '#fda4af', fontSize: 11 }}>✗ {d.failed} failed</div>
        </>
      )}
    </div>
  );
};

const AreaTrendChart: React.FC<Props> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasData = data.some(d => d.total > 0);
  if (!hasData) return null;

  const formatted: FormattedPoint[] = data.map(d => ({
    ...d,
    passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : null,
    label: d.date.slice(5).replace('-', '/'),
  }));

  const thresholdTop = (1 - 0.80) * CAPSULE_H;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', display: 'flex', gap: 5, alignItems: 'flex-start' }}>

        {/* ── 80% dashed threshold line ── */}
        <div style={{
          position: 'absolute',
          top: thresholdTop,
          left: 0,
          right: 28,
          height: 1,
          borderTop: '1px dashed rgba(100,116,139,0.4)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute',
          top: thresholdTop - 9,
          right: 0,
          fontSize: 8,
          color: '#64748b',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          80%
        </div>

        {/* ── Capsule columns ── */}
        {formatted.map((d, i) => {
          const color = getColor(d.passRate);
          const fillPct = d.passRate ?? 0;
          const isNoData = d.total === 0;
          const isHovered = hoveredIdx === i;

          const ratio = formatted.length > 1 ? i / (formatted.length - 1) : 0.5;
          const tooltipAlign: TooltipAlign =
            ratio < 0.25 ? 'left' : ratio > 0.75 ? 'right' : 'center';

          return (
            <div
              key={d.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {/* Capsule outer — owns the tooltip, glow, and scale transform */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 22,
                  height: CAPSULE_H,
                  cursor: isNoData ? 'default' : 'pointer',
                  transition: 'transform 0.16s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  zIndex: isHovered ? 10 : 'auto',
                }}
                onMouseEnter={() => !isNoData && setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Capsule shell (clips the fill to pill shape) */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 999,
                  overflow: 'hidden',
                  background: isNoData
                    ? 'transparent'
                    : 'rgba(148,163,184,0.10)',
                  border: isNoData
                    ? '1.5px dashed rgba(148,163,184,0.28)'
                    : 'none',
                }}>
                  {/* Rising fill — grows from the bottom */}
                  {!isNoData && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${fillPct}%`,
                      background: `linear-gradient(to top, ${color}, ${color}bb)`,
                      transition: 'height 0.55s cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                  )}
                </div>

                {/* Glow halo on hover */}
                {isHovered && !isNoData && (
                  <div style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: 999,
                    border: `1.5px solid ${color}55`,
                    boxShadow: `0 0 12px ${color}44`,
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Tooltip — anchored above the capsule */}
                {isHovered && <CapsuleTooltip d={d} align={tooltipAlign} />}
              </div>

              {/* Date label */}
              <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', lineHeight: 1 }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AreaTrendChart;
