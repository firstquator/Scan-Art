/** 화면에서 쓰는 작품 사진 정보 */
export interface ImageView {
  urlLg: string;
  urlSm: string;
  width: number;
  height: number;
  blurData: string;
  alt: string;
}

/** 관람 화면과 관리자 미리보기가 함께 쓰는 작품 정보 */
export interface ArtworkView {
  id: string;
  title: string;
  artists: string[];
  material: string;
  size: string;
  description: string;
  ttsEnabled: boolean;
  youtubeUrl: string;
  audio: { url: string; duration: number } | null;
  /** 배경음악. 없으면 null */
  bgm: { url: string; name: string } | null;
  images: ImageView[];
}

export interface ArtworkLink {
  id: string;
  title: string;
  artists: string[];
  cover: ImageView | null;
}

/** 명제표에만 쓰는 글. 작품 정보와 다르게 고친 항목만 담는다. 작가는 한 줄에 한 명. */
export interface LabelText {
  title?: string;
  artists?: string;
  material?: string;
  size?: string;
}

export interface AdminArtworkSummary extends ArtworkLink {
  isPublished: boolean;
  imageCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
  label: LabelText | null;
  material: string;
  size: string;
  updatedAt: string;
}

export interface SiteSettingsView {
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  venue: string;
  intro: string;
  organizer: string;
  cover: (ImageView & { bytes: number }) | null;
}
