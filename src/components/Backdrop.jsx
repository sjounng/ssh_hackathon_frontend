// 페이지 전체 뒤에 고정된 배경 (포스터 디자인): 차콜 바탕 위로 오른쪽 가장자리에서 번지는 스펙트럼 빛
// (서강 빨강 → 성균관 초록 → 한양 파랑)과 크게 걸친 점선 원. 움직임 없이 CSS만 쓴다
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-glow" />
      <svg className="backdrop-ring" viewBox="0 0 1000 1000">
        <circle cx="500" cy="500" r="498" />
      </svg>
    </div>
  )
}
