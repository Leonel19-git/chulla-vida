import references from './reference-photos.json';
import type { ExperienceMedia } from '../types';
/** Contexto regional autorizado: nunca se presenta como fotografía del sitio anunciado. */
const REFERENCES: Record<string,string> = references;
export function referenceMedia(id:string, photos:Readonly<Record<string,ExperienceMedia>>):ExperienceMedia[] {
  const source=photos[REFERENCES[id]];
  return source ? [{...source,depictsThisPlace:false,referencePhoto:true,alt:`Foto de referencia regional; no muestra este sitio. ${source.alt}`}]:[];
}
