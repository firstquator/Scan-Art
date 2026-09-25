import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getPublicArtwork, listPublishedArtworks } from "./artworks";
import { getSettings } from "./settings";

/**
 * 관람객 화면 데이터 캐시.
 * - 페이지는 요청마다 그리지만, DB 조회 결과는 이 태그로 캐시해 두어 관람객이 DB를 기다리지 않는다
 *   (Neon이 쉬고 있다가 깨어나는 지연도 피한다).
 * - 관리자가 저장·공개 전환·삭제하면 updateTag(PUBLIC_DATA_TAG)로 즉시 비운다.
 *   페이지 전체 캐시(ISR)와 달리 오래된 화면이 한 번 더 나가는 일이 없다.
 */
export const PUBLIC_DATA_TAG = "public-data";

const cachedArtwork = unstable_cache(getPublicArtwork, ["public-artwork"], { tags: [PUBLIC_DATA_TAG] });
const cachedSettings = unstable_cache(getSettings, ["public-settings"], { tags: [PUBLIC_DATA_TAG] });
const cachedPublished = unstable_cache(listPublishedArtworks, ["public-published"], { tags: [PUBLIC_DATA_TAG] });

/** 한 요청 안에서 generateMetadata와 page가 같은 조회를 두 번 하지 않도록 묶는다. */
export const loadPublicArtwork = cache(cachedArtwork);
export const loadSettings = cache(cachedSettings);
export const loadPublishedArtworks = cache(cachedPublished);
