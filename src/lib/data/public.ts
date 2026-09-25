import "server-only";
import { cache } from "react";
import { getPublicArtwork, listPublishedArtworks } from "./artworks";
import { getSettings } from "./settings";

/** 한 요청 안에서 generateMetadata와 page가 같은 조회를 두 번 하지 않도록 묶는다. */
export const loadPublicArtwork = cache(getPublicArtwork);
export const loadSettings = cache(getSettings);
export const loadPublishedArtworks = cache(listPublishedArtworks);
