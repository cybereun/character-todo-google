# Character Todo Google

![Platform](https://img.shields.io/badge/platform-Windows%2011-0078D4?style=for-the-badge&logo=windows11&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Google API](https://img.shields.io/badge/Google%20API-Integration-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Version](https://img.shields.io/badge/version-v2.7.1-blue?style=for-the-badge)

복어 캐릭터가 바탕화면 위에서 함께 움직이는 Windows 데스크톱 할일 위젯입니다. (Google Tasks API 연동 버전)

**개발자:** Gogo Lebi
**저장소:** https://github.com/cybereun/character-todo-google

## 특징

- **실시간 자동 업데이트**: 새 릴리즈 출시 시 앱에서 바로 알림 팝업 및 진행 상황 창(다운로드 %, 용량, 속도)을 통해 업데이트 다운로드 및 재실행 설치가 자동 진행됩니다.
- **Google Tasks API 연동**: 구글 계정의 할일 목록과 실시간으로 양방향 동기화됩니다.
- **AI 스마트 입력 (화면 캡처)**: 이 앱에서 캡처한 내용을 바로 할일로 입력하는 단축키는 `Ctrl` + `Alt` + `T` (Mac의 경우 `Cmd` + `Option` + `T`) 입니다.
  
  **사용 방법은 다음과 같습니다:**
  1. Windows 기본 캡처 도구(`Win` + `Shift` + `S`) 등을 사용하여 화면에서 할일로 추가하고 싶은 부분을 캡처합니다. (클립보드에 이미지가 복사된 상태)
  2. `Ctrl` + `Alt` + `T` 단축키를 누릅니다.
  3. 앱이 클립보드의 이미지를 AI(Gemini)로 분석하여, 자동으로 할일 제목과 마감일을 추출해 목록에 추가해 줍니다.
  *(참고: 이 기능을 사용하려면 앱 내에 Gemini API 키가 설정되어 있어야 합니다.)*
- Windows 바탕화면 위에 떠 있는 캐릭터형 할일 위젯
- 다른 프로그램을 클릭하면 일반 창처럼 뒤로 내려가 작업을 방해하지 않음
- 캐릭터 클릭으로 할일창 열기/닫기
- 캐릭터를 마우스로 드래그해 바탕화면 어디든 이동
- 할일 추가, 수정, 삭제, 완료 체크 지원
- 완료 체크 시 효과음과 파티클 애니메이션 실행
- 완료 직후 짧은 시간 동안 실행 취소 가능
- 완료한 일 보기에서 취소선이 적용된 완료 목록 확인
- 완료한 일도 목록에서 삭제 가능
- 마감 날짜/시간 설정 가능
- 마감이 지난 할일이 있으면 화난 복어로 바뀌고 덜덜 떨림
- 할일이 있으면 배가 부푼 복어, 할일이 없으면 날씬한 복어로 자동 전환
- 둥실둥실 움직임과 눈 깜빡임 애니메이션 적용

## 설치 및 실행

### 1. Node.js 설치

Node.js가 설치되어 있어야 합니다.

```powershell
node --version
npm --version
```

### 2. 저장소 받기

```powershell
git clone https://github.com/cybereun/character-todo-google.git
cd character-todo-google
```

### 3. 앱 실행

```powershell
npm run start
```

`run-app.ps1`은 로컬 `node_modules`에 Electron이 있으면 그것을 사용합니다. 없으면 `C:\tmp\character-todo-runtime`에 Electron 런타임을 설치한 뒤 앱을 실행합니다.

### 4. 문법 검사

```powershell
npm run lint:js
```

## 설치 문제 대응

다른 PC에서 설치 파일은 실행되지만 앱 창이 뜨지 않거나 `GPU process exited unexpectedly` 류의 오류로 종료되면 다음을 먼저 확인합니다.

- 인터넷에서 받은 설치 파일은 Windows 차단 정보가 붙을 수 있습니다. 설치 전 PowerShell에서 `Unblock-File -LiteralPath "Character Todo Setup 1.0.5.exe"`를 실행하거나, 파일 속성에서 차단 해제를 적용합니다.
- `C:\Users\<사용자>\AppData\Local\Programs` 아래 설치 폴더의 읽기/실행 권한과 상속이 깨져 있으면 Electron의 GPU/렌더러 자식 프로세스가 시작되지 않을 수 있습니다. 동일 앱이 `C:\`의 일반 폴더에서는 실행되는데 설치 폴더에서만 실패하면 `icacls`로 해당 폴더의 권한과 상속 상태를 확인합니다.
- 앱은 GPU 가속을 사용하지 않도록 설정되어 있습니다. 이 위젯은 고성능 그래픽이 필요하지 않으므로 일부 PC의 GPU 프로세스 초기화 실패 영향을 줄입니다.
- 시작 실패나 단일 인스턴스 잠금 오류는 사용자 데이터 폴더의 `error.log`에 기록됩니다.

## 릴리즈 노트

### v2.7.1

- 캐릭터·말풍선·할일 목록·검색/달력/알림 패널의 드래그 기준을 하나의 레이아웃으로 통일
- 드래그 중 고빈도 창 이동 요청을 프레임 단위로 정리해 창 구성 요소가 서로 벌어지는 현상 수정

### v2.6.17

- 고양이, 토끼, 곰돌이, 꿀벌, 소년, 소녀, AI 비서, 로봇 캐릭터에 기본·할일 있음·깜빡임·화남 5상태 이미지 적용
- 기존 펭귄과 복어 캐릭터 동작 유지

### v2.5.3

- **GPU 프로세스 충돌 에러 해결**: 가상 머신 등 특정 환경에서 Electron의 GPU 렌더링 관련 프로세스가 지속적으로 충돌하며 실행이 실패하는 고질적인 문제를 해결하기 위해, 앱 실행 시 샌드박스와 GPU 가속을 완전히 차단하는 옵션(`--no-sandbox`, `--disable-gpu` 등)을 강제 적용했습니다.

### v2.5.0

- **AI 분석 로직 완전 통합 (All-in-one)**: 캡처 및 AI 이미지 분석을 위해 필요했던 외부 파이썬 스크립트 의존성을 제거하고, 모든 기능을 Electron `main.js` 내부에 통합했습니다.
- **최신 Gemini 모델 탑재**: 내부 AI 모델을 `gemini-1.5-flash`에서 최신 `gemini-2.5-flash`로 업그레이드하여 속도와 정확도를 향상시켰습니다.
- **UI 및 사용성 개선**: 내용이 긴 할일과 서브할일의 텍스트가 잘리지 않도록 자동 줄바꿈(Word wrap) 처리를 적용했습니다.
- **보안 및 안정성 강화**: API 키 입력 시 비밀번호처럼 마스킹 처리되도록 개선하고, 앱 재시작 시 발생할 수 있는 백그라운드 잠금(Lock file) 문제를 해결했습니다.
- **알림 브랜딩**: 윈도우 우측 하단 알림창에 표시되는 앱 이름을 "Electron"에서 "캐릭터 Todo V2.5.0"으로 변경했습니다.

### v2.0.0

- **Google API 연동**: Google Tasks API를 활용해 구글 계정의 할일 목록과 연동되는 기능을 도입했습니다.
- 프로젝트 및 배포 설정을 `Character Todo Google`에 맞게 개편했습니다.

### v1.0.5

- 확장 모니터 환경에서 캐릭터 위젯을 메인 모니터 밖의 다른 모니터로 드래그할 수 있도록 수정했습니다.
- 접힌 상태와 펼친 상태 모두 연결된 전체 모니터의 작업 영역 안에서 위치가 유지되도록 이동 제한 기준을 개선했습니다.

### v1.0.4

- 할일마다 서브할일을 추가할 수 있는 버튼을 추가했습니다.
- 서브할일 입력창에서 `Enter`를 누르면 현재 서브할일을 저장하고 다음 서브할일을 계속 입력할 수 있습니다.
- `Esc` 또는 취소 버튼으로 서브할일 연속 입력을 중단할 수 있습니다.
- 서브할일 완료 체크와 삭제를 지원합니다.
- 서브할일 데이터는 기존 할일 저장 파일에 함께 보관됩니다.

### v1.0.3

- 할일 데이터를 Electron 사용자 데이터 폴더의 `todos.json`에 저장해 앱 종료, 재부팅, 실행 컨텍스트 변경 후에도 일정이 유지되도록 했습니다.
- 기존 `localStorage` 데이터는 첫 실행 시 파일 저장소로 자동 이전됩니다.
- 잘못 복원된 과거 마감값을 정리해 모든 일정이 `01.01 오전 09:00`처럼 보이는 문제를 방지했습니다.
- 할일 수정 시 내용뿐 아니라 마감 날짜와 시간도 함께 변경할 수 있도록 했습니다.
- GPU 하드웨어 가속을 비활성화해 일부 Windows 설치 경로에서 Electron GPU 프로세스가 종료되는 영향을 줄였습니다.
- 단일 인스턴스 잠금과 시작 오류를 예외 처리하고 사용자 데이터 폴더에 오류 로그를 남기도록 했습니다.
- 앱이 항상 위에 고정되지 않도록 창 생성과 포커스 해제 시 always-on-top 상태를 명시적으로 해제했습니다.
- 작업 표시줄 아이콘 표시를 유지하고, Windows 숨겨진 아이콘 영역에 표시되는 트레이 아이콘과 열기/숨기기/종료 메뉴를 추가했습니다.
- Windows 시작 시 자동 실행을 유지하되 중복 실행을 막기 위해 단일 인스턴스 처리를 추가했습니다.
- 설치 후 트레이 아이콘이 정상 표시되도록 배포 패키지에 앱 아이콘을 포함했습니다.

### v1.0.2

- 설치된 앱이 Windows에서 관리자 권한을 요구하지 않도록 실행 권한을 현재 사용자 권한으로 명시했습니다.
- 기존 설치본에 남을 수 있는 Windows 호환성 레이어의 관리자 실행 플래그를 설치/제거 시 정리합니다.
- 앱 창이 다른 창 뒤로 내려간 뒤에도 다시 찾을 수 있도록 작업 표시줄 표시를 활성화했습니다.

### v1.0.1

- 앱 창이 모든 프로그램 위에 계속 고정되지 않도록 변경했습니다.
- 다른 프로그램을 클릭하면 Character Todo 창이 일반 창처럼 뒤로 내려갑니다.

## 프로젝트 구조

```text
assets/          캐릭터 이미지 자산
src/main.js      Electron 메인 프로세스
src/preload.js   안전한 IPC 브리지
src/index.html   앱 UI
src/styles.css   위젯, 캐릭터, 할일창 스타일
src/renderer.js  할일/완료/마감/드래그 UI 로직
run-app.ps1      Windows 실행 스크립트
```

## 라이선스

개인 프로젝트입니다.
