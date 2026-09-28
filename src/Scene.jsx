'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Float, Lightformer, MeshTransmissionMaterial, PerformanceMonitor, Sparkles, useFBO } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { hud } from './lib/hud.js'

const HY = '#0E4A84' // Hanyang Blue
const SG = '#B60005' // Sogang Red
const SK = '#124532' // SKKU Green
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const BACKDROP_Z = -6

// 화면 전체를 채우는 삼색 면. 경계선을 사선으로 날카롭게 나누고, 옅은 격자를 얹어 유리 굴절이 드러나게 한다.
// 빛 배경의 시작 시각(초). t=0에서는 세 빔이 가운데서 크게 겹쳐 뿌옇게 시작하므로,
// 이미 한동안 움직여 색이 프리즘에 또렷하게 나뉘어 비치는 시점부터 시작한다.
const BEAM_T0 = 19

function Backdrop() {
  const ref = useRef()
  const { camera, size } = useThree()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uA: { value: new THREE.Color(HY) },
          uB: { value: new THREE.Color(SG) },
          uC: { value: new THREE.Color(SK) },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uScale: { value: new THREE.Vector2(1, 1) },
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: `
          uniform vec3 uA, uB, uC; uniform float uTime, uAspect; uniform vec2 uScale; varying vec2 vUv;

          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3. - 2. * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.), f.x), f.y);
          }
          float fbm(vec2 p){ return noise(p) * .65 + noise(p * 2.3) * .35; }

          // 화면 밖 광원 c에서 화면 중앙을 향해 일정한 각도(halfAngle)로만 퍼지는 삼각형 빔.
          // 실제 빛처럼: 축은 밝고 하얗게 타고(hot core), 가장자리는 색이 틀어지며(edgeCol),
          // 경계에서 파장별로 살짝 갈라지고(분산), 공기 중 먼지로 결이 생기고, 멀어질수록 색이 바뀐다(farCol).
          vec3 beam(vec2 p, vec2 c, vec3 coreCol, vec3 edgeCol, vec3 farCol, float halfAngle, float sway, float seed){
            vec2 asp = vec2(uAspect, 1.);
            vec2 q = (p - c) * asp;
            float d = length(q);
            vec2 axis = normalize((vec2(.5) - c) * asp);
            float s = sin(sway), k = cos(sway);
            axis = vec2(axis.x * k - axis.y * s, axis.x * s + axis.y * k);
            float ang = acos(clamp(dot(q / d, axis), -1., 1.));
            float side = sign(axis.x * q.y - axis.y * q.x);
            float edge = fwidth(ang) * 1.5;
            float r = ang / halfAngle;

            // 부드러운 경계(반그림자): 광원에서 멀어질수록 더 넓게 번진다
            float soft = halfAngle * (.22 + .35 * smoothstep(.4, 2.4, d)) + edge;
            // 파장별로 경계 각도를 조금씩 다르게: 가장자리에 은은한 무지개 번짐
            vec3 inside = vec3(
              1. - smoothstep(halfAngle * 1.06 - soft, halfAngle * 1.06 + soft, ang),
              1. - smoothstep(halfAngle - soft, halfAngle + soft, ang),
              1. - smoothstep(halfAngle * .94 - soft, halfAngle * .94 + soft, ang));
            inside *= inside; // 경계 바깥쪽 꼬리를 더 자연스럽게 감쇠

            float along = smoothstep(.6, 2.2, d);
            vec3 tint = mix(mix(coreCol, edgeCol, smoothstep(.15, 1., r)), farCol, along * .6);
            float hot = pow(max(1. - r, 0.), 5.) * (1. - along * .7);

            // 공기 중 먼지/연기: 빔 방향으로 늘어진 노이즈 결
            float dust = fbm(vec2(ang * side * 38. + seed, d * 2.2 - uTime * .08));
            float shafts = .65 + .7 * dust;
            float fall = exp(-d * .5);

            // 빔 안을 고르게 채우는 성분(.1)은 작게, 축으로 모이는 성분(pow 2.2)을 크게: 겹쳐도 화면이 뿌옇게 덮이지 않는다
            vec3 light = tint * (.04 + pow(max(1. - r, 0.), 3.) * 1.) * shafts + tint * hot * .4;
            return light * inside * fall;
          }

          void main(){
            // 큰 배경판의 uv를 '첫 화면 기준 좌표'로 환산: 첫 화면에서는 빔 구도가 그대로이고, 판 자체는 공간에 고정된다
            vec2 p = (vUv - .5) * uScale + .5;
            float t = uTime;
            vec3 col = vec3(.004, .005, .008);
            // 세 광원 모두 화면 밖(uv 0~1 바깥)에 위치. 색은 학교 컬러를 중심으로 한 변주
            // 각 광원이 서로 다른 주기의 사인 두 개를 합친 불규칙한 스윕으로 천천히 고개를 돌린다(±약 6°).
            // 빔 각도가 넓어서 조금만 움직여도 화면에서는 크게 보이므로 속도·폭을 작게 둔다.
            // 광원 위치도 화면 밖에서 조금씩 떠다니고, 빔 폭도 살짝 숨 쉬듯 변한다.
            float swA = sin(t * .18) * .08 + sin(t * .47 + 1.3) * .03;
            float swB = sin(t * .14 + 2.) * .08 + sin(t * .36 + .4) * .03;
            float swC = sin(t * .21 + 4.) * .08 + sin(t * .41 + 2.7) * .03;
            vec2 drift = vec2(sin(t * .10), cos(t * .085)) * .04;
            col += beam(p, vec2(-.30, 1.30) + drift,                   // 좌상단 밖: Sogang Red
              uB * 1.05, vec3(.16, .0, .04),  vec3(.2, .04, .0), .24 + sin(t * .24) * .02, swA, 1.);
            col += beam(p, vec2(.55, -.45) + drift.yx * vec2(1.5, .5), // 하단 밖: Hanyang Blue
              uA * 1.4,  vec3(.03, .01, .16), vec3(.0, .07, .14), .26 + sin(t * .22 + 1.) * .02, swB, 7.);
            col += beam(p, vec2(1.35, .95) - drift,                    // 우상단 밖: SKKU Green
              uC * 2.1,  vec3(.0, .055, .045), vec3(.04, .08, .0), .27 + sin(t * .25 + 2.) * .02, swC, 13.);
            col = col / (1. + col * .9); // 부드러운 톤 압축
            col = pow(col, vec3(1.25));       // 어두운 영역을 더 가라앉혀 대비를 높인다(뿌옇게 뜨지 않게)

            // 옅은 격자: 빛이 닿는 곳에서만 보이게
            vec2 gUv = p * vec2(18. * uAspect, 18.);
            vec2 g = abs(fract(gUv - .5) - .5) / fwidth(gUv);
            float line = 1. - min(min(g.x, g.y), 1.);
            col += line * .03 * (col.r + col.g + col.b + .02);

            col *= max(.25, 1. - .45 * length(p - .5));        // 비네팅
            col += (hash(gl_FragCoord.xy) - .5) * .006; // 밴딩 방지 그레인
            gl_FragColor = vec4(col, 1.);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  // 빛 배경은 공간에 고정한다(카메라를 따라오지 않음). 카메라가 어느 유성으로 가도 가려지지 않도록
  // 첫 화면에서 보이는 크기(base)의 SPAN배로 크게 깔고, 셰이더에서는 base 기준 좌표로 빔을 그린다.
  const SPAN = 2.6
  const baseH = 2 * (7 - BACKDROP_Z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.35
  const baseW = baseH * (size.width / size.height)
  material.uniforms.uAspect.value = baseW / baseH
  material.uniforms.uScale.value.set(SPAN, SPAN)
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime() + BEAM_T0
  })
  return (
    <mesh ref={ref} position={[0, 0, BACKDROP_Z]} scale={[baseW * SPAN, baseH * SPAN, 1]} material={material}>
      <planeGeometry />
    </mesh>
  )
}

// 모든 조각을 같은 비율(가로:세로 ≈ 1:1.8)의 팔면체 다이아몬드로 통일
const DIAMONDS = [
  { pos: [0.2, 0.1, 0], size: 1.05, main: true },
  { pos: [-3.2, 1.3, -0.6], size: 0.5, rot: [0.3, 0.4, 0.35] },
  { pos: [3.1, -1.1, 0.2], size: 0.45, rot: [0.2, 0.5, -0.4] },
  { pos: [2.6, 1.7, -1], size: 0.32, rot: [0, 0.3, -0.6] },
  { pos: [-2.3, -1.7, 0.6], size: 0.34, rot: [0.2, 0, 0.7] },
  { pos: [-4.4, -0.3, -1.6], size: 0.3, rot: [0.3, 0, 0.2] },
  { pos: [4.5, 0.9, -1.4], size: 0.28, rot: [0.5, 0.2, 0.4] },
  { pos: [1.4, -2.1, 1], size: 0.26, rot: [0.4, 0, -0.3] },
  { pos: [-1.2, 2.1, -1.2], size: 0.2, rot: [0.6, 0.8, 0] },
]

// 먼 별: 카메라가 유성 사이를 오갈 때 시차가 생겨 우주 공간의 깊이가 느껴지게 한다
function StarField({ count = isMobile ? 500 : 1400 }) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24
      pos[i * 3 + 2] = -5.6 + Math.random() * 3
      const b = 0.35 + Math.random() * 0.65
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = b
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])
  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.018} vertexColors transparent opacity={0.85} depthWrite={false} sizeAttenuation />
    </points>
  )
}

function Diamond({ d, buffer, groupRef, spinRef, shellRef }) {
  const h = d.size * 1.8
  return (
    <group ref={groupRef} position={d.pos}>
      <group ref={spinRef} rotation={d.rot}>
      {/* 안쪽 커팅면: 45° 돌린 작은 거울면 팔면체. 배경 버퍼에 함께 그려져 바깥 유리를 통해 굴절되어 보인다 */}
      <mesh scale={[d.size * 0.55, h * 0.62, d.size * 0.55]} rotation-y={Math.PI / 4}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading metalness={1} roughness={0.18} transparent opacity={0.3} envMapIntensity={0.7} />
      </mesh>
      <mesh ref={shellRef} scale={[d.size, h, d.size]}>
        <octahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          flatShading
          samples={isMobile ? 4 : d.main ? 10 : 6}
          thickness={d.main ? 3.2 : 1.8}
          roughness={0}
          ior={1.9}
          chromaticAberration={0.35}
          anisotropy={0.1}
          distortion={0.06}
          distortionScale={0.3}
          temporalDistortion={0}
          color="#ffffff"
        />
        {/* 커팅된 모서리: 면과 면이 만나는 선에 가는 하이라이트 */}
        <Edges threshold={10} lineWidth={1.25} color={[1.6, 1.6, 1.7]} transparent opacity={d.main ? 0.35 : 0.18} toneMapped={false} />
      </mesh>
      </group>
    </group>
  )
}

function Shards({ diamondRefs }) {
  const group = useRef()
  const mainSpin = useRef()
  const { viewport } = useThree()
  const scale = Math.min(1, viewport.width / 9)
  // 유리 조각이 모두 같은 배경 버퍼를 공유: 프레임당 한 번만 배경을 그려 여러 조각이어도 가볍게 유지
  // 유리 너머 배경은 굴절로 어차피 뭉개지므로 절반 해상도로 충분 (픽셀 수 1/4)
  const { size } = useThree()
  const buffer = useFBO(Math.round(size.width * 0.5), Math.round(size.height * 0.5), { samples: 0 })
  // 바깥 유리 껍질만 숨기고 버퍼를 그림: 안쪽 커팅면은 버퍼에 남아 유리를 통해 굴절되어 보인다
  const shells = useRef([])

  useFrame((state, delta) => {
    shells.current.forEach((m) => m && (m.visible = false))
    state.gl.setRenderTarget(buffer)
    state.gl.render(state.scene, state.camera)
    state.gl.setRenderTarget(null)
    shells.current.forEach((m) => m && (m.visible = true))

    if (mainSpin.current) mainSpin.current.rotation.y += delta * 0.25
    const g = group.current
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.35, 3, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.25, 3, delta)
  })

  return (
    <group ref={group} scale={scale}>
      {DIAMONDS.map((d, i) =>
        d.main ? (
          <Diamond key={i} d={d} buffer={buffer} groupRef={(g) => (diamondRefs.current[i] = g)} spinRef={mainSpin} shellRef={(m) => (shells.current[i] = m)} />
        ) : (
          <Float key={i} speed={1 + (i % 3) * 0.4} rotationIntensity={1.4} floatIntensity={1.2}>
            <Diamond d={d} buffer={buffer} groupRef={(g) => (diamondRefs.current[i] = g)} shellRef={(m) => (shells.current[i] = m)} />
          </Float>
        ),
      )}
    </group>
  )
}

const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

// 페이지 전환 연출 시간(초): 빠져나오기 → 전체 모습에서 잠깐 멈춤 → 다음 다이아몬드로 들어가기
const T_OUT = 0.8
const T_HOLD = 0.2
const T_IN = 1.2
// 초점이 맞았을 때 유성이 화면 높이에서 차지하는 비율 (모바일은 글 뒤에 깔리므로 작게)
const FILL = isMobile ? 0.3 : 0.4

// 스크롤 카메라: 화면 가운데에 있는 섹션(data-diamond="N")이 바뀌면, 스크롤 속도와 상관없이
// 정해진 시간 순서대로 현재 다이아몬드에서 빠져나와 전체 모습을 보여준 뒤 N번 다이아몬드로 들어간다.
function CameraRig({ diamondRefs }) {
  const { camera } = useThree()
  const sections = useRef([])
  const hero = useRef(null)
  const shown = useRef(null) // 지금 내용이 보이는 섹션
  // from: 빠져나오는 다이아몬드, to: 들어갈 다이아몬드(-1이면 전체 모습), start: 전환 시작 시각, zoomFrom: 전환 시작 시점의 줌
  const tr = useRef({ from: -1, to: -1, page: undefined, start: -Infinity, zoomFrom: 0, zoom: 0, label: null })
  const v = useMemo(
    () => ({ look: new THREE.Vector3(), goalPos: new THREE.Vector3(), goalLook: new THREE.Vector3(), wp: new THREE.Vector3(), ws: new THREE.Vector3(), t: new THREE.Vector3() }),
    [],
  )

  useEffect(() => {
    sections.current = [...document.querySelectorAll('[data-diamond]')]
    hero.current = document.getElementById('top')
    // 3D가 실제로 뜬 뒤에만 "카메라에 맞춰 내용 등장"을 켠다. 3D가 없으면 내용은 항상 보인다
    document.documentElement.classList.add('reveal-ready')
    return () => document.documentElement.classList.remove('reveal-ready')
  }, [])

  useFrame(({ clock }, delta) => {
    const now = clock.getElapsedTime()
    const mid = window.innerHeight / 2
    // 화면 가운데에 있는 페이지. data-diamond="-1"(마무리 페이지)이나 hero는 유성 없이 전체 모습을 보여준다
    let page = hero.current
    for (const el of sections.current) {
      const r = el.getBoundingClientRect()
      if (r.top <= mid && r.bottom > mid) {
        page = el
        break
      }
    }
    const current = page?.dataset.diamond ? Number(page.dataset.diamond) : -1

    const s = tr.current
    if (page !== s.page) {
      // 전환 중에 또 페이지가 바뀌면, 지금 보고 있는 다이아몬드에서 현재 줌 값부터 다시 빠져나온다
      const elapsed = now - s.start
      s.from = elapsed < T_OUT ? s.from : s.to
      s.zoomFrom = s.zoom
      s.to = current
      s.page = page
      s.start = now
    }

    const t = now - s.start
    let focus
    if (t < T_OUT) {
      focus = s.from
      s.zoom = s.zoomFrom * (1 - smooth(t / T_OUT))
    } else if (t < T_OUT + T_HOLD) {
      focus = s.to
      s.zoom = 0
    } else {
      focus = s.to
      s.zoom = s.to < 0 ? 0 : smooth((t - T_OUT - T_HOLD) / T_IN)
    }
    const zoom = s.zoom

    // 내용 등장: 이전 페이지 내용은 전환이 시작되자마자 사라지고,
    // 새 페이지 내용은 카메라가 유성에 거의 다가갔을 때(들어가기 65% 지점) 나타난다
    // 전체 모습 페이지(hero, 마무리)는 줌아웃이 거의 끝날 때 나타난다
    let reveal = null
    if (s.to >= 0 ? t > T_OUT + T_HOLD + T_IN * 0.65 : t > T_OUT * 0.7) reveal = s.page
    if (reveal !== shown.current) {
      shown.current?.classList.remove('is-active')
      reveal?.classList.add('is-active')
      shown.current = reveal
    }

    v.goalPos.set(0, 0, 7)
    v.goalLook.set(0, 0, 0)
    const g = diamondRefs.current[focus]
    if (g && zoom > 0) {
      g.getWorldPosition(v.wp)
      g.getWorldScale(v.ws)
      const size = DIAMONDS[focus].size * v.ws.x
      // 관측 거리: 유성(높이 3.6×size)이 화면 높이의 FILL만큼 차지하도록. 꼬리와 주변 우주도 함께 보인다
      const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const dist = (size * 3.6) / (viewH * FILL)
      // 시선을 유성 왼쪽에 둬서 유성이 화면 오른쪽(약 70% 지점)에 오게 한다 (설명은 왼쪽)
      const shift = isMobile ? 0 : dist * (viewH / 2) * camera.aspect * 0.4
      v.t.set(v.wp.x - shift, v.wp.y, v.wp.z)
      v.goalLook.lerp(v.t, zoom)
      v.t.z += dist
      v.goalPos.lerp(v.t, zoom)
    }

    const damp = THREE.MathUtils.damp
    camera.position.set(
      damp(camera.position.x, v.goalPos.x, 6, delta),
      damp(camera.position.y, v.goalPos.y, 6, delta),
      damp(camera.position.z, v.goalPos.z, 6, delta),
    )
    v.look.set(damp(v.look.x, v.goalLook.x, 6, delta), damp(v.look.y, v.goalLook.y, 6, delta), damp(v.look.z, v.goalLook.z, 6, delta))
    camera.lookAt(v.look)

    // 관측 HUD: 초점 유성의 화면 위치·크기를 계산해 DOM에 반영
    const el = hud.el
    if (el) {
      const target = diamondRefs.current[focus]
      const o = target ? Math.max(0, (zoom - 0.7) / 0.3) : 0
      el.style.setProperty('--o', o.toFixed(3))
      if (o > 0) {
        target.getWorldPosition(v.wp)
        target.getWorldScale(v.ws)
        const size = DIAMONDS[focus].size * v.ws.x
        const W = window.innerWidth
        const H = window.innerHeight
        v.t.copy(v.wp).project(camera)
        const x = (v.t.x * 0.5 + 0.5) * W
        const y = (-v.t.y * 0.5 + 0.5) * H
        v.t.copy(v.wp)
        v.t.y += size * 1.8
        v.t.project(camera)
        const r = Math.abs((-v.t.y * 0.5 + 0.5) * H - y)
        el.style.setProperty('--x', `${x.toFixed(1)}px`)
        el.style.setProperty('--y', `${y.toFixed(1)}px`)
        el.style.setProperty('--r', `${r.toFixed(1)}px`)
        if (s.label !== focus) {
          s.label = focus
          const sec = sections.current.find((e) => Number(e.dataset.diamond) === focus)
          const idx = sections.current.indexOf(sec) + 1
          el.querySelector('.hud-code').textContent = `OBJ-${String(idx).padStart(2, '0')} · ${(sec?.id || 'apply').toUpperCase()}`
        }
        el.querySelector('.hud-coord').textContent =
          `X ${v.wp.x.toFixed(2)}  Y ${v.wp.y.toFixed(2)}  Z ${v.wp.z.toFixed(2)}  ·  D ${camera.position.distanceTo(v.wp).toFixed(2)}`
      }
    }
  })
  return null
}

// 후처리: 빛 번짐 + 경계 보정.
// MSAA(multisampling)는 끈다: 유리 배경 버퍼를 직접 그리는 구조와 함께 쓰면 GPU에 따라(맥 포함)
// 에러 없이 화면 전체가 검게 나오는 문제가 있었다. 계단 현상 보정은 SMAA가 맡는다.
function Effects() {
  return (
    <EffectComposer multisampling={0}>
      {/* 밝은 반사·모서리에만 빛 번짐이 생기도록 임계값을 높게 */}
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.3} radius={0.5} />
      {/* 가는 모서리 선의 계단 현상을 매끄럽게: 해상도를 올리지 않고 가장자리만 보정 */}
      <SMAA />
    </EffectComposer>
  )
}

const MAX_DPR = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, isMobile ? 1.25 : 1.5)

export default function Scene() {
  // 프레임이 떨어지면 해상도를 자동으로 낮추고, 여유가 생기면 다시 올린다
  const [dpr, setDpr] = useState(MAX_DPR)
  const diamondRefs = useRef([])
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 7], fov: 40, near: 0.01 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(MAX_DPR, d + 0.25))}
        flipflops={4}
        onFallback={() => setDpr(1)}
      />
      <Backdrop />
      {/* 빛 속에 떠다니는 미세 먼지: 유리 뒤에 있어 굴절되어 보인다 */}
      <Sparkles count={isMobile ? 60 : 180} scale={[14, 8, 5]} position={[0, 0, -2.5]} size={1.8} speed={0.25} opacity={0.55} noise={1} color="#e8eeff" />
      <StarField />
      <Shards diamondRefs={diamondRefs} />
      <CameraRig diamondRefs={diamondRefs} />

      {/* 외부 HDRI 대신 로컬 라이트포머로 반사 환경 구성: 날카로운 면에 흰 반사가 또렷하게 맺히도록 */}
      <Environment resolution={256}>
        {/* 빔과 같은 방향에 같은 계열 색 조명을 둬서, 면이 향한 쪽에 따라 다른 색이 반사되게 한다 */}
        <Lightformer form="rect" color="#e0231a" intensity={1.1} position={[-6, 5, 2]} scale={[7, 2.5, 1]} />
        <Lightformer form="rect" color="#e0681a" intensity={0.45} position={[-7, 0, -2]} scale={[4, 2, 1]} />
        <Lightformer form="rect" color="#2f6fe0" intensity={1.1} position={[1, -6, 2]} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" color="#5a2fd0" intensity={0.55} position={[-3, -5, -3]} scale={[4, 2, 1]} />
        <Lightformer form="rect" color="#1fb57a" intensity={1.1} position={[7, 4, 1]} scale={[7, 2.5, 1]} />
        <Lightformer form="rect" color="#1a9aa0" intensity={0.55} position={[6, -1, -3]} scale={[4, 2, 1]} />
        <Lightformer form="rect" color="#ffffff" intensity={0.5} position={[0, 3, 6]} scale={[6, 1, 1]} />
      </Environment>

      <Effects />
    </Canvas>
  )
}
