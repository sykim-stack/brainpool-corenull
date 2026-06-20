# CoreRing/CoreChat 작업 지시 문서 (Claude 5 전용)
_기준일: 2026-06-18_

## 진행 현황 업데이트 (2026-06-19)
```
✅ P0-1 — 카카오 URL 인코딩 + 공유 UI 개선 완료
✅ P0-2 — 발음 공유 getAudio API 완료
✅ P1   — TTS fallback 완료
✅ React #310 — WordModal Hook 순서 수정 완료
✅ ChatBubble 인코딩 복구 완료
✅ 근본 원인 발견/해결 — Notification.requestPermission() 카카오 인앱 미지원
   → 호출 시 throw → 페이지 전체 죽음 (카카오 공유 진입 실패의 진짜 원인이었음)
   → typeof Notification !== 'undefined' 가드 + try/catch 안전 처리로 해결
✅ Service Worker 카카오 스킵 조건 제거
   → Notification 문제 해결됐으므로 카카오 인앱에서도 SW 정상 등록되도록 변경
   → 등록 완료 확인됨
```

**다음 작업: CRLF 근본 해결 (.gitattributes)**

반복되는 문제: PowerShell로 파일 생성/수정 시 CRLF 줄바꿈이 들어가고,
이후 패치 스크립트가 정확한 문자열을 못 찾아 매번 3단계 fallback 로직을
새로 짜야 했음 (.cjs 패치 스크립트 반복 발생). 근본 해결 필요.

작업 순서 (PowerShell):
```powershell
# 1. .gitattributes 파일 생성 (레포 루트)
cd G:\brainpool-clean
@'
* text=auto eol=lf
'@ | Set-Content ".gitattributes" -Encoding UTF8

# 2. 기존 파일 전체 재정규화 (내용 변경 아님, 줄바꿈만 LF로 통일)
git add --renormalize .
git status   # 다수 파일이 modified로 표시되는 것이 정상

# 3. 커밋 및 푸시
git commit -m "chore: normalize line endings to LF"
git push
```

적용 후에는 PowerShell `Set-Content -Encoding UTF8` 결과물의 줄바꿈이
일관되게 LF로 유지되어, 패치 스크립트에서 fallback 로직 없이도
문자열이 정확히 매칭된다.

**참고**: 이 CRLF 문제는 PowerShell 작업 패턴 자체에서 발생하는 것이라
CoreNull(`brainpool-corenull`), HajunAI(`hajuncore-app`) 레포도
잠재적으로 동일 이슈를 겪을 수 있음 — 각 레포는 독립된 git 저장소이므로
필요 시 동일한 `.gitattributes` 적용을 별도로 진행해야 함.

---

## BRAINPOOL SYSTEM MASTER PROMPT v2.0 (요약 발췌)

### CORE UNIT
```
Message = {
  id,
  type,        // post | comment | chat | event | fruit
  content,
  meta,
  relations,
  created_at
}
```

### SYSTEM ROLES
* CoreNull  → View Layer            (Message 표시) — CoreNull 전담이 작업 중
* CoreChat  → Flow Layer            (Message 전달) ← 담당
* CoreRing  → Interpretation Layer  (Message 해석)  ← 담당
* HajunAI   → Mind Layer            (Message 기억)

DO NOT mix responsibilities.

### Comment 구조 (중요 — 최근 정정된 부분)
```
Message(type='comment')는 CoreChat이 소유하지 않는다.
CoreNull → 댓글 표시
CoreRing → 댓글 번역/감정/의도 분석 (필요 시)
CoreChat → 댓글 생성 시 알림만 전달 (실시간 push)
```
댓글 데이터 자체는 CoreNull 레포 안에서 `messages` API로 통합 처리됨.
CoreChat은 댓글 Message가 생성될 때 **알림 전달만** 담당한다.

---

## 1. CoreRing/CoreChat 완성 현황 (2026-06-17 기준)

```
✅ 한↔베 번역 (DeepL + 캐시, tb_trans_logs)
✅ 번역기 모드 (방 없이 번역)
✅ 양방향 감지 → 채팅방 유도 배너
✅ 실시간 채팅 (2초 폴링)
✅ 방 생성/참여/삭제, 공개방/비밀방 구분 (is_public)
✅ 방 생성 → 공유 모달 (초대코드)
✅ 푸시 알림 (Web Push - Android)
✅ 음성 메시지 + 🔊 재생
✅ 메시지 삭제 (휴지통)
✅ CorePhrase 단어장 + 플립카드 학습
✅ 음성 DB 수집 (audio_contributions)
✅ WordModal 발음 녹음
✅ PWA 설치 (Android)
✅ RLS 보안 설정
✅ API 8개 통합 구조
✅ messages 테이블 통합
```

