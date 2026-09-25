import { ViewTransition, type ReactNode } from "react";

/**
 * 페이지 전환 방향. Link의 transitionTypes(nav-forward / nav-back)에 맞춰 옆으로 밀리고,
 * 그 밖의 이동은 부드럽게 겹쳐 사라진다. 레이아웃이 아니라 각 page에서 감싼다.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
