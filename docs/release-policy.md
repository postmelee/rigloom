# Release policy / 릴리스 정책

## English
Latest owner checkpoint (2026-10-25): implement #4 humanoid mapping and existing bind/weight validation through its issue and a reviewable PR. This authorizes #4 implementation, verification and documentation. PR merge, #5 or later implementation, release tags, Releases and deployment still require new explicit owner approval.
Repository creation, planning, research, local implementation, verification, issues, documentation and reviewable PRs are authorized. PR automatic merge is not authorized; leave PRs for review. Do not merge without owner direction.

Before creating release tags, publishing GitHub Releases, deploying to Pages/any hosting, or adding model files to public release artifacts, obtain the owner's explicit approval for that exact batch. Previous drum-vrm approval, successful CI, a merge or milestone completion is not approval.

Prepare first: change summary, tested commit SHA, executed checks, known limitations, deployment scope and external asset/rights inventory. Approval is the final release gate. Keep implementation and verification moving while release is unapproved. There is no deploy workflow in the initial implementation.

After an actual deployment, record URL and deployed SHA in handoff. A localhost development server is not public deployment. Planned, implemented/unreleased and deployed are separate states.

## 한국어
최신 소유자 지시(2026-10-25): #4 휴머노이드 매핑과 기존 바인드·가중치 검증을 이슈와 검토 가능한 PR로 진행합니다. #4 구현·검증·문서화는 승인되었습니다. PR 병합, #5 이후 구현, 릴리스 태그·Release·배포에는 소유자의 새로운 명시적 승인이 필요합니다.
저장소 생성, 계획, 조사, 로컬 구현, 검증, 이슈·문서·검토 가능한 PR 작성은 승인되었습니다. PR 자동 병합은 승인되지 않았으며 검토를 위해 남깁니다. 소유자의 지시 없이 병합하지 않습니다.

릴리스 태그, GitHub Release, Pages 등 모든 호스팅 배포, 공개 배포물에 모델 파일 편입은 해당 배치에 대한 소유자의 명시적 승인을 먼저 받아야 합니다. 과거 drum-vrm 승인, CI 통과, 병합, 마일스톤 완료는 승인이 아닙니다.

먼저 변경 요약, 검증한 커밋 SHA, 실행한 검사, 알려진 제한, 배포 범위, 외부 자산·권리 목록을 준비합니다. 승인은 최종 릴리스 단계이며 미승인 상태에서도 구현·검증은 계속할 수 있습니다. 초기 구현에는 배포 워크플로가 없습니다.

실제 배포 후 URL과 배포 SHA를 handoff에 기록합니다. localhost 개발 서버는 공개 배포가 아닙니다. 계획·구현되었지만 미배포·공개 배포 상태를 구분합니다.
