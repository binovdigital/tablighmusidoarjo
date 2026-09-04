import { sanityClient } from "sanity:client";
import { defineQuery } from "groq";

export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_id == "siteSettings"][0]{
    _id,
    siteTitle,
    siteDescription,
    logo,
    footerText,
    favicon
  }
`);

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    author->{
      _id,
      name,
      slug,
      image
    },
    categories[]->{title, slug}
  }
`);

export const POSTS_BY_CATEGORY_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && $categorySlug in categories[]->slug.current] | order(publishedAt desc){
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    author->{
      _id,
      name,
      slug,
      image
    },
    categories[]->{title, slug}
  }
`);

export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category" && defined(slug.current)] | order(title asc){
    _id,
    title,
    slug,
    description
  }
`);

export const CATEGORY_SLUGS_QUERY = defineQuery(`
  *[_type == "category" && defined(slug.current)]{
    "params": { "slug": slug.current }
  }
`);

export const CATEGORY_QUERY_BY_SLUG = defineQuery(`
  *[_type == "category" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    description
  }
`);

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    body,
    author->{
      _id,
      name,
      slug,
      image,
      bio
    }
  }
`);

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)]{
    "params": { "slug": slug.current }
  }
`);

export const LECTURES_QUERY = defineQuery(`
  *[_type in ["lecture", "kajian"]] | order(date asc){
    _id,
    title,
    slug,
    coverImage,
    date,
    time,
    "location": select(
      defined(location.customName) || defined(location.mosqueRef) || defined(location.isCustom) || defined(location._ref) => {
        "isCustom": coalesce(location.isCustom, false),
        "name": coalesce(location.customName, location.mosqueRef->name, location->name),
        "address": coalesce(location.mosqueRef->address, location->address),
        "googleMapsUrl": coalesce(location.mosqueRef->googleMapsUrl, location->googleMapsUrl)
      },
      {
        "isCustom": true,
        "name": location
      }
    ),
    "speaker": select(
      defined(speaker.customName) || defined(speaker.scholarRef) || defined(speaker.isCustom) || defined(speaker._ref) => {
        "isCustom": coalesce(speaker.isCustom, false),
        "name": coalesce(speaker.customName, speaker.scholarRef->name, speaker->name),
        "image": speaker.scholarRef->image,
        "slug": speaker.scholarRef->slug.current
      },
      {
        "isCustom": true,
        "name": speaker
      }
    ),
    "muslimahOnly": coalesce(muslimahOnly, khususMuslimah),
    description
  }
`);

export const LECTURE_SLUGS_QUERY = defineQuery(`
  *[_type in ["lecture", "kajian"] && defined(slug.current)]{
    "params": { "slug": slug.current }
  }
`);

export const LECTURE_QUERY_BY_SLUG = defineQuery(`
  *[_type in ["lecture", "kajian"] && slug.current == $slug][0]{
    _id,
    title,
    slug,
    coverImage,
    date,
    time,
    "location": select(
      defined(location.customName) || defined(location.mosqueRef) || defined(location.isCustom) || defined(location._ref) => {
        "isCustom": coalesce(location.isCustom, false),
        "name": coalesce(location.customName, location.mosqueRef->name, location->name),
        "address": coalesce(location.mosqueRef->address, location->address),
        "googleMapsUrl": coalesce(location.mosqueRef->googleMapsUrl, location->googleMapsUrl)
      },
      {
        "isCustom": true,
        "name": location
      }
    ),
    "speaker": select(
      defined(speaker.customName) || defined(speaker.scholarRef) || defined(speaker.isCustom) || defined(speaker._ref) => {
        "isCustom": coalesce(speaker.isCustom, false),
        "name": coalesce(speaker.customName, speaker.scholarRef->name, speaker->name),
        "image": speaker.scholarRef->image,
        "slug": speaker.scholarRef->slug.current
      },
      {
        "isCustom": true,
        "name": speaker
      }
    ),
    "muslimahOnly": coalesce(muslimahOnly, khususMuslimah),
    description
  }
`);

