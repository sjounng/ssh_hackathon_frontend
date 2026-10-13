import Hero from '../sections/Hero.jsx'
import About from '../sections/About.jsx'
import Prizes from '../sections/Prizes.jsx'
import Eligibility from '../sections/Eligibility.jsx'
import Review from '../sections/Review.jsx'
import Schedule from '../sections/Schedule.jsx'
import Cta from '../sections/Cta.jsx'
import PageIndicator from '../components/PageIndicator.jsx'
import { getPublicSchedule } from '../lib/event.js'

// 메인 랜딩 페이지 (기획서 기능 1). 문구는 content.js, 일정·팀 인원은 관리자 페이지 > 일정(DB)에서 관리한다.
// 각 섹션은 data-diamond로 짝지은 유성(다이아몬드)의 관측 기록이며,
// 섹션이 화면 가운데에 오면 배경 카메라가 그 유성을 관측 거리로 비추고 HUD가 붙는다.
export default async function Home() {
  const schedule = await getPublicSchedule()
  return (
    <>
      <PageIndicator />
      <main>
        <Hero schedule={schedule} />
        <About />
        <Prizes />
        <Eligibility schedule={schedule} />
        <Review />
        <Schedule schedule={schedule} />
      </main>
      <Cta schedule={schedule} />
    </>
  )
}
