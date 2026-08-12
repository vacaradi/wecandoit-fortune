---
description: 위캔두잇 오늘의 운세 하루치(36세트)를 생성한다. 날짜를 인자로 주면 그날치, 안 주면 오늘치를 만든다. "2026-08-13 7" 처럼 두 번째 인자로 일수를 주면 그날부터 며칠치를 순서대로 만든다.
argument-hint: [YYYY-MM-DD] [일수]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, WebSearch, WebFetch
---

# 하루치 콘텐츠 생성

`daily-content` 스킬을 불러와서 그 파이프라인 그대로 실행한다.

## 인자 해석

```
인자 없음              → 오늘 날짜 1일치
"2026-08-13"          → 그날 1일치
"2026-08-13 7"        → 2026-08-13 부터 7일치 (순서대로)
```

여러 날치일 때는 **반드시 하루씩 순서대로** 만든다.
앞날의 이력이 뒷날의 금지 목록이 되어야 하므로 병렬 생성은 금지.

## 실행 전 확인

```bash
# 이미 만들어진 날인지 확인
ls content/daily/YYYY/MM/
```

이미 있으면 사용자에게 덮어쓸지 물어본다. 말없이 덮어쓰지 않는다.

## 실행

`daily-content` 스킬의 0~8단계를 따른다.

1. `content/pools/used-log.json` 읽기 → 금지 목록 확보
2. 소재 36개 선정
3. `fortune-writer` 병렬 호출 → 운세 36세트
4. `quote-curator` 호출 → 명언 36개 (출처 검증 필수)
5. 부적 36개 직접 작성
6. `netflix-picker` 호출 → 작품 36편 (링크 검증 필수)
7. `content/daily/YYYY/MM/YYYY-MM-DD.json` 저장
8. `node scripts/validate-content.mjs <경로>` 통과할 때까지 수정
9. `content-checker` 검수 → 반려된 세트만 재작성 후 7~9 반복
10. `content/pools/used-log.json` 갱신

## 완료 후 보고

```
2026-08-13 생성 완료

세트         36 / 36
자동 검증     통과
검수         통과 (재작성 2회)
소재 중복     0
명언 인물 중복 0
넷플릭스 중복  0

score 분포   90+ 10개 / 40미만 4개
aura 분포    금 7 · 하늘 6 · 남보라 6 · 보라 5 · 주홍 6 · 청록 6

특히 좋은 세트
  horse/senior  "한 발씩 늦습니다"
  goat/student  "용돈이 벌써 없습니다"
```

## 주의

- **처음 돌릴 때는 7일치까지만.** 사람이 읽고 판단한 뒤에 대량 생성한다.
- 검수에서 "나쁘지 않은데 안 웃김"이 절반을 넘으면 멈추고 보고한다.
  규칙 파일을 손봐야 한다는 신호다.
- 명언 `verified: false`, 넷플릭스 `verified: false` 는 절대 저장하지 않는다.
