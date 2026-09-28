import { hud } from '../lib/hud.js'

// 관측 HUD: 초점이 맞은 유성(다이아몬드)에 조준 표시와 관측 태그를 붙인다.
// 위치(--x, --y), 크기(--r), 투명도(--o)와 태그 문구는 Scene.jsx의 CameraRig가 매 프레임 갱신한다.
export default function Hud() {
  return (
    <div className="hud" aria-hidden="true" ref={(el) => (hud.el = el)}>
      <div className="hud-lead" />
      <div className="hud-reticle">
        <span className="hud-ring" />
        <i /><i /><i /><i />
      </div>
      <div className="hud-tag mono">
        <span className="hud-code" />
        <span className="hud-coord" />
      </div>
    </div>
  )
}
