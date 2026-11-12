import type { Language } from '../types';
import { translate } from './ui';

// Route controls and downloadable-file copy. Kichwa keeps the reviewed shared
// vocabulary and Spanish fallback; regional dialects are not machine-invented.
const rows = [
  ['Recorrer mi ruta', 'Play my route', 'Parcourir mon itinéraire', 'Percorrer minha rota', '播放路线'],
  ['Pausar recorrido', 'Pause route', 'Mettre en pause', 'Pausar percurso', '暂停路线'],
  ['Parada {number} de {count}', 'Stop {number} of {count}', 'Étape {number} sur {count}', 'Parada {number} de {count}', '第 {number} 站，共 {count} 站'],
  ['Tu ruta va contigo', 'Your route goes with you', 'Votre itinéraire vous suit', 'Sua rota vai com você', '路线随你同行'],
  ['Con conexión', 'Online', 'En ligne', 'Conectado', '已联网'],
  ['Sin conexión', 'Offline', 'Hors connexion', 'Sem conexão', '离线'],
  ['Vista sin conexión', 'Offline preview', 'Aperçu hors connexion', 'Prévia sem conexão', '离线预览'],
  ['Sin señal. Con plan.', 'No signal. Still a plan.', 'Sans réseau. Avec un plan.', 'Sem sinal. Com plano.', '没信号，也有计划。'],
  ['Arma el plan. Guarda la ruta.', 'Make a plan. Keep the route.', 'Préparez. Enregistrez. Partez.', 'Planeje. Salve. Vá.', '规划行程，保存路线。'],
  ['Así se verá tu ruta cuando se vaya la señal.', 'This is how your route looks without a signal.', 'Voici votre itinéraire sans réseau.', 'Sua rota fica assim sem sinal.', '这是没有信号时的路线。'],
  ['Tu ruta guardada sigue aquí, pana.', 'Your saved route is still here, friend.', 'Votre itinéraire enregistré est toujours là.', 'Sua rota salva continua aqui, amigo.', '保存的路线还在，朋友。'],
  ['Aún no guardaste una ruta. Puedes llevarte esta propuesta.', 'No saved route yet. Take this suggestion with you.', 'Aucun itinéraire enregistré. Emportez cette proposition.', 'Ainda não há rota salva. Leve esta sugestão.', '还没有保存路线，可以带上这个方案。'],
  ['Tus paradas, gastos y datos clave, a la mano.', 'Your stops, costs and essentials, close at hand.', 'Étapes, dépenses et infos à portée de main.', 'Paradas, gastos e informações na mão.', '站点、费用和实用信息，随时查看。'],
  ['Punto de partida', 'Starting point', 'Point de départ', 'Ponto de partida', '出发点'],
  ['Salida', 'Start', 'Départ', 'Saída', '出发'],
  ['día', 'day', 'jour', 'dia', '天'],
  ['días', 'days', 'jours', 'dias', '天'],
  ['Día {day}', 'Day {day}', 'Jour {day}', 'Dia {day}', '第{day}天'],
  ['Días {from}–{to}', 'Days {from}–{to}', 'Jours {from}–{to}', 'Dias {from}–{to}', '第{from}–{to}天'],
  ['Sierra', 'Andes', 'Andes', 'Andes', '安第斯山区'],
  ['Costa', 'Coast', 'Côte', 'Costa', '海岸'],
  ['Amazonía', 'Amazon', 'Amazonie', 'Amazônia', '亚马逊'],
  ['Galápagos', 'Galápagos', 'Galápagos', 'Galápagos', '加拉帕戈斯'],
  ['Cumbres y terrazas', 'Peaks and terraces', 'Sommets et terrasses', 'Picos e terraços', '山峰与梯田'],
  ['Olas y arena', 'Waves and sand', 'Vagues et sable', 'Ondas e areia', '海浪与沙滩'],
  ['Río y selva', 'River and rainforest', 'Rivière et forêt', 'Rio e floresta', '河流与雨林'],
  ['Islas y lava', 'Islands and lava', 'Îles et lave', 'Ilhas e lava', '岛屿与熔岩'],
  ['Paisaje de la parada seleccionada', 'Landscape of the selected stop', 'Paysage de l’étape choisie', 'Paisagem da parada selecionada', '所选站点的景观'],
  ['Tu ruta por regiones', 'Your route by region', 'Votre itinéraire par région', 'Sua rota por região', '路线经过的区域'],
  ['Esquema de ruta · sin navegación GPS', 'Route diagram · no GPS navigation', 'Schéma d’itinéraire · sans navigation GPS', 'Esquema de rota · sem navegação GPS', '路线示意图 · 非GPS导航'],
  ['Toca una parada', 'Tap a stop', 'Touchez une étape', 'Toque em uma parada', '点击站点'],
  ['Paradas de la ruta', 'Route stops', 'Étapes de l’itinéraire', 'Paradas da rota', '路线站点'],
  ['Parada {number}: {title}', 'Stop {number}: {title}', 'Étape {number} : {title}', 'Parada {number}: {title}', '第{number}站：{title}'],
  ['Ruta esquemática desde {origin}', 'Route diagram from {origin}', 'Schéma d’itinéraire depuis {origin}', 'Esquema de rota desde {origin}', '从{origin}出发的路线示意图'],
  ['el grupo', 'the group', 'le groupe', 'o grupo', '全组'],
  ['por persona', 'per person', 'par personne', 'por pessoa', '每人'],
  ['Qué incluye', 'What is included', 'Ce qui est inclus', 'O que inclui', '包含内容'],
  ['Gastos aparte', 'Extra costs', 'Frais supplémentaires', 'Gastos extras', '额外费用'],
  ['Ve pilas', 'Come prepared', 'Partez bien préparé', 'Vá preparado', '出行准备'],
  ['Ver ficha completa', 'View full details', 'Voir la fiche complète', 'Ver ficha completa', '查看详情'],
  ['Experiencias', 'Experiences', 'Expériences', 'Experiências', '体验项目'],
  ['Te queda para extras', 'Left for extras', 'Reste pour les extras', 'Sobra para extras', '额外开支余额'],
  ['Guardada', 'Saved', 'Enregistré', 'Salva', '已保存'],
  ['Propuesta sin guardar', 'Unsaved suggestion', 'Proposition non enregistrée', 'Sugestão não salva', '尚未保存'],
  ['Actualizar ruta', 'Refresh route', 'Actualiser l’itinéraire', 'Atualizar rota', '更新路线'],
  ['Volver a guardar', 'Save again', 'Enregistrer à nouveau', 'Salvar novamente', '再次保存'],
  ['Guardar para el camino', 'Save for the trip', 'Enregistrer pour le voyage', 'Salvar para a viagem', '保存以备出行'],
  ['Descargar ruta offline', 'Download offline route', 'Télécharger hors connexion', 'Baixar rota offline', '下载离线路线'],
  ['¡De una! Ruta guardada en este navegador.', 'All set! Route saved in this browser.', 'C’est prêt ! Itinéraire enregistré dans ce navigateur.', 'Pronto! Rota salva neste navegador.', '准备好了！路线已保存在此浏览器中。'],
  ['No se pudo guardar aquí. Descarga el archivo para llevarlo.', 'Could not save here. Download the file to take it with you.', 'Enregistrement impossible. Téléchargez le fichier.', 'Não foi possível salvar. Baixe o arquivo para levar.', '无法在此保存，请下载文件。'],
  ['Archivo listo. Ábrelo desde Descargas para ver tu ruta sin internet.', 'File ready. Open it from Downloads to see your route offline.', 'Fichier prêt. Ouvrez-le depuis Téléchargements sans internet.', 'Arquivo pronto. Abra em Downloads para ver a rota sem internet.', '文件已准备好。从下载文件夹打开即可离线查看。'],
  ['No se pudo preparar el archivo. Actualiza tu ruta e inténtalo otra vez.', 'Could not prepare the file. Refresh your route and try again.', 'Fichier non préparé. Actualisez l’itinéraire et réessayez.', 'Não foi possível preparar. Atualize a rota e tente de novo.', '无法准备文件，请更新路线后重试。'],
  ['Ruta actualizada con tus gustos. Guárdala para llevarla.', 'Route updated to your preferences. Save it for the trip.', 'Itinéraire actualisé. Enregistrez-le pour partir.', 'Rota atualizada. Salve para levar.', '路线已按偏好更新，请保存以备出行。'],
  ['Hagamos espacio para el paseo', 'Make room for a getaway', 'Faites place à l’escapade', 'Abra espaço para o passeio', '为旅程腾出空间'],
  ['Amplía tus días, región o presupuesto para encontrar paradas.', 'Expand your days, region or budget to find stops.', 'Élargissez les jours, la région ou le budget.', 'Amplie os dias, a região ou o orçamento.', '增加天数、区域或预算以寻找站点。'],
  ['Ajustar mi plan', 'Adjust my plan', 'Adapter mon projet', 'Ajustar meu plano', '调整计划'],
  ['¿Qué llevo sin internet?', 'What works offline?', 'Que garde-t-on sans internet ?', 'O que funciona sem internet?', '离线可以查看什么？'],
  ['El archivo descargado abre sin red: esquema, paradas, precios y recomendaciones.', 'The downloaded file opens offline: diagram, stops, prices and tips.', 'Le fichier s’ouvre sans réseau : schéma, étapes, prix et conseils.', 'O arquivo abre sem rede: esquema, paradas, preços e dicas.', '下载的文件可以离线打开：示意图、站点、价格和建议。'],
  ['Guardar conserva esta ruta en este navegador; para abrir la app web por primera vez necesitas conexión.', 'Saving keeps this route in this browser; the web app needs a connection to open for the first time.', 'L’enregistrement conserve l’itinéraire ici ; la première ouverture de l’app exige une connexion.', 'Salvar mantém a rota neste navegador; a primeira abertura da app exige conexão.', '保存会将路线留在此浏览器中；首次打开网页应用需要联网。'],
  ['Spotify, carreteras y datos en vivo necesitan señal.', 'Spotify, road directions and live data need a signal.', 'Spotify, les routes et les données en direct exigent du réseau.', 'Spotify, navegação e dados ao vivo precisam de sinal.', 'Spotify、道路导航和实时数据需要信号。'],
  ['Ruta orientativa: confirma traslados, acceso y disponibilidad antes de salir. No calcula distancias ni tiempos por carretera.', 'Suggested route: confirm transport, access and availability before leaving. Road distances and travel times are not calculated.', 'Itinéraire indicatif : confirmez transports, accès et disponibilités. Les distances et durées routières ne sont pas calculées.', 'Rota indicativa: confirme transportes, acesso e disponibilidade. Não calcula distâncias nem tempos rodoviários.', '参考路线：出发前请确认交通、通行和可用情况。不计算公路距离或行车时间。'],
  ['Mi ruta sin conexión', 'My offline route', 'Mon itinéraire hors connexion', 'Minha rota offline', '我的离线路线'],
  ['Tu ruta, aunque se vaya la señal.', 'Your route, even without a signal.', 'Votre itinéraire, même sans réseau.', 'Sua rota, mesmo sem sinal.', '即使没有信号，路线依然在。'],
  ['Archivo disponible sin internet', 'File available offline', 'Fichier disponible hors connexion', 'Arquivo disponível sem internet', '文件可离线使用'],
  ['Desde {origin} · {people} personas · hasta {days} días', 'From {origin} · {people} people · up to {days} days', 'Depuis {origin} · {people} personnes · jusqu’à {days} jours', 'Desde {origin} · {people} pessoas · até {days} dias', '从{origin}出发 · {people}人 · 最多{days}天'],
  ['Presupuesto del grupo', 'Group budget', 'Budget du groupe', 'Orçamento do grupo', '团队预算'],
  ['Contacto anotado', 'Saved contact', 'Contact enregistré', 'Contato salvo', '已保存的联系方式'],
  ['Para traslados y otros gastos', 'For transport and other costs', 'Pour le transport et les autres frais', 'Para transporte e outros gastos', '交通及其他费用余额'],
  ['Guardada el {date}', 'Saved on {date}', 'Enregistré le {date}', 'Salva em {date}', '保存于{date}'],
  ['Los precios son una instantánea y pueden cambiar. Este archivo no confirma reservas ni sirve como comprobante de pago.', 'Prices are a snapshot and may change. This file does not confirm bookings or prove payment.', 'Les prix peuvent changer. Ce fichier ne confirme aucune réservation et ne vaut pas preuve de paiement.', 'Os preços podem mudar. O arquivo não confirma reservas nem comprova pagamentos.', '价格为保存时的快照，可能变化。此文件不确认预订，也不是付款凭证。'],
] as const;

const columns: Record<string, number> = { en: 1, fr: 2, pt: 3, zh: 4 };
const dictionary = new Map<string, readonly string[]>(rows.map(row => [row[0], row]));
export const offlineLocale = (language: Language): string => ({ en: 'en-US', fr: 'fr-FR', pt: 'pt-BR', zh: 'zh-CN', ki: 'es-EC', 'ki-amz': 'es-EC', es: 'es-EC' }[language] || 'es-EC');
export const offlineDocumentLanguage = (language: Language): string => language.startsWith('ki') ? 'qu-EC' : language === 'zh' ? 'zh-CN' : language;
export function translateOffline(language: Language, literal: string, variables: Record<string, string | number> = {}): string {
  const row = dictionary.get(literal);
  const column = columns[language];
  let result = row && column ? row[column] : translate(language, literal);
  for (const [key, value] of Object.entries(variables)) result = result.replaceAll(`{${key}}`, String(value));
  return result;
}