실사용 현황: 번역로그 1200+ 건, 사용자 — 아내(베트남/iOS), 숭실대 유학생(Android).
주요 사용은 Android 기준 풀 기능. iOS는 플랫폼 한계로 일부 기능 패스 처리됨.

---

## 2. 🔴 버그 (P0 — 즉시 수정 필요)

### 2-1. 카카오톡 공유 빈 페이지 문제
```
증상: 카카오톡 공유하기 클릭 → 빈 페이지 (This page couldn't load)
원인 A: 코어링 문자열(한글/특수문자)이 URL 인코딩 안 됨
원인 B: 카카오 인앱 브라우저가 일부 JS/PWA 리소스 로드 실패
파일: components/ShareRoomModal.tsx
```

해결 방향:
```
1. 공유 URL 생성 시 encodeURIComponent 적용
2. 카카오 인앱 브라우저 감지 → 외부 브라우저(Chrome)로 자동 리다이렉트

if (/KAKAOTALK/i.test(navigator.userAgent)) {
  location.href = "kakaotalk://web/openExternal?url="
    + encodeURIComponent(location.href);
}
```
index.html 또는 root layout 상단에 적용.

### 2-2. 음성 발음 공유 불가 문제
```
증상: WordModal에서 발음 녹음한 사람만 🔊 버튼 보임
      다른 사람은 녹음된 발음을 들을 수 없음
원인: audioUrl이 로컬 state에만 저장, DB에서 재조회 안 함
파일: components/WordModal.tsx
```

해결 방향:
```
- audio_contributions 테이블에서 해당 word의 발음 조회
- /api/phrase 에 getAudio 액션 추가
- 다른 사용자 접속 시에도 기존 발음 들을 수 있도록 수정
```

---

## 3. 🟡 개선 (P1 — 기능 추가)

### 3-1. 번역 결과 TTS fallback
```
요청: 녹음된 발음 없으면 기계음(TTS)이라도 발음 제공
파일: components/ChatBubble.tsx, components/WordModal.tsx
```

방향:
```
우선순위 A: 원어민 발음(audio_contributions) 있으면 그것 재생
우선순위 B: 없으면 Web Speech API TTS로 fallback (무료, 크레딧 불필요)

const utterance = new SpeechSynthesisUtterance(translatedText);
utterance.lang = 'vi-VN'; // 또는 'ko-KR'
speechSynthesis.speak(utterance);
```

iOS도 Web Speech API TTS 자체는 어느 정도 지원되므로 (STT와는 별개) 같이 처리 가능.

---

## 4. 🟢 iOS 플랫폼 한계 (해결 불가 — 참고용, 작업 대상 아님)

```
- Web Push 알림 미지원
- Web Speech API STT 제한
- MediaRecorder webm 미지원 (재생은 mp3/aac 변환으로 우회 가능)
→ 장기적으로 React Native 앱 필요. 지금 작업 범위 아님.
```

---

## 5. 작업 우선순위 요약

```
P0
├─ 카카오톡 공유 URL 인코딩 + 인앱브라우저 리다이렉트
└─ 발음 공유 getAudio API (audio_contributions 조회)

P1
└─ TTS fallback (Web Speech API, 원어민 발음 없을 때만)

보류 (iOS 플랫폼 한계, 작업 대상 아님)
└─ STT, Web Push, MediaRecorder iOS 이슈
```

---

## BRAINPOOL 계약서 (필수 준수)
* 모든 함수는 `(ctx) => ctx` 형태
* `throw` 절대 금지 → `_error` 필드만 사용
* `req.text()` + `JSON.parse()` only
* 모든 기능은 `?action=` 파라미터로
* 모든 요청에 `traceId` 필수
* Supabase REST 호출 시 `Accept-Profile` / `Content-Profile: corenring`(또는 해당 스키마) 헤더 필수

---

## FINAL RULE

👉 BRAINPOOL is NOT a collection of features.
👉 It is a system that interprets and displays Messages.
👉 CoreRing은 해석만, CoreChat은 전달만 — 댓글 데이터 자체를 소유하지 않는다.

Breaking this rule is considered a critical failure.