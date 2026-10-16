'use client'

import { useEffect, useRef } from 'react'

// 메인 페이지 배경의 점선 구체: 포스터의 점선 원을 입체로 옮긴 것.
// 윤곽은 점선 원, 안쪽은 점으로 찍은 경도·위도선. 천천히 돌고, 스크롤하면 조금 더 돈다. 뒤쪽 점은 흐리게.
// 위치·크기는 CSS(.sphere: --ring-*)가 정하고, 여기서는 캔버스를 꽉 채워 그린다 — 다른 페이지의 정적인 점선 원(Backdrop)과 같은 자리.
// three.js 없이 2D 캔버스로 그린다. 움직임 줄이기 설정이면 멈춘 채로 한 번만 그린다
const MERIDIANS = 12
const PARALLELS = 7 // 극점을 뺀 위도선 수
const STEP = 0.07 // 선 위의 점 간격 (라디안)
const TILT = -0.38 // 자전축 기울기 (라디안)
const SPIN = (Math.PI * 2) / 90 // 90초에 한 바퀴
const SCROLL_SPIN = 0.0011 // 스크롤 1px당 회전

// 단위 구 위의 점들 (경도선은 극에서 극까지, 위도선은 둘레에 맞춰 점 간격을 고르게)
function spherePoints() {
  const pts = []
  for (let i = 0; i < MERIDIANS; i++) {
    const lon = (i / MERIDIANS) * Math.PI * 2
    for (let lat = -Math.PI / 2 + STEP; lat < Math.PI / 2; lat += STEP) {
      pts.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)])
    }
  }
  for (let j = 1; j <= PARALLELS; j++) {
    const lat = -Math.PI / 2 + (j * Math.PI) / (PARALLELS + 1)
    const step = STEP / Math.cos(lat)
    for (let lon = 0; lon < Math.PI * 2; lon += step) {
      pts.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)])
    }
  }
  return pts
}

export default function Sphere() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pts = spherePoints()
    const cosT = Math.cos(TILT)
    const sinT = Math.sin(TILT)
    let dpr = 1
    let raf = 0
    const start = performance.now()

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
    }

    const draw = (t) => {
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) / 2 - 8 * dpr
      // 아직 크기가 잡히지 않았으면(숨겨진 창, 레이아웃 전) 그리지 않는다
      if (r <= 0) return
      const angle = reduce ? 0.6 : (t / 1000) * SPIN + window.scrollY * SCROLL_SPIN
      const ca = Math.cos(angle)
      const sa = Math.sin(angle)
      ctx.clearRect(0, 0, w, h)

      // 윤곽: 포스터와 같은 점선 원 (점선이 아주 천천히 흐른다)
      ctx.setLineDash([11 * dpr, 9 * dpr])
      ctx.lineDashOffset = reduce ? 0 : -(t / 1000) * 6 * dpr
      ctx.lineWidth = 1.3 * dpr
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      // 경도·위도선의 점: y축으로 돌리고 x축으로 기울여 정사영. 앞쪽(z>0)은 밝게, 오른쪽(빛이 오는 쪽)을 조금 더 밝게
      for (const [x0, y0, z0] of pts) {
        const x1 = x0 * ca + z0 * sa
        const z1 = -x0 * sa + z0 * ca
        const y2 = y0 * cosT - z1 * sinT
        const z2 = y0 * sinT + z1 * cosT
        const front = z2 > 0
        const alpha = front ? (0.34 + 0.56 * z2) * (0.8 + 0.2 * x1) : 0.13
        const size = (front ? 2 : 1.3) * dpr
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        ctx.fillRect(cx + x1 * r - size / 2, cy - y2 * r - size / 2, size, size)
      }

      // 윤곽을 따라 도는 작은 ◆ (포스터의 마름모)
      const a = reduce ? -0.9 : -0.9 + (t / 1000) * 0.12
      const mx = cx + Math.cos(a) * r
      const my = cy + Math.sin(a) * r
      const d = 5 * dpr
      ctx.setLineDash([])
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
      ctx.shadowBlur = 10 * dpr
      ctx.beginPath()
      ctx.moveTo(mx, my - d)
      ctx.lineTo(mx + d, my)
      ctx.lineTo(mx, my + d)
      ctx.lineTo(mx - d, my)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // 다음 프레임을 먼저 예약해, 한 프레임에서 문제가 생겨도 회전이 멈추지 않게 한다
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      draw(now - start)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (reduce) draw(0)
    })
    ro.observe(canvas)
    if (reduce) draw(0)
    else raf = requestAnimationFrame(loop)
    canvas.classList.add('ready') // 그리기 시작하면 같은 자리의 정적인 점선 원을 숨긴다

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="sphere" aria-hidden="true" />
}
