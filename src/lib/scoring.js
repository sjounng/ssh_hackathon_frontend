// 심사 점수 집계 (서버·브라우저 공용 순수 함수). 합산 방식이 정해지면 이 파일만 바꾼다.
// 기본안: 팀마다 항목별로 심사위원 점수를 평균 내고(운영진이 무효 처리한 점수는 뺀다) 가중치를 곱해 더한다.
//         만점은 Σ(가중치 × 항목 최고점). 총점이 같으면 같은 순위(1, 1, 3…)
export const SCORING_RULE = '항목마다 심사위원 점수를 평균 내고, 가중치를 곱해 더한 총점'

// criteria: [{ id, weight, max_score }], scores: [{ judge_id, team_id, criterion_id, score, voided_at }]
export function rankTeams(teamIds, criteria, scores) {
  const valid = scores.filter((s) => !s.voided_at)
  const max = criteria.reduce((sum, c) => sum + Number(c.weight) * Number(c.max_score), 0)
  const rows = teamIds.map((teamId) => {
    const mine = valid.filter((s) => s.team_id === teamId)
    const averages = criteria.map((c) => {
      const xs = mine.filter((s) => s.criterion_id === c.id).map((s) => Number(s.score))
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
    })
    const total = criteria.reduce((sum, c, i) => sum + Number(c.weight) * (averages[i] ?? 0), 0)
    return { teamId, averages, total, max, judges: new Set(mine.map((s) => s.judge_id)).size }
  })
  rows.sort((a, b) => b.total - a.total)
  rows.forEach((r, i) => {
    r.rank = i > 0 && Math.abs(r.total - rows[i - 1].total) < 1e-9 ? rows[i - 1].rank : i + 1
  })
  return rows
}

// 심사위원이 모든 항목을 매긴 팀 수
export function scoredTeamCount(judgeId, teamIds, criteria, scores) {
  if (!criteria.length) return 0
  const have = new Set(scores.filter((s) => s.judge_id === judgeId).map((s) => `${s.team_id}:${s.criterion_id}`))
  return teamIds.filter((t) => criteria.every((c) => have.has(`${t}:${c.id}`))).length
}

// 평가 항목 비중 (가중치 합 대비 %)
export function weightShares(criteria) {
  const sum = criteria.reduce((s, c) => s + Number(c.weight), 0)
  return criteria.map((c) => (sum > 0 ? Math.round((Number(c.weight) / sum) * 100) : 0))
}
