import type {RegionId} from '../../domain/catalog';
import {msg} from '../../i18n/v3';
export const REGION_FILMS: Record<RegionId, {title:string;src:string;poster:string;alt:string;ids:string[]}> = {
  sierra: {title:msg('Arriba se ve distinto.'),src:'/video/regions/sierra.mp4',poster:'/images/places/gen-02-quilotoa-shalala-640.webp',alt:'Laguna del Quilotoa, en Cotopaxi.',ids:['gen-02-quilotoa-shalala','gen-09-parque-nacional-cotopaxi','gen-07-banos-de-agua-santa']},
  costa: {title:msg('Un ratito junto al mar.'),src:'/video/regions/costa.mp4',poster:'/images/places/costa-07-ola-y-manglar-640.webp',alt:'Playa de Mompiche, en Esmeraldas.',ids:['costa-07-ola-y-manglar','costa-03-pacifico-activo','costa-01-raices-de-manabi']},
  amazonia: {title:msg('Bájale al ruido.'),src:'/video/regions/amazonia.mp4',poster:'/images/places/amz-01-reserva-cuyabeno-640.webp',alt:'Laguna Grande de Cuyabeno, en Sucumbíos.',ids:['amz-01-reserva-cuyabeno','amz-10-laguna-anango','amz-12-cascada-hola-vida']},
  galapagos: {title:msg('Otro mundo, aquí mismo.'),src:'/video/regions/galapagos.mp4',poster:'/images/places/gal-01-bartolome-bahia-sullivan-640.webp',alt:'Isla Bartolomé, en Galápagos.',ids:['gal-01-bartolome-bahia-sullivan','gal-04-kicker-rock-tour-360','gal-08-tintoreras-concha-perla']},
};
