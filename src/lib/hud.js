// 3D 장면(CameraRig)이 매 프레임 관측 HUD의 DOM을 직접 갱신하기 위한 연결점.
// React 상태를 거치지 않아 스크롤·카메라 움직임에 맞춰 끊김 없이 따라간다.
export const hud = { el: null }
