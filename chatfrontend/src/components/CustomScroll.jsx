import PropTypes from 'prop-types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function CustomScroll({ children, className, viewportClassName, style, viewportRef: externalViewportRef }) {
  const wrapperRef = useRef(null);
  const viewportRef = useRef(null);
  const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false });
  const draggingRef = useRef(null);

  const setViewportRef = useCallback((node) => {
    viewportRef.current = node;
    if (typeof externalViewportRef === 'function') externalViewportRef(node);
    else if (externalViewportRef && 'current' in externalViewportRef) externalViewportRef.current = node;
  }, [externalViewportRef]);

  const update = useCallback(() => {
    const vp = viewportRef.current;
    const wrap = wrapperRef.current;
    if (!vp || !wrap) return;
    const sh = vp.scrollHeight;
    const ch = vp.clientHeight;
    const st = vp.scrollTop;
    if (sh <= ch + 1) { setThumb((t) => ({ ...t, visible: false })); return; }
    const trackPad = 4; // px
    const trackHeight = wrap.clientHeight - trackPad * 2;
    const ratio = ch / sh;
    const minThumb = 24;
    const h = Math.max(minThumb, Math.round(trackHeight * ratio));
    const maxScroll = sh - ch;
    const top = Math.round(trackPad + (maxScroll ? (st / maxScroll) * (trackHeight - h) : 0));
    setThumb({ height: h, top, visible: true });
  }, []);

  const onScroll = useCallback(() => { update(); }, [update]);
  useLayoutEffect(() => { update(); }, [children, update]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    vp.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(vp); if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => { vp.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, [onScroll, update]);

  const onThumbMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const vp = viewportRef.current;
    const wrap = wrapperRef.current;
    if (!vp || !wrap) return;
    const startScroll = vp.scrollTop;
    const sh = vp.scrollHeight; const ch = vp.clientHeight; const trackPad = 4; const trackHeight = wrap.clientHeight - trackPad * 2; const maxScroll = sh - ch; const scrollPerPixel = maxScroll / Math.max(1, (trackHeight - thumb.height));
    const onMove = (ev) => { const dy = ev.clientY - startY; vp.scrollTop = startScroll + dy * scrollPerPixel; };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); draggingRef.current = null; };
    draggingRef.current = { onMove, onUp };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onTrackMouseDown = (e) => {
    const wrap = wrapperRef.current; const vp = viewportRef.current; if (!wrap || !vp) return;
    const rect = wrap.getBoundingClientRect();
    const y = e.clientY - rect.top; const trackPad = 4; const trackHeight = wrap.clientHeight - trackPad * 2; const rel = Math.max(0, Math.min(1, (y - trackPad - thumb.height / 2) / Math.max(1, (trackHeight - thumb.height))));
    vp.scrollTop = (vp.scrollHeight - vp.clientHeight) * rel;
  };

  return (
    <div ref={wrapperRef} className={`cs-wrapper ${className || ''}`} style={{ position: 'relative', ...style }}>
      <div ref={setViewportRef} className={`cs-viewport hide-native-scrollbar ${viewportClassName || ''}`}>
        {children}
      </div>
      {thumb.visible ? (
        <div className="cs-track" onMouseDown={onTrackMouseDown}>
          <div className="cs-thumb" style={{ height: `${thumb.height}px`, transform: `translateY(${thumb.top}px)` }} onMouseDown={onThumbMouseDown} />
        </div>
      ) : null}
    </div>
  );
}

CustomScroll.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  viewportClassName: PropTypes.string,
  style: PropTypes.object,
  viewportRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
};

