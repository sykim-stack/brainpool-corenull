 CORERING_ISSUES.md 내용 검토
우선순위 재정렬 제안
🔴 버그 1 - 카카오 공유 URL 인코딩
  → encodeURIComponent() 하나로 해결 가능
  → 빠름

🔴 버그 2 - 발음 공유 불가
  → audio_contributions 테이블 조회 + getAudio API 추가
  → 시간 좀 걸림

🟡 개선 3 - TTS fallback
  → Web Speech API 붙이기
  → 버그 2 해결 후 자연스럽게 연결됨
버그 2 설계 미리 보면
/api/phrase?action=getAudio&word_id=xxx
  → audio_contributions 테이블에서 word_id 조회
  → { audioUrl, contributor_id, created_at } 반환
  → WordModal에서 본인 녹음 없어도 재생 가능

🎯 다음 세션 체크리스트
[ ] 깃허브 동기화 (컴퓨터 초기화 후폭풍 마무리)
[ ] 카카오 공유 URL 인코딩
[ ] getAudio API 추가
[ ] TTS fallback