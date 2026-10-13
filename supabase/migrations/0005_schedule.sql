-- 첫 화면 일정 (기획서 기능 1 · 9)
-- 첫 화면의 일시·신청 버튼·행사 일정은 모두 event_config(관리자 페이지 > 일정) 값으로 그린다.
-- 단계 중 '결과 발표'만 칸이 없어 더한다. 안내용 시각이며, 결과를 실제로 공개하는 것은 results_published_at이다
alter table event_config add column if not exists results_announce_at timestamptz;
