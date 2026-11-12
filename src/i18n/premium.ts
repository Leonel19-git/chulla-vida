import type { Language } from '../types';
import { translate } from './ui';

// Kichwa interface wording is a working draft, pending review by speakers of each variety.
// Prices, dates, proper names and the brand keep their original values.
const rows = `
Planes y suscripción|Plans & subscription|Offres et abonnement|Planos e assinatura|套餐与订阅|Akllaykuna, killapash|Akllaykuna, killapash
Mi pasaporte|My passport|Mon passeport|Meu passaporte|我的护照|Ñukapa purina killka|Ñukapa purina killka
Acceso con suscripción|Subscription access|Accès par abonnement|Acesso com assinatura|订阅访问|Akllaywan yaykuy|Akllaywan yaykuy
Planes CHULLA VIDA|CHULLA VIDA plans|Offres CHULLA VIDA|Planos CHULLA VIDA|CHULLA VIDA 套餐|CHULLA VIDA akllaykuna|CHULLA VIDA akllaykuna
Viaja a tu ritmo.|Travel at your pace.|Voyagez à votre rythme.|Viaje no seu ritmo.|按自己的节奏旅行。|Kikin munashka puriy.|Kikin munashka puriy.
Un plan, más caminos.|One plan, more paths.|Une offre, plus de chemins.|Um plano, mais caminhos.|一个套餐，更多旅途。|Shuk akllay, ashtawan ñankuna.|Shuk akllay, ashtawan ñankuna.
Semanal|Weekly|Hebdomadaire|Semanal|周套餐|Sapa kanchis puncha|Sapa kanchis puncha
Mensual|Monthly|Mensuelle|Mensal|月套餐|Sapa killa|Sapa killa
Anual|Annual|Annuelle|Anual|年套餐|Sapa wata|Sapa wata
7 días|7 days|7 jours|7 dias|7天|7 puncha|7 puncha
1 mes|1 month|1 mois|1 mês|1个月|1 killa|1 killa
1 año|1 year|1 an|1 ano|1年|1 wata|1 wata
Ruta sin internet|Offline route|Itinéraire hors ligne|Rota sem internet|离线路线|Internet illak ñan|Internet illak ñan
Comunidad wambra|Wambra community|Communauté wambra|Comunidade wambra|Wambra 社区|Wambrakunapa ayllu|Wambrakunapa ayllu
Pasaporte básico|Basic passport|Passeport de base|Passaporte básico|基础旅行护照|Kallari purina killka|Kallari purina killka
Pasaporte premium|Premium passport|Passeport premium|Passaporte premium|高级旅行护照|Premium purina killka|Premium purina killka
Solo en el plan anual|Annual plan only|Offre annuelle uniquement|Só no plano anual|仅限年套餐|Wata akllayllapi|Wata akllayllapi
Incluido en todos los planes|Included in every plan|Inclus dans chaque offre|Incluído em todos os planos|所有套餐均包含|Tukuy akllaykunapi|Tukuy akllaykunapi
Activar plan de prueba|Activate demo plan|Activer l’offre de démonstration|Ativar plano de demonstração|启用演示套餐|Pruebapak akllayta kichay|Pruebapak akllayta paskay
Plan actual|Current plan|Offre actuelle|Plano atual|当前套餐|Kunan akllay|Kunan akllay
Plan activado en este navegador.|Plan activated in this browser.|Offre activée dans ce navigateur.|Plano ativado neste navegador.|套餐已在此浏览器启用。|Kay navegadorpi akllay kicharishka.|Kay navegadorpi akllay paskarishka.
Acceso hasta|Access until|Accès jusqu’au|Acesso até|有效期至|Kay punchakama|Kay punchakama
Próxima renovación simulada|Next simulated renewal|Prochain renouvellement simulé|Próxima renovação simulada|下次模拟续订|Shamuk pruebapak mushukyachiy|Shamuk pruebapak mushukyachiy
Sin renovación|No renewal|Sans renouvellement|Sem renovação|不续订|Mushukyachiy illak|Mushukyachiy illak
Cancelar renovación de prueba|Cancel demo renewal|Annuler le renouvellement de démonstration|Cancelar renovação de demonstração|取消演示续订|Pruebapak mushukyachiyta sakiy|Pruebapak mushukyachiyta sakiy
Renovación cancelada. Conservas el acceso hasta su vencimiento.|Renewal cancelled. Access stays active until expiry.|Renouvellement annulé. Votre accès reste actif jusqu’à l’échéance.|Renovação cancelada. O acesso permanece até o vencimento.|续订已取消，访问权限保留至到期日。|Mushukyachiy sakirishka. Kay punchakama yaykuy ushanki.|Mushukyachiy sakirishka. Kay punchakama yaykuy ushanki.
Demostración local: sin cobros ni renovación automática. Al cambiar de plan, el nuevo periodo empieza hoy.|Local demo: no charges or automatic renewal. Switching plans starts a new period today.|Démonstration locale : aucun débit ni renouvellement automatique. Un changement d’offre démarre une nouvelle période aujourd’hui.|Demonstração local: sem cobranças ou renovação automática. A troca de plano inicia um novo período hoje.|本地演示：不会扣款或自动续订。切换套餐后，新周期从今天开始。|Kaypi prueba: mana kullkita llukshichinchu, mana kikillan mushukyachinchu. Akllayta tikrachikpi, kunan puncha kallarinka.|Kaypi prueba: mana kullkita llukshichinchu, mana kikillan mushukyachinchu. Akllayta tikrachikpi, kunan puncha kallarinka.
No se pudo guardar. Tu plan estará disponible solo durante esta sesión.|Could not save. Your plan is available for this session only.|Enregistrement impossible. Votre offre reste disponible pour cette session uniquement.|Não foi possível salvar. Seu plano está disponível apenas nesta sessão.|无法保存，套餐仅在本次会话可用。|Mana wakaychiy tukurinchu. Kay yaykuypillami akllay tiyan.|Mana wakaychiy tukurinchu. Kay yaykuypillami akllay tiyan.
Tu pasaporte de Ecuador|Your Ecuador passport|Votre passeport de l’Équateur|Seu passaporte do Equador|你的厄瓜多尔旅行护照|Ecuador purina killkayki|Ecuador purina killkayki
El país se llena de historias.|A country full of stories.|Un pays rempli d’histoires.|Um país cheio de histórias.|让旅程留下故事。|Mamallaktapi willaykuna huntarin.|Mamallaktapi willaykuna huntarin.
Visitas verificadas|Verified visits|Visites vérifiées|Visitas verificadas|已验证到访|Chiqap rikushka puriykuna|Chiqap rikushka puriykuna
Sellos de prueba|Demo stamps|Tampons de démonstration|Carimbos de demonstração|演示印章|Pruebapak unancha|Pruebapak unancha
Un sello por cada lugar visitado.|One stamp for every place visited.|Un tampon par lieu visité.|Um carimbo por lugar visitado.|每到访一处，收集一枚印章。|Sapa purishka kitipi shuk unancha.|Sapa purishka kitipi shuk unancha.
Los sellos verificados aparecen al validar tu visita con el negocio.|Verified stamps appear when the host validates your visit.|Les tampons vérifiés apparaissent lorsque l’hôte valide votre visite.|Os carimbos verificados aparecem quando o anfitrião valida sua visita.|商家验证到访后，将显示已验证印章。|Negocio kikinpa puriyta chiqap rikukpi, chiqap unanchakuna rikurin.|Negocio kikinpa puriyta chiqap rikukpi, chiqap unanchakuna rikurin.
Verificado|Verified|Vérifié|Verificado|已验证|Chiqap rikushka|Chiqap rikushka
Sello de prueba|Demo stamp|Tampon de démonstration|Carimbo de demonstração|演示印章|Pruebapak unancha|Pruebapak unancha
Por descubrir|To discover|À découvrir|Para descobrir|待探索|Riksinapak|Riksinapak
Tu próxima historia empieza aquí.|Your next story starts here.|Votre prochaine histoire commence ici.|Sua próxima história começa aqui.|下一个故事从这里开始。|Kikinpa shamuk willay kaypi kallarin.|Kikinpa shamuk willay kaypi kallarin.
Probar sello|Try a stamp|Essayer un tampon|Experimentar carimbo|体验盖章|Unanchata malliy|Unanchata malliy
Elegir destino|Choose destination|Choisir un lieu|Escolher destino|选择目的地|Purina kitita akllay|Purina kitita akllay
La prueba no acredita una visita real ni entrega premios.|The demo does not verify a real visit or award prizes.|La démonstration ne valide pas une visite réelle et ne donne pas de récompenses.|A demonstração não valida uma visita real nem concede prêmios.|演示不代表真实到访，也不提供奖励。|Prueba mana chiqap puriyta rikuchinchu, mana karaykunata kunchu.|Prueba mana chiqap puriyta rikuchinchu, mana karaykunata kunchu.
Colección regional premium|Premium regional collection|Collection régionale premium|Coleção regional premium|高级区域印章集|Premium suyukunapa tantachiy|Premium suyukunapa tantachiy
Cuatro regiones. Tu propia colección.|Four regions. Your own collection.|Quatre régions. Votre propre collection.|Quatro regiões. Sua própria coleção.|四大区域，专属收藏。|Chusku suyukuna. Kikinpa tantachiy.|Chusku suyukuna. Kikinpa tantachiy.
Con el plan anual, abre tu pasaporte premium y la colección por regiones.|Unlock your premium passport and regional collection with the annual plan.|L’offre annuelle ouvre votre passeport premium et votre collection par région.|O plano anual libera seu passaporte premium e sua coleção por regiões.|订阅年套餐，解锁高级护照与区域收藏。|Wata akllaywan premium purina killkata, suyukunapa tantachiytapas kichay.|Wata akllaywan premium purina killkata, suyukunapa tantachiytapas paskay.
Ver planes|View plans|Voir les offres|Ver planos|查看套餐|Akllaykunata rikuy|Akllaykunata rikuy
Todos los viajeros tienen pasaporte básico. El premium es exclusivo del plan anual.|Every traveler has a basic passport. Premium is exclusive to the annual plan.|Chaque voyageur a un passeport de base. Le premium est réservé à l’offre annuelle.|Todo viajante tem passaporte básico. O premium é exclusivo do plano anual.|所有旅行者均有基础护照，高级护照仅限年套餐。|Tukuy purikkunapak kallari purina killka tiyan. Premium wata akllayllapakmi.|Tukuy purikkunapak kallari purina killka tiyan. Premium wata akllayllapakmi.
Elige un plan para abrir esta función.|Choose a plan to unlock this feature.|Choisissez une offre pour ouvrir cette fonction.|Escolha um plano para liberar esta função.|选择套餐以解锁此功能。|Kay rurayta kichanapak shuk akllayta akllay.|Kay rurayta paskanapak shuk akllayta akllay.
Traducción Kichwa de trabajo, pendiente de revisión comunitaria.|Draft Kichwa translation, awaiting community review.|Traduction kichwa provisoire, en attente de relecture communautaire.|Tradução kichwa provisória, aguardando revisão comunitária.|奇楚瓦语为草稿，待社区审核。|Kichwa tikrachiy rurakushka, ayllupa rikuyta shuyakushka.|Kichwa tikrachiy rurakushka, ayllupa rikuyta shuyakushka.
Sello añadido a tu colección de prueba.|Stamp added to your demo collection.|Tampon ajouté à votre collection de démonstration.|Carimbo adicionado à sua coleção de demonstração.|印章已加入演示收藏。|Pruebapak tantachiypi unancha churashka.|Pruebapak tantachiypi unancha churashka.
Tu plan ha vencido.|Your plan has expired.|Votre offre a expiré.|Seu plano expirou.|套餐已到期。|Kikinpa akllay tukurishka.|Kikinpa akllay tukurishka.
Historial de prueba|Demo history|Historique de démonstration|Histórico de demonstração|演示记录|Pruebapak yuyaykuna|Pruebapak yuyaykuna
Sierra|Highlands|Andes|Serra|安第斯山区|Puna suyu|Puna suyu
Costa|Coast|Côte|Litoral|海岸|Mama kucha suyu|Mama kucha suyu
Amazonía|Amazon|Amazonie|Amazônia|亚马孙地区|Amazonía|Sacha suyu
Galápagos|Galápagos|Galápagos|Galápagos|加拉帕戈斯|Galápagos|Galápagos
`;
const languages: Language[] = ['en', 'fr', 'pt', 'zh', 'ki', 'ki-amz'];
export const premiumTranslations: Record<string, Partial<Record<Language, string>>> = Object.fromEntries(rows.trim().split('\n').map(line => { const [source, ...values] = line.split('|'); return [source, Object.fromEntries(languages.map((language, index) => [language, values[index]]))]; }));
export function translatePremium(language: Language, source: string, variables?: Record<string, string | number>): string {
  const unified = language === 'ki' || language === 'ki-amz' ? translate(language, source) : source;
  let output = language === 'es' ? source : unified !== source ? unified : premiumTranslations[source]?.[language] || translate(language, source);
  if (variables) for (const [key, value] of Object.entries(variables)) output = output.replaceAll(`{${key}}`, String(value));
  return output;
}
export const membershipLocale: Record<Language, string> = { es: 'es-EC', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR', zh: 'zh-CN', ki: 'es-EC', 'ki-amz': 'es-EC' };
