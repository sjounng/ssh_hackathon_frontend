import Hero from '../sections/Hero.jsx'
import About from '../sections/About.jsx'
import Prizes from '../sections/Prizes.jsx'
import Eligibility from '../sections/Eligibility.jsx'
import Review from '../sections/Review.jsx'
import Schedule from '../sections/Schedule.jsx'
import Cta from '../sections/Cta.jsx'
import PageIndicator from '../components/PageIndicator.jsx'
import Sphere from '../components/Sphere.jsx'
import { getPublicCriteria, getPublicSchedule } from '../lib/event.js'

// 메인 랜딩 페이지 (기획서 기능 1). 문구는 content.js, 일정·팀 인원·평가 항목은 관리자 페이지(DB)에서 관리한다.
// 배경의 점선 구체(Sphere)는 메인 페이지에만 있고, 다른 페이지는 같은 자리에 정적인 점선 원(Backdrop)이 보인다
export default async function Home() {
  const [schedule, criteria] = await Promise.all([getPublicSchedule(), getPublicCriteria()])
  return (
    <>
      <Sphere />
      <PageIndicator />
      <main>
        <Hero schedule={schedule} />
        <About />
        <Prizes />
        <Eligibility schedule={schedule} />
        <Review criteria={criteria} />
        <Schedule schedule={schedule} />
      </main>
      <Cta schedule={schedule} />
    </>
  )
}
