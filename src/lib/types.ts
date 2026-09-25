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
  images: ImageView[];
}

export interface ArtworkLink {
  id: string;
  title: string;
  artists: string[];
  cover: ImageView | null;
}

export interface AdminArtworkSummary extends ArtworkLink {
  isPublished: boolean;
  imageCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
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
