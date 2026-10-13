-- 선발 결과 공개 시각 (기획서 기능 3 · 9)
-- 운영진이 선발 발표 시각(event_config.selection_announce_at) 전에 승인·거절을 미리 정해 두어도 참가자에게 드러나지 않게 한다.
-- 화면은 서버 코드(lib/schedule.js announcedStatus)가 '제출'로 바꿔 보여 주고, DB에서는 승인된 사람만 쓰는 내 팀 기능을
-- 발표 전까지 막는다 (기능을 쓸 수 있는지만으로도 승인 여부를 알 수 있으므로). 발표 시각이 비어 있으면 바로 공개된다

-- 0004의 team_of에 선발 발표 시각 확인을 더한다
create or replace function team_of(p_user uuid, p_lock boolean default false) returns teams language plpgsql as $$
declare
  t teams;
  c event_config;
begin
  select * into c from event_config;
  if not exists (select 1 from applications where user_id = p_user and status = 'approved')
     or (c.selection_announce_at is not null and now() < c.selection_announce_at) then
    raise exception 'NOT_APPROVED';
  end if;
  if p_lock then
    select teams.* into t from teams join team_members m on m.team_id = teams.id where m.user_id = p_user for update of teams;
  else
    select teams.* into t from teams join team_members m on m.team_id = teams.id where m.user_id = p_user;
  end if;
  if not found then raise exception 'NOT_IN_TEAM'; end if;
  if t.origin = 'assigned' and c.team_assign_at is not null and now() < c.team_assign_at then
    raise exception 'NOT_IN_TEAM';
  end if;
  return t;
end $$;
