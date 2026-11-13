# 삼국지 일기토 (ilgito)

1인칭 시점 3D 기마 일기토. 말을 달려 적장과 맞붙고, 쳐내고, 무너뜨리고, 벤다.
three.js r128 위에서 도는 단일 HTML 게임이다. 모델·질감은 코드로 만들고, 소리는 실제 녹음 샘플을 내장했다.
v0.3부터 그림은 셀 셰이딩(단계 음영 + 먹선 외곽선)이고, v0.4부터 표정과 컷 카메라, 임팩트 프레임, 집중선, 컷인, 기합 글자가 들어갔다.
v0.5부터 얼굴은 펜과 먹으로 그린 극화풍(각진 얼굴, 가는 눈매, 해칭 음영)이다.

- 플레이: <https://aaronkyung-a11y.github.io/ilgito/> (`main` 브랜치의 판)
- 최신 릴리스: `index.html` — 홈 화면에 설치할 수 있는 PWA 판
- 버전별 스냅샷: `versions/ilgito-v0.x.html` — 파일 하나로 열리는 판(three.js는 cdnjs에서 받는다)
- 변경 기록과 검증 내용: `CHANGELOG.md`

## 앱으로 설치

- Android Chrome: 첫 화면 오른쪽 위 "앱으로 설치" 단추, 또는 브라우저 메뉴의 "앱 설치"
- iOS Safari: 공유 단추 → "홈 화면에 추가"

한 번 열면 서비스 워커가 캐시해 오프라인에서도 실행된다. 온라인이면 열 때마다 서버에 새 판이 있는지 확인한다.
캐시본으로 열린 뒤에 새 판이 들어오면 첫 화면에 "새 버전 적용" 단추가 뜬다.

## 조작

- 스와이프 4방향: 베기. 적의 공격이 빛나는 쪽으로 그으면 쳐내기
- 길게 누르기: 방어(기력 소모)
- 奧義 단추: 기세가 가득 차면 난무 + 마무리 일격
- 키보드: 방향키·WASD, Space(방어), Enter(오의), Esc(일시정지)

## 빌드

```
node build.js            # dist/index.html (개발·아티팩트용)
node build.js release    # + versions/ilgito-v{버전}.html, index.html(PWA), sw.js — 버전은 package.json
node tools/make-icons.mjs  # icons/*.png
npm install              # 테스트에서만 쓰는 three@0.128.0
```

## 구조

- `template.html` 화면 틀과 스타일. `src/*.js`를 이름순으로 이어 붙여 넣는다
- `src/`
  - `00-util.js` 수학·three.js 도우미, 팔 IK
  - `05-samples.js` 내장 샘플(MP3 base64). `audio/make_samples.py`가 만든다
  - `10-audio.js` WebAudio 엔진: 샘플 재생, 잔향, 북·쟁 음악
  - `15-particles.js` 입자, 무기 궤적
  - `20-world.js` 전장: 하늘, 땅, 산, 군대, 성
  - `25-geo.js` 곡면(loft) 도우미, 캔버스로 그리는 질감
  - `30-models.js` 무기·말·무장 모델과 자세
  - `35-data.js` 전장 색, 무장·적장 데이터, 공격 패턴
  - `40-viewmodel.js` 1인칭 팔·무기·내 말
  - `50-fx.js` 불꽃·먼지, 2D 연출(낙관 글씨, 먹 번짐)
  - `60-input.js` 스와이프, 길게 누르기, 키보드
  - `65-rig.js` 적장 리그
  - `70-game.js` 진행, 판정, 적 AI, 자동 플레이 봇
  - `80-ui.js` HUD와 화면
  - `90-main.js` 카메라, 루프, 시작
- `pwa/` PWA 머리말 태그와 서비스 워커 원본. `manifest.webmanifest`, `icons/`, `vendor/three.min.js`
- `audio/` 샘플 가공·분석 스크립트(원본 WAV는 저장소에 넣지 않았다)
- `test/` 헤드리스 Chrome 테스트 스크립트(Playwright·Chrome 경로는 작업 환경 기준)
- `tools/make-icons.mjs` 아이콘 생성

## 에셋 출처

- three.js r128 (MIT) — `vendor/three.min.js`, 라이선스는 `vendor/three.LICENSE`
- 효과음·악기 샘플: [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 1.0)
- 글꼴: Yuji Boku, East Sea Dokdo, Hahmlet (Google Fonts, SIL Open Font License)
- 모델·질감·아이콘: 이 저장소의 코드로 생성
