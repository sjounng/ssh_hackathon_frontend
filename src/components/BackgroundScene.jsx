'use client'

import dynamic from 'next/dynamic'

// three.js 장면은 브라우저(WebGL)에서만 동작하므로 서버 렌더링에서 제외하고 불러온다
const Scene = dynamic(() => import('../Scene.jsx'), { ssr: false })

export default function BackgroundScene() {
  return (
    <div className="bg-canvas" aria-hidden="true">
      <Scene />
    </div>
  )
}
