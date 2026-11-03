# 청크월드 – Render 배포 가이드

## 구성
- `server.js` : 정적 파일 + WebSocket 서버 (플레이어 위치, 블록 변경, 공격 전달)
- `public/index.html` : 게임 본체 (원본 청크월드_z26.html에서 접속 부분만 교체)
- `render.yaml`, `package.json`

## 배포 (Render)
1. 이 폴더를 GitHub 저장소에 올립니다.
2. Render → **New + → Blueprint** → 저장소 선택 (직접 Web Service로 만들면 Build `npm install`, Start `npm start`)
3. 배포 후 나오는 `https://○○○.onrender.com` 주소를 친구들에게 공유하세요.

## 멀티플레이 방식
- **같은 시드(월드 코드)**를 입력한 사람끼리만 서로 보이고, 블록 변경도 공유돼요.
- 서버가 켜져 있는 동안은 블록 변경을 기억해서, 나중에 들어온 사람에게도 보내 줘요. (서버가 재시작하면 초기화)
- 저장하기는 브라우저(localStorage)에 되고, 파일 내보내기/불러오기도 그대로 쓸 수 있어요.

## 참고
- 무료 플랜은 15분간 접속이 없으면 잠들고, 다시 접속하면 켜지는 데 30~60초 걸려요.
- 최대 동시 접속 40명.

## 로컬 테스트
```
npm install && npm start   # http://localhost:3000 을 두 탭에서 열기
```
