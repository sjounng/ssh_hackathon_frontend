// 문자열 안의 [자리표시]를 <mark class="ph">로 감싼다. 지금은 따로 꾸미지 않지만, 필요하면 CSS에서 표시를 켤 수 있다.
export default function Ph({ children }) {
  if (typeof children !== 'string') return children
  return children.split(/(\[[^\]]+\])/g).map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark className="ph" key={i} title="채워야 할 자리표시">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}
