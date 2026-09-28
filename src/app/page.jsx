import BackgroundScene from '../components/BackgroundScene.jsx'
import Header from '../components/Header.jsx'
import Hud from '../components/Hud.jsx'
import Hero from '../sections/Hero.jsx'
import About from '../sections/About.jsx'
import Prizes from '../sections/Prizes.jsx'
import Eligibility from '../sections/Eligibility.jsx'
import Review from '../sections/Review.jsx'
import Schedule from '../sections/Schedule.jsx'
import Footer from '../sections/Footer.jsx'

// 메인 랜딩 페이지 (기획서 기능 1). 문구는 content.js에서 관리한다.
// 3D 장면은 페이지 전체 뒤에 고정된 우주 공간이다. 각 섹션은 data-diamond로 짝지은 유성(다이아몬드)의 관측 기록이며,
// 섹션이 화면 가운데에 오면 카메라가 그 유성을 관측 거리로 비추고 HUD가 붙는다.
export default function Home() {
  return (
    <>
      <BackgroundScene />
      <Hud />
      <Header />
      <main>
        <Hero />
        <About />
        <Prizes />
        <Eligibility />
        <Review />
        <Schedule />
      </main>
      <Footer />
    </>
  )
}