export const MOSQUES_QUERY = defineQuery(`
  *[_type in ["mosque", "masjid"] && defined(slug.current)] | order(name asc){
    _id,
    name,
    slug,
    image,
    address,
    googleMapsUrl,
    facilities
  }
`);

export const MOSQUE_SLUGS_QUERY = defineQuery(`
  *[_type in ["mosque", "masjid"] && defined(slug.current)]{
    "params": { "slug": slug.current }
  }
`);

export const MOSQUE_QUERY_BY_SLUG = defineQuery(`
  *[_type in ["mosque", "masjid"] && slug.current == $slug][0]{
    _id,
    name,
    slug,
    image,
    address,
    googleMapsUrl,
    facilities,
    "lectures": *[_type in ["lecture", "kajian"] && (location.mosqueRef._ref == ^._id || location._ref == ^._id)] | order(date desc){
      _id,
      title,
      slug,
      coverImage,
      date,
      time,
      "muslimahOnly": coalesce(muslimahOnly, khususMuslimah),
      "location": select(
        defined(location.customName) || defined(location.mosqueRef) || defined(location.isCustom) || defined(location._ref) => {
          "isCustom": coalesce(location.isCustom, false),
          "name": coalesce(location.customName, location.mosqueRef->name, location->name)
        },
        {
          "isCustom": true,
          "name": location
        }
      ),
      "speaker": select(
        defined(speaker.customName) || defined(speaker.scholarRef) || defined(speaker.isCustom) || defined(speaker._ref) => {
          "isCustom": coalesce(speaker.isCustom, false),
          "name": coalesce(speaker.customName, speaker.scholarRef->name, speaker->name)
        },
        {
          "isCustom": true,
          "name": speaker
        }
      )
    }
  }
`);

export const SCHOLARS_QUERY = defineQuery(`
  *[_type in ["scholar", "muballigh"] && defined(slug.current)] | order(name asc){
    _id,
    name,
    slug,
    image,
    bio,
    contact
  }
`);

export const SCHOLAR_SLUGS_QUERY = defineQuery(`
  *[_type in ["scholar", "muballigh"] && defined(slug.current)]{
    "params": { "slug": slug.current }
  }
`);

export const SCHOLAR_QUERY_BY_SLUG = defineQuery(`
  *[_type in ["scholar", "muballigh"] && slug.current == $slug][0]{
    _id,
    name,
    slug,
    image,
    bio,
    contact,
    "lectures": *[_type in ["lecture", "kajian"] && (speaker.scholarRef._ref == ^._id || speaker._ref == ^._id)] | order(date desc){
      _id,
      title,
      slug,
      coverImage,
      date,
      time,
      "muslimahOnly": coalesce(muslimahOnly, khususMuslimah),
      "location": select(
        defined(location.customName) || defined(location.mosqueRef) || defined(location.isCustom) || defined(location._ref) => {
          "isCustom": coalesce(location.isCustom, false),
          "name": coalesce(location.customName, location.mosqueRef->name, location->name)
        },
        {
          "isCustom": true,
          "name": location
        }
      ),
      "speaker": select(
        defined(speaker.customName) || defined(speaker.scholarRef) || defined(speaker.isCustom) || defined(speaker._ref) => {
          "isCustom": coalesce(speaker.isCustom, false),
          "name": coalesce(speaker.customName, speaker.scholarRef->name, speaker->name)
        },
        {
          "isCustom": true,
          "name": speaker
        }
      )
    }
  }
`);

export interface LectureSpeaker {
  isCustom?: boolean;
  name?: string | null;
  image?: any;
  slug?: string | null;
}

export interface LectureLocation {
  isCustom?: boolean;
  name?: string | null;
  address?: string | null;
  googleMapsUrl?: string | null;
}

export interface Lecture {
  _id: string;
  title: string;
  slug: { current: string };
  coverImage?: any;
  date: string;
  time: string;
  location?: LectureLocation | string | null;
  speaker?: LectureSpeaker | string | null;
  muslimahOnly?: boolean;
  description?: any;
}

export interface Mosque {
  _id: string;
  name: string;
  slug: { current: string };
  image?: any;
  address?: string;
  googleMapsUrl?: string;
  facilities?: string[];
  lectures?: Lecture[];
}

