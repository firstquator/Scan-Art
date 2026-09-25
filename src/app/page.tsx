import { redirect } from "next/navigation";

/** 기본 주소는 관리자 화면. 관람객용 전시 표지는 /exhibition, 작품은 /a/{번호} (QR). */
export default function RootPage() {
  redirect("/admin");
}
