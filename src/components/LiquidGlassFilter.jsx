'use client'

import { useEffect, useState } from 'react'

// 리퀴드 글래스 렌즈 굴절용 SVG 필터.
// 유리 가장자리로 갈수록 뒤쪽 화면을 안쪽에서 끌어와(변위) 렌즈처럼 휘어 보이게 한다.
// 변위 지도는 요소 크기에 늘려 쓰므로, 가로로 긴 네브바와 짧은 버튼은 가장자리 폭(ex, ey)을 따로 만든다.
// CSS: backdrop-filter: url(#lg-bar) / url(#lg-pill) / url(#lg-card)  — 크롬 계열에서 동작, 그 밖의 브라우저는 blur로 대체된다.
const FILTERS = [
  { id: 'lg-bar', ex: 0.035, ey: 0.42, scale: 26 },
  { id: 'lg-pill', ex: 0.16, ey: 0.42, scale: 18 },
  // 모서리가 잘린 박스: 크고 비율이 제각각이라 가장자리만 얇게 휜다
  { id: 'lg-card', ex: 0.05, ey: 0.08, scale: 22 },
]

function makeDisplacementMap(ex, ey) {
  const W = 256
  const H = 128
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  // 가장자리에서 0 → 1로 커지는 곡선 (안쪽은 0: 변위 없음)
  const edge = (t, e) => {
    const k = Math.max(0, 1 - t / e)
    return k * k
  }
  for (let y = 0; y < H; y++) {
    const ny = (y + 0.5) / H
    const dy = edge(ny, ey) - edge(1 - ny, ey) // 위쪽 가장자리는 아래(안쪽)에서, 아래쪽은 위에서 끌어온다
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5) / W
      const dx = edge(nx, ex) - edge(1 - nx, ex)
      const i = (y * W + x) * 4
      img.data[i] = 128 + dx * 127 // R: 가로 변위
      img.data[i + 1] = 128 + dy * 127 // G: 세로 변위
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

export default function LiquidGlassFilter() {
  const [maps, setMaps] = useState(null)
  useEffect(() => {
    setMaps(Object.fromEntries(FILTERS.map((f) => [f.id, makeDisplacementMap(f.ex, f.ey)])))
  }, [])

  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {FILTERS.map((f) => (
          <filter key={f.id} id={f.id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            {maps && <feImage href={maps[f.id]} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />}
            <feDisplacementMap in="SourceGraphic" in2="map" scale={f.scale} xChannelSelector="R" yChannelSelector="G" result="lens" />
            {/* 아주 약한 흐림: 굴절된 배경이 거칠게 보이지 않을 정도만 */}
            <feGaussianBlur in="lens" stdDeviation="0.6" />
          </filter>
        ))}
      </defs>
    </svg>
  )
}