export interface Scholar {
  _id: string;
  name: string;
  slug: { current: string };
  image?: any;
  bio?: string;
  contact?: string;
  lectures?: Lecture[];
}

export const VIDEO_LECTURES_QUERY = defineQuery(`
  *[_type in ["videoLecture", "videoKajian"] && defined(youtubeUrl)] | order(publishedAt desc){
    _id,
    title,
    youtubeUrl,
    publishedAt
  }
`);

export interface VideoLecture {
  _id: string;
  title: string;
  youtubeUrl: string;
  publishedAt: string;
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
}

export const SPONSORS_QUERY = defineQuery(`
  *[_type == "sponsor"] | order(_createdAt asc){
    name,
    "logoUrl": logo.asset->url,
    url
  }
`);

export interface Sponsor {
  name: string;
  logoUrl?: string | null;
  url?: string | null;
}

export async function getSiteSettings() {
  return await sanityClient.fetch(SITE_SETTINGS_QUERY);
}

export async function getPosts() {
  return await sanityClient.fetch(POSTS_QUERY);
}

export async function getPost(slug: string) {
  return await sanityClient.fetch(POST_QUERY, { slug });
}

export async function getPostSlugs() {
  return await sanityClient.fetch(POST_SLUGS_QUERY);
}

export async function getLectures(): Promise<Lecture[]> {
  return await sanityClient.fetch(LECTURES_QUERY);
}

export async function getLectureSlugs() {
  return await sanityClient.fetch(LECTURE_SLUGS_QUERY);
}

export async function getLectureBySlug(slug: string): Promise<Lecture | null> {
  return await sanityClient.fetch(LECTURE_QUERY_BY_SLUG, { slug });
}

export async function getMosques(): Promise<Mosque[]> {
  return await sanityClient.fetch(MOSQUES_QUERY);
}

export async function getMosqueSlugs() {
  return await sanityClient.fetch(MOSQUE_SLUGS_QUERY);
}

export async function getMosqueBySlug(slug: string): Promise<Mosque | null> {
  return await sanityClient.fetch(MOSQUE_QUERY_BY_SLUG, { slug });
}

export async function getScholars(): Promise<Scholar[]> {
  return await sanityClient.fetch(SCHOLARS_QUERY);
}

export async function getScholarSlugs() {
  return await sanityClient.fetch(SCHOLAR_SLUGS_QUERY);
}

export async function getScholarBySlug(slug: string): Promise<Scholar | null> {
  return await sanityClient.fetch(SCHOLAR_QUERY_BY_SLUG, { slug });
}

export async function getVideoLectures(): Promise<VideoLecture[]> {
  return await sanityClient.fetch(VIDEO_LECTURES_QUERY);
}

export const EXPERTISES_QUERY = defineQuery(`
  *[_type == "expertise"] | order(name asc){
    name,
    description,
    "scholars": *[_type in ["scholar", "muballigh"] && references(^._id)]{
      name,
      "photoUrl": image.asset->url,
      instansi,
      slug
    }
  }
`);

export interface ExpertiseScholar {
  name: string;
  photoUrl?: string | null;
  instansi?: string | null;
  slug?: { current: string };
}

export interface Expertise {
  name: string;
  description?: string;
  scholars?: ExpertiseScholar[];
}

export async function getExpertises(): Promise<Expertise[]> {
  return await sanityClient.fetch(EXPERTISES_QUERY);
}

export async function getCategories(): Promise<Category[]> {
  return await sanityClient.fetch(CATEGORIES_QUERY);
}

export async function getCategorySlugs() {
  return await sanityClient.fetch(CATEGORY_SLUGS_QUERY);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return await sanityClient.fetch(CATEGORY_QUERY_BY_SLUG, { slug });
}

export async function getPostsByCategory(categorySlug: string) {
  return await sanityClient.fetch(POSTS_BY_CATEGORY_QUERY, { categorySlug });
}

export async function getSponsors(): Promise<Sponsor[]> {
  return await sanityClient.fetch(SPONSORS_QUERY);
}