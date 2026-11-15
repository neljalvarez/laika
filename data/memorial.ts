/**
 * The real photograph shown on the opening memorial screen.
 *
 * It must be a genuine historical photograph of Laika whose reuse rights are
 * documented (public domain or an open licence). Save the file locally as
 * /public/memorial/laika.jpg and fill in the fields below. While this is
 * `null`, the memorial shows its text on a black screen without a picture, so
 * no unverified image is ever published.
 */
export interface MemorialPhoto {
  src: string;
  alt: string;
  /** Who made or holds the photograph. */
  credit: string;
  /** For example "Public domain" or "CC BY-SA 4.0". */
  license: string;
  /** Page where the licence can be checked. */
  sourceUrl: string;
}

export const MEMORIAL_PHOTO: MemorialPhoto | null = {
  src: "/memorial/laika.jpg",
  alt: "Black-and-white photograph of Laika, the real space dog, wearing her flight harness in 1957.",
  credit: "Historical photograph of Laika, 1957 (Soviet Union), supplied by the project team",
  license: "Used with the team's approval; original photographer and licence not recorded",
  sourceUrl: "supplied by the project team",
};

export const MEMORIAL_TEXT = "In Loving Memory of Laika";
/** Timeline of the opening, in milliseconds. */
export const OPENING = { fadeIn: 300, memorialEnd: 2000, fadeOut: 300, rocketLands: 3000, menuReady: 3500 } as const;
