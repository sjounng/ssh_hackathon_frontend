// 문자열 안의 [자리표시]를 점선 밑줄로 표시해서, 아직 채워야 할 문구를 화면에서 바로 찾을 수 있게 한다.
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
