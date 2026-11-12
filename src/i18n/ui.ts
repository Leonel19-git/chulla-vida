import type { Language } from '../types';
import { hostTranslations } from './host';
import { paymentTranslations } from './payments';
import { translateKichwa } from './kichwa';

export const languageMetadata: Record<Language, { name: string; short: string; tag: string }> = {
  es: { name: 'Español', short: 'ES', tag: 'es-EC' },
  en: { name: 'English', short: 'EN', tag: 'en' },
  fr: { name: 'Français', short: 'FR', tag: 'fr' },
  pt: { name: 'Português', short: 'PT', tag: 'pt' },
  zh: { name: '中文', short: '中文', tag: 'zh-Hans' },
  ki: { name: 'Kichwa · Sierra', short: 'KI · S', tag: 'qu-EC' },
  'ki-amz': { name: 'Kichwa · Amazonía', short: 'KI · A', tag: 'qu-EC' },
};

// Each row is source Spanish, English, French, Portuguese, Simplified Chinese.
// Destination names, cultural names, user content and local catalog prose retain their source.
const rows = `
Ecuador te espera.|Ecuador awaits.|L’Équateur vous attend.|O Equador espera por você.|厄瓜多尔等你来。
Sal a vivirlo.|Go experience it.|Vivez l’aventure.|Vá viver essa experiência.|出发，亲身感受。
Tu próximo plan, con gente de aquí.|Your next adventure, with local people.|Votre prochaine escapade, avec les habitants.|Sua próxima aventura, com gente daqui.|和当地人一起，开启下一次旅行。
Viaja con respeto. Apoya lo local.|Travel respectfully. Support local people.|Voyagez avec respect. Soutenez les acteurs locaux.|Viaje com respeito. Apoie quem é daqui.|尊重当地文化，支持当地社区。
De la Sierra al mar, pasando por el Oriente.|From the Andes to the coast and the Amazon.|Des Andes à la côte et à l’Amazonie.|Dos Andes ao litoral e à Amazônia.|从安第斯山到海岸，再到亚马孙。
Cumbias de la Costa|Coastal cumbias|Cumbias de la côte|Cumbias do litoral|海岸昆比亚音乐
El ritmo del litoral para tu próxima escapada.|Coastal rhythms for your next getaway.|Les rythmes de la côte pour votre prochaine escapade.|Ritmos do litoral para sua próxima viagem.|让海岸的节奏伴你出发。
Sonidos del Oriente para acompañar el camino.|Amazonian sounds for the journey.|Les sons de l’Amazonie pour accompagner le voyage.|Sons da Amazônia para acompanhar o caminho.|让亚马孙的音乐陪伴旅途。
Una playlist compartida para tu viaje por Ecuador.|A shared playlist for your journey through Ecuador.|Une playlist partagée pour votre voyage en Équateur.|Uma playlist compartilhada para sua viagem pelo Equador.|为厄瓜多尔旅程分享的歌单。
Idioma|Language|Langue|Idioma|语言
Saltar al contenido|Skip to content|Aller au contenu|Ir para o conteúdo|跳至内容
Cerrar menú|Close menu|Fermer le menu|Fechar menu|关闭菜单
Menú principal|Main menu|Menu principal|Menu principal|主菜单
Abrir menú|Open menu|Ouvrir le menu|Abrir menu|打开菜单
Para almas viajeras|For travelers|Pour les voyageurs|Para viajantes|为旅行者而设
Para quienes reciben|For hosts|Pour les hôtes|Para anfitriões|为接待者而设
Explorar Ecuador|Explore Ecuador|Explorer l’Équateur|Explorar o Equador|探索厄瓜多尔
Planificar mi viaje|Plan my trip|Planifier mon voyage|Planejar minha viagem|规划旅行
Ruta sin internet|Offline route|Itinéraire hors ligne|Rota sem internet|离线路线
Mis guardados|Saved places|Mes favoris|Meus favoritos|收藏地点
Mis viajes y pagos|Trips & payments|Voyages et paiements|Viagens e pagamentos|旅行与付款
Cultura y Raymis|Culture & Raymis|Culture et Raymis|Cultura e Raymis|文化与 Raymi 节庆
Comunidad wambra|Wambra community|Communauté wambra|Comunidade wambra|Wambra 社区
Mi negocio|My business|Mon activité|Meu negócio|我的商家
Volver a ver la intro|Replay welcome|Revoir l’accueil|Rever introdução|重看欢迎动画
Viajar también|Travel also means|Voyager, c’est aussi|Viajar também é|旅行也意味着
es cuidar.|caring.|prendre soin.|cuidar.|爱护。
Conecta con lo local.|Connect with local life.|Rencontrez la vie locale.|Conecte-se com a vida local.|感受当地生活。
Deja una buena huella.|Leave a positive footprint.|Laissez une trace positive.|Deixe uma marca positiva.|留下美好的足迹。
Preguntas frecuentes|Frequently asked questions|Questions fréquentes|Perguntas frequentes|常见问题
Hecho para descubrir Ecuador|Made to discover Ecuador|Pour découvrir l’Équateur|Para descobrir o Equador|为发现厄瓜多尔而打造
Ecuador, a tu manera|Ecuador, your way|L’Équateur à votre façon|Equador, do seu jeito|用你的方式探索厄瓜多尔
Espacio de negocios|Business space|Espace professionnel|Espaço de negócios|商家空间
¡Qué más, wambra!|Hey there, wambra!|Salut, wambra !|Olá, wambra!|你好，wambra！
Tu comunidad empieza aquí|Your community starts here|Votre communauté commence ici|Sua comunidade começa aqui|你的社区从这里开始
Ver animación de CHULLA VIDA|Watch the CHULLA VIDA animation|Voir l’animation CHULLA VIDA|Ver animação CHULLA VIDA|观看 CHULLA VIDA 动画
Ver intro|Watch intro|Voir l’intro|Ver introdução|观看动画
Tengo un negocio|I run a business|J’ai une activité|Tenho um negócio|我是商家
Modo viajero|Traveler mode|Mode voyageur|Modo viajante|旅行者模式
Ver notificaciones|View notifications|Voir les notifications|Ver notificações|查看通知
Cerrar notificaciones|Close notifications|Fermer les notifications|Fechar notificações|关闭通知
Tus novedades|Your updates|Vos nouveautés|Suas novidades|最新动态
Por ahora, todo está al día.|You’re all caught up.|Tout est à jour.|Tudo em dia por aqui.|目前没有新消息。
Actividad de esta demostración local.|Activity in this local demo.|Activité de cette démo locale.|Atividade desta demonstração local.|本地演示中的活动。
Cambiar perfil de demostración|Switch demo profile|Changer de profil de démo|Trocar perfil de demonstração|切换演示身份
Cerrar perfiles|Close profiles|Fermer les profils|Fechar perfis|关闭身份菜单
¿Cómo quieres vivir Ecuador?|How will you experience Ecuador?|Comment vivre l’Équateur ?|Como quer viver o Equador?|想如何体验厄瓜多尔？
Soy viajero|I’m a traveler|Je voyage|Sou viajante|我是旅行者
Explora, planifica y guarda|Explore, plan and save|Explorez, planifiez et sauvegardez|Explore, planeje e salve|探索、规划和收藏
Publica y gestiona solicitudes|Publish and manage requests|Publiez et gérez les demandes|Publique e gerencie solicitações|发布体验并管理申请
Perfiles de prueba, sin inicio de sesión.|Demo profiles, no sign-in.|Profils de démo, sans connexion.|Perfis de teste, sem login.|演示身份，无需登录。
Viaja bacán.|Travel with good vibes.|Voyagez avec le sourire.|Viaje numa boa.|开心出发。
Cuida lo nuestro.|Care for our home.|Prenez soin de notre terre.|Cuide da nossa terra.|爱护我们的家园。
Conecta con la gente del lugar.|Connect with local people.|Rencontrez les habitants.|Conheça as pessoas do lugar.|结识当地人。
Conoce la cultura local|Discover local culture|Découvrir la culture locale|Conhecer a cultura local|探索当地文化
Ecuador a tu ritmo.|Ecuador at your pace.|L’Équateur à votre rythme.|Equador no seu ritmo.|按你的节奏探索厄瓜多尔。
Ver bienvenida|View welcome|Voir l’accueil|Ver boas-vindas|查看欢迎页
Ayuda|Help|Aide|Ajuda|帮助
Créditos de imágenes|Image credits|Crédits photos|Créditos das imagens|图片来源
Navegación móvil|Mobile navigation|Navigation mobile|Navegação móvel|移动导航
Explorar|Explore|Explorer|Explorar|探索
Mi viaje|My trip|Mon voyage|Minha viagem|我的行程
Guardados|Saved|Favoris|Favoritos|收藏
Mis viajes|My trips|Mes voyages|Minhas viagens|我的旅行
Saltar intro|Skip intro|Passer l’intro|Pular introdução|跳过动画
Un plan entre montañas.|A plan among the mountains.|Une escapade en montagne.|Um passeio entre montanhas.|山间的旅行计划。
Un respiro en la Costa.|A breath of coastal air.|Une pause sur la côte.|Uma pausa no litoral.|在海岸放松身心。
Conecta con el bosque.|Connect with the forest.|Renouez avec la forêt.|Conecte-se com a floresta.|感受森林的气息。
¿Te apuntas?|Coming along?|Vous venez ?|Vamos juntos?|一起出发？
Explora las regiones|Explore the regions|Explorez les régions|Explore as regiões|探索各个地区
Tu gente.|Your people.|Vos proches.|Sua gente.|你的伙伴。
Tu país. Tu plan.|Your country. Your plan.|Votre pays. Votre voyage.|Seu país. Seu plano.|你的国度，你的计划。
Junta a tus panas. Lo bueno está por descubrir.|Gather your friends. There’s so much to discover.|Réunissez vos amis. Le meilleur reste à découvrir.|Chame seus amigos. Tem muito por descobrir.|叫上朋友，一起发现美好。
Entrar a CHULLA VIDA|Enter CHULLA VIDA|Entrer dans CHULLA VIDA|Entrar no CHULLA VIDA|进入 CHULLA VIDA
¡De ley, vamos!|Let’s go!|C’est parti !|Vamos nessa!|出发吧！
Animación del logo|Logo animation|Animation du logo|Animação do logo|标志动画
Reproducir animación|Play animation|Lancer l’animation|Reproduzir animação|播放动画
Animar logo|Animate logo|Animer le logo|Animar logo|启动标志动画
Pausar logo|Pause logo|Mettre le logo en pause|Pausar logo|暂停标志动画
Repetir animación|Replay animation|Revoir l’animation|Repetir animação|重播动画
Movimiento reducido activado. Puedes reproducir el logo si lo deseas.|Reduced motion is on. You can choose to animate the logo.|Animations réduites. Vous pouvez animer le logo si vous le souhaitez.|Movimento reduzido ativado. Você pode animar o logo se quiser.|已启用减少动态效果。你仍可手动播放标志动画。
Sierra|Andes|Andes|Serra|安第斯山区
Costa|Coast|Côte|Costa|海岸
Amazonía|Amazon|Amazonie|Amazônia|亚马孙地区
Galápagos|Galápagos|Galápagos|Galápagos|加拉帕戈斯
Todo Ecuador|All Ecuador|Tout l’Équateur|Todo o Equador|厄瓜多尔全境
Todas|All|Toutes|Todas|全部
Arma un planazo|Plan a great getaway|Préparez une belle escapade|Planeje uma viagem incrível|策划一场精彩旅行
por Ecuador.|across Ecuador.|en Équateur.|pelo Equador.|探索厄瓜多尔。
Con tus panas o a tu aire.|With friends or on your own.|Entre amis ou en solo.|Com amigos ou por conta própria.|与朋友同行，或独自出发。
Ruta sin señal|Route without a signal|Sans réseau|Rota sem sinal|无信号路线
Lo nuestro se vive mejor de cerca.|Get closer to what makes us unique.|Vivez notre terre au plus près.|O que é nosso se vive de perto.|走近当地，感受独特魅力。
Tu viaje, a tu ritmo|Your trip, your pace|Votre voyage, votre rythme|Sua viagem, seu ritmo|你的旅行，你的节奏
Un punto de partida hecho para ti|A starting point made for you|Un point de départ pour vous|Um ponto de partida para você|专为你准备的起点
Cuéntanos qué te mueve|Tell us what inspires you|Dites-nous ce qui vous inspire|Conte o que te inspira|告诉我们你的兴趣
días|days|jours|dias|天
día|day|jour|dia|天
en total|in total|au total|no total|总计
Ver mi ruta|View my route|Voir mon itinéraire|Ver minha rota|查看路线
Personalizar|Personalize|Personnaliser|Personalizar|个性化设置
¿A dónde nos vamos?|Where shall we go?|Où partons-nous ?|Para onde vamos?|我们去哪里？
Elige un destino y arranca.|Pick a place and get going.|Choisissez et partez.|Escolha um destino e vá.|选个目的地，出发吧。
Turismo con sentido|Travel with purpose|Voyager avec du sens|Turismo com propósito|有意义的旅行
Filtrar por región|Filter by region|Filtrer par région|Filtrar por região|按地区筛选
Filtros|Filters|Filtres|Filtros|筛选
Busca un destino, una comunidad, una historia…|Find a place, a community, a story…|Cherchez un lieu, une communauté, une histoire…|Busque um destino, uma comunidade, uma história…|搜索目的地、社区或故事…
Buscar experiencias|Search experiences|Rechercher des expériences|Buscar experiências|搜索体验
Borrar búsqueda|Clear search|Effacer la recherche|Limpar busca|清除搜索
Ordenar:|Sort:|Trier :|Ordenar:|排序：
Ordenar experiencias|Sort experiences|Trier les expériences|Ordenar experiências|排列体验
Para ti|For you|Pour vous|Para você|为你推荐
Menor precio|Lowest price|Prix croissant|Menor preço|价格最低
Escapada corta|Short getaway|Courte escapade|Escapada curta|短途旅行
Precio máximo por persona|Maximum price per person|Prix maximal par personne|Preço máximo por pessoa|每人价格上限
Cualquier precio|Any price|Tous les prix|Qualquer preço|不限价格
Hasta $20|Up to $20|Jusqu’à 20 $|Até US$ 20|不超过20美元
Hasta $30|Up to $30|Jusqu’à 30 $|Até US$ 30|不超过30美元
Hasta $40|Up to $40|Jusqu’à 40 $|Até US$ 40|不超过40美元
Hasta $50|Up to $50|Jusqu’à 50 $|Até US$ 50|不超过50美元
Intensidad|Intensity|Intensité|Intensidade|强度
Tranqui|Relaxed|Détente|Tranquilo|轻松
Moderado|Moderate|Modérée|Moderado|适中
Adrenalina|Adrenaline|Adrénaline|Adrenalina|刺激
Duración máxima|Maximum duration|Durée maximale|Duração máxima|最长时长
Sin límite|No limit|Sans limite|Sem limite|不限
1 día|1 day|1 jour|1 dia|1天
2 días|2 days|2 jours|2 dias|2天
3 días|3 days|3 jours|3 dias|3天
Interés|Interest|Intérêt|Interesse|兴趣
Cultura|Culture|Culture|Cultura|文化
Naturaleza|Nature|Nature|Natureza|自然
Gastronomía|Food|Gastronomie|Gastronomia|美食
Senderismo|Hiking|Randonnée|Trilhas|徒步
Limpiar filtros|Clear filters|Effacer les filtres|Limpar filtros|清除筛选
Ajustar mis gustos|Edit my interests|Modifier mes envies|Ajustar preferências|调整偏好
{count} experiencias para descubrir|{count} experiences to discover|{count} expériences à découvrir|{count} experiências para descobrir|{count}项体验等你发现
Aún hay mucho por descubrir|There’s more to discover|Il reste tant à découvrir|Ainda há muito por descobrir|还有更多值得发现
Prueba otra región o amplía tu búsqueda.|Try another region or broaden your search.|Essayez une autre région ou une recherche plus large.|Tente outra região ou amplie a busca.|试试其他地区或扩大搜索范围。
Ver todas las experiencias|See all experiences|Voir toutes les expériences|Ver todas as experiências|查看全部体验
Catálogo de demostración · Precios orientativos · Fotografías de referencia de cada región.|Demo catalog · Indicative prices · Regional reference photos.|Catalogue de démo · Prix indicatifs · Photos régionales de référence.|Catálogo de demonstração · Preços indicativos · Fotos de referência regional.|演示目录 · 参考价格 · 各地区参考图片。
Duración|Duration|Durée|Duração|时长
Intensidad de la aventura|Adventure intensity|Intensité de l’aventure|Intensidade da aventura|探险强度
Hasta|Up to|Jusqu’à|Até|最多
por persona|per person|par personne|por pessoa|每人
Conocer|Discover|Découvrir|Conhecer|了解详情
Conocer {place}|Discover {place}|Découvrir {place}|Conhecer {place}|了解{place}
Ver experiencia {place}|View {place}|Voir {place}|Ver {place}|查看{place}体验
Información de la experiencia|Experience information|Informations sur l’expérience|Informações da experiência|体验信息
Lo esencial|Essentials|L’essentiel|O essencial|基本信息
Incluye|Included|Inclus|Inclui|包含内容
Ve pilas|Travel tips|Conseils|Fique ligado|旅行提醒
La historia del lugar|The story of this place|L’histoire du lieu|A história do lugar|当地故事
Gastos aparte|Extra expenses|Frais supplémentaires|Gastos extras|额外费用
 / persona| / person| / personne| / pessoa| / 每人
Guardado|Saved|Enregistré|Salvo|已收藏
Guardar|Save|Enregistrer|Salvar|收藏
Reservar y probar pago|Book & try demo payment|Réserver et tester le paiement|Reservar e testar pagamento|预约并试用演示付款
Demo · foto y precio orientativos. Confirma tu visita con el anfitrión.|Demo · Reference photo and price. Confirm your visit with the host.|Démo · Photo et prix indicatifs. Confirmez avec l’hôte.|Demo · Foto e preço indicativos. Confirme com o anfitrião.|演示 · 图片和价格仅供参考。请与接待者确认行程。
Esos lugares que te esperan|Places waiting for you|Ces lieux qui vous attendent|Lugares que te esperam|那些等待你的地方
Tus favoritos, juntos. Porque una buena escapada empieza con una idea.|Your favorites together. A great trip starts with an idea.|Vos favoris réunis. Une belle escapade commence par une idée.|Seus favoritos juntos. Uma boa viagem começa com uma ideia.|收藏汇聚于此，一次精彩旅程始于一个想法。
Tu próxima historia puede empezar aquí|Your next story starts here|Votre prochaine histoire commence ici|Sua próxima história começa aqui|你的下一个故事从这里开始
Toca el corazón en una experiencia para guardarla y volver cuando quieras.|Tap a heart to save an experience for later.|Touchez le cœur pour enregistrer une expérience.|Toque no coração para salvar uma experiência.|点击爱心收藏体验，随时回来查看。
Una ruta muy tuya|A route made for you|Un itinéraire bien à vous|Uma rota do seu jeito|专属于你的路线
Conocer experiencia|Discover experience|Découvrir l’expérience|Conhecer experiência|了解体验
Probemos con un poco más de margen|Try a little more flexibility|Essayons avec plus de souplesse|Tente um pouco mais de flexibilidade|试着放宽一点条件
No hay experiencias de esa región que encajen en tus días y presupuesto.|No experiences match your days and budget in this region.|Aucune expérience ne correspond à vos jours et budget dans cette région.|Nenhuma experiência corresponde aos dias e orçamento nesta região.|该地区暂无符合天数与预算的体验。
Experiencias para el grupo|Group experiences|Expériences pour le groupe|Experiências para o grupo|团体体验
Disponible para transporte y otros gastos|Available for transport and other costs|Disponible pour les transports et autres frais|Disponível para transporte e outros gastos|可用于交通及其他费用
Ajustar mi viaje|Adjust my trip|Modifier mon voyage|Ajustar minha viagem|调整行程
Guardar mi ruta|Save my route|Enregistrer mon itinéraire|Salvar minha rota|保存路线
Dale ritmo al viaje.|Give your trip a rhythm.|Donnez du rythme au voyage.|Dê ritmo à viagem.|让旅途充满节奏。
Música de aquí, para el camino.|Local music for the road.|Musique d’ici pour la route.|Música daqui para o caminho.|旅途中的本土音乐。
Selecciones en Spotify|Spotify picks|Sélections Spotify|Seleções no Spotify|Spotify 精选
En ruta.|On the road.|En route.|Na estrada.|在路上。
Abrir reproductor|Open player|Ouvrir le lecteur|Abrir reprodutor|打开播放器
Ir a Spotify|Go to Spotify|Aller sur Spotify|Ir ao Spotify|前往 Spotify
Seleccionar música para la ruta|Choose music for your trip|Choisir la musique du voyage|Selecionar música para a viagem|选择旅途音乐
La playlist compartida|The shared playlist|La playlist partagée|A playlist compartilhada|分享的歌单
Seleccionada|Selected|Sélectionnée|Selecionada|已选择
Abrir en Spotify|Open in Spotify|Ouvrir sur Spotify|Abrir no Spotify|在 Spotify 中打开
Viaja con las cosas claras|Travel with clarity|Voyagez l’esprit clair|Viaje com tudo claro|清楚了解，安心出行
Respuestas para preparar tu escapada y usar CHULLA VIDA.|Answers to plan your trip and use CHULLA VIDA.|Des réponses pour préparer votre voyage avec CHULLA VIDA.|Respostas para preparar sua viagem e usar CHULLA VIDA.|为规划旅行和使用 CHULLA VIDA 解答疑问。
¿En qué podemos ayudarte?|How can we help?|Comment vous aider ?|Como podemos ajudar?|有什么可以帮助你？
Buscar preguntas frecuentes|Search FAQs|Rechercher dans l’aide|Buscar perguntas frequentes|搜索常见问题
Categoría de ayuda|Help category|Catégorie d’aide|Categoria de ajuda|帮助分类
Viajeros|Travelers|Voyageurs|Viajantes|旅行者
Negocios|Businesses|Professionnels|Negócios|商家
Música|Music|Musique|Música|音乐
No encontramos esa pregunta|We couldn’t find that question|Aucune question trouvée|Não encontramos essa pergunta|未找到该问题
Mostrar todas las respuestas|Show all answers|Afficher toutes les réponses|Mostrar todas as respostas|显示所有答案
Un Ecuador que celebra|An Ecuador that celebrates|Un Équateur en fête|Um Equador que celebra|欢庆中的厄瓜多尔
Conocer tradición|Discover the tradition|Découvrir la tradition|Conhecer tradição|了解传统
Participa con respeto|Join in with respect|Participez avec respect|Participe com respeito|尊重地参与
Elementos de la tradición|Elements of the tradition|Éléments de la tradition|Elementos da tradição|传统元素
Entre wambras, el viaje se comparte|Wambras share the journey|Entre wambras, le voyage se partage|Entre wambras, a viagem é compartilhada|与 wambras 分享旅途
Conversaciones|Conversations|Conversations|Conversas|对话
Panas de ruta|Travel buddies|Compagnons de route|Amigos de estrada|旅途伙伴
Una conversación empieza con una pregunta|A conversation starts with a question|Une conversation commence par une question|Uma conversa começa com uma pergunta|对话始于一个问题
Tu mensaje|Your message|Votre message|Sua mensagem|你的消息
Comparte una idea para la ruta…|Share an idea for the road…|Partagez une idée de voyage…|Compartilhe uma ideia para a rota…|分享一个旅行想法…
Guardar mensaje en este navegador|Save message in this browser|Enregistrer le message ici|Salvar mensagem neste navegador|在此浏览器保存消息
Tu mensaje se guardó en este navegador.|Your message was saved in this browser.|Votre message a été enregistré dans ce navigateur.|Sua mensagem foi salva neste navegador.|消息已保存在此浏览器。
Arma tu plan|Make your plan|Préparez votre voyage|Monte seu plano|制定计划
Continuar|Continue|Continuer|Continuar|继续
Atrás|Back|Retour|Voltar|返回
Cerrar planificador|Close planner|Fermer le planificateur|Fechar planejador|关闭规划器
Plan de un día|Day trip|Sortie d’un jour|Passeio de um dia|一日游
Escapada|Getaway|Escapade|Escapada|短途旅行
Mochilero|Backpacker|Routard|Mochileiro|背包旅行
Equilibrado|Balanced|Équilibré|Equilibrado|均衡
¿Qué te mueve?|What inspires you?|Qu’est-ce qui vous inspire ?|O que te inspira?|你的兴趣是什么？
Elige uno o varios|Choose one or more|Choisissez un ou plusieurs|Escolha um ou mais|可选择一项或多项
¿Cuál es tu presupuesto total?|What’s your total budget?|Quel est votre budget total ?|Qual é seu orçamento total?|总预算是多少？
¿Cuántos días tienes?|How many days do you have?|Combien de jours avez-vous ?|Quantos dias você tem?|有多少天时间？
¿Cuántos van?|How many are traveling?|Combien de personnes partent ?|Quantas pessoas vão?|几个人同行？
¿Por dónde empiezas?|Where will you begin?|Par où commencer ?|Por onde começar?|从哪里开始？
¿Cuánta aventura?|How much adventure?|Quel niveau d’aventure ?|Quanta aventura?|想要多大冒险？
¿De dónde arrancas?|Where are you starting from?|D’où partez-vous ?|De onde você sai?|从哪个城市出发？
Buscar tu ciudad|Find your city|Chercher votre ville|Buscar sua cidade|搜索城市
Ciudad o provincia|City or province|Ville ou province|Cidade ou província|城市或省份
¡De una, ver mi ruta!|Let’s see my route!|Voir mon itinéraire !|Vamos ver minha rota!|查看我的路线！
Suave|Gentle|Douce|Leve|轻松
Media|Medium|Moyenne|Média|适中
Intensa|Intense|Intense|Intensa|高强度
Aventura|Adventure|Aventure|Aventura|冒险
Cultura viva|Living culture|Culture vivante|Cultura viva|活态文化
Fotografía|Photography|Photographie|Fotografia|摄影
Voluntariado|Volunteering|Bénévolat|Voluntariado|志愿活动
Noche cultural|Cultural night|Soirée culturelle|Noite cultural|文化之夜
Con amigos|With friends|Entre amis|Com amigos|与朋友同行
personas|people|personnes|pessoas|人
Punto de partida|Starting point|Point de départ|Ponto de partida|出发地
Tu plan|Your plan|Votre voyage|Seu plano|你的计划
Presupuesto|Budget|Budget|Orçamento|预算
Región|Region|Région|Região|地区
Intereses|Interests|Intérêts|Interesses|兴趣
Ver ruta|View route|Voir l’itinéraire|Ver rota|查看路线
Regiones de Ecuador|Regions of Ecuador|Régions de l’Équateur|Regiões do Equador|厄瓜多尔各地区
Tus preferencias de viaje|Your travel preferences|Vos préférences de voyage|Suas preferências de viagem|旅行偏好
Días|Days|Jours|Dias|天数
Compañía|Travel party|Compagnie|Companhia|同行人数
Ritmo|Pace|Rythme|Ritmo|节奏
Origen|Departure|Départ|Origem|出发地
Cercanía|Distance|Distance|Proximidade|距离
Elige tus favoritos. Se vale marcar varios.|Choose your favorites. You can pick several.|Choisissez vos favoris. Plusieurs choix possibles.|Escolha seus favoritos. Pode marcar vários.|选择你喜欢的项目，可多选。
Para todo el grupo y todo el viaje, en USD.|For the whole group and trip, in USD.|Pour tout le groupe et le voyage, en USD.|Para todo o grupo e toda a viagem, em USD.|整个团队全程的预算，单位为美元。
De una escapada a dos semanas.|From a day out to two weeks.|D’une escapade à deux semaines.|De um passeio a duas semanas.|从短途游到两周旅行。
¿Vas solo o con tus panas?|Going solo or with friends?|En solo ou entre amis ?|Vai só ou com amigos?|独自出发还是与朋友同行？
¿Qué región te late?|Which region calls to you?|Quelle région vous attire ?|Qual região te chama?|哪个地区最吸引你？
Elige una o déjate sorprender.|Choose one or be surprised.|Choisissez ou laissez-vous surprendre.|Escolha uma ou deixe se surpreender.|选择一个，或让旅行带来惊喜。
Tranqui o con más energía: tú eliges.|Relaxed or energetic: you choose.|Détente ou énergie : à vous de choisir.|Tranquilo ou com energia: você escolhe.|轻松或活力十足，由你决定。
Busca tu ciudad en Ecuador o agrega otra.|Find your city in Ecuador or add another.|Cherchez votre ville en Équateur ou ajoutez-en une.|Busque sua cidade no Equador ou adicione outra.|搜索厄瓜多尔的城市，或添加其他城市。
¿Cerca o más lejitos?|Near home or further away?|Tout près ou plus loin ?|Perto ou um pouco mais longe?|在附近还是去远方？
Dale alcance a tu escapada.|Choose how far to explore.|Choisissez jusqu’où aller.|Escolha até onde explorar.|选择探索的范围。
Volcanes, páramos y cultura andina|Volcanoes, páramo and Andean culture|Volcans, páramos et culture andine|Vulcões, páramos e cultura andina|火山、高山草甸与安第斯文化
Mar, sabores y pueblos costeros|Sea, flavors and coastal towns|Mer, saveurs et villages côtiers|Mar, sabores e vilas costeiras|海洋、美食与海滨小镇
Oriente · Amazonía|Amazon region|Orient · Amazonie|Oriente · Amazônia|东部 · 亚马孙地区
Bosques, ríos y comunidades|Forests, rivers and communities|Forêts, rivières et communautés|Florestas, rios e comunidades|森林、河流与社区
Islas y vida marina|Islands and marine life|Îles et vie marine|Ilhas e vida marinha|岛屿与海洋生物
Abierto a descubrir nuevas regiones|Open to discovering new regions|Ouvert à de nouvelles régions|Aberto a novas regiões|愿意探索新的地区
Paseos, cultura y tiempo para respirar.|Walks, culture and time to unwind.|Balades, culture et temps pour souffler.|Passeios, cultura e tempo para respirar.|散步、文化与放松的时光。
Caminatas y un poco de desafío.|Hikes with a little challenge.|Randonnées et un peu de défi.|Caminhadas e um pouco de desafio.|徒步与适度的挑战。
Rutas exigentes y mucha energía.|Demanding routes and lots of energy.|Parcours exigeants et beaucoup d’énergie.|Rotas exigentes e muita energia.|高难度路线，充满活力。
Paso|Step|Étape|Etapa|步骤
Tus intereses|Your interests|Vos centres d’intérêt|Seus interesses|你的兴趣
interés seleccionado|interest selected|intérêt choisi|interesse selecionado|项兴趣已选
intereses seleccionados|interests selected|intérêts choisis|interesses selecionados|项兴趣已选
Puedes elegir varios.|You can choose several.|Plusieurs choix possibles.|Pode escolher vários.|可以多选。
Selecciona al menos un interés para continuar.|Choose at least one interest to continue.|Choisissez au moins un intérêt pour continuer.|Escolha ao menos um interesse para continuar.|请至少选择一项兴趣后继续。
USD · presupuesto del grupo|USD · group budget|USD · budget du groupe|USD · orçamento do grupo|美元 · 团队预算
Presupuesto total del grupo en dólares|Total group budget in dollars|Budget total du groupe en dollars|Orçamento total do grupo em dólares|团队总预算（美元）
Presupuestos sugeridos|Suggested budgets|Budgets suggérés|Orçamentos sugeridos|建议预算
Referencia por persona y día|Estimate per person per day|Estimation par personne et par jour|Referência por pessoa e dia|每人每天参考预算
Los paseos locales económicos suponen que ya estás en el destino. Transporte y extras van aparte.|Budget local activities assume you are already at the destination. Transport and extras cost more.|Les activités locales économiques supposent votre présence sur place. Transport et extras en supplément.|Os passeios locais econômicos pressupõem que você já está no destino. Transporte e extras à parte.|低价当地活动假定你已到达目的地。交通和其他费用另计。
día para descubrir|day to explore|jour pour découvrir|dia para descobrir|天探索时间
días para descubrir|days to explore|jours pour découvrir|dias para descobrir|天探索时间
wambra en la ruta|traveler on the road|voyageur sur la route|viajante na rota|位同行者
wambras en la ruta|travelers on the road|voyageurs sur la route|viajantes na rota|位同行者
Días disponibles|Available days|Jours disponibles|Dias disponíveis|可用天数
Cantidad de viajeros|Number of travelers|Nombre de voyageurs|Quantidade de viajantes|旅行人数
persona|person|personne|pessoa|人
14 días|14 days|14 jours|14 dias|14天
10 personas|10 people|10 personnes|10 pessoas|10人
Un día menos|One day less|Un jour de moins|Um dia a menos|减少一天
Un día más|One more day|Un jour de plus|Um dia a mais|增加一天
Una persona menos|One fewer person|Une personne de moins|Uma pessoa a menos|减少一人
Una persona más|One more person|Une personne de plus|Uma pessoa a mais|增加一人
Haz espacio para lo que te mueve.|Make time for what inspires you.|Prenez le temps de ce qui vous inspire.|Abra espaço para o que te inspira.|为热爱的事留出时间。
Tu viaje, a tu ritmo.|Your trip, your pace.|Votre voyage, votre rythme.|Sua viagem, seu ritmo.|你的旅行，你的节奏。
Las buenas historias se comparten.|Good stories are shared.|Les belles histoires se partagent.|Boas histórias são compartilhadas.|美好的故事值得分享。
Región preferida|Preferred region|Région préférée|Região preferida|偏好地区
Nivel de aventura|Adventure level|Niveau d’aventure|Nível de aventura|探险等级
Ciudad o provincia: Tena, Manabí…|City or province: Tena, Manabí…|Ville ou province : Tena, Manabí…|Cidade ou província: Tena, Manabí…|城市或省份：Tena、Manabí…
resultados|results|résultats|resultados|项结果
ciudades|cities|villes|cidades|座城市
Sales desde|Departing from|Vous partez de|Você sai de|出发城市
Ciudades de origen|Departure cities|Villes de départ|Cidades de origem|出发城市列表
Usar como origen|Use as departure|Choisir comme départ|Usar como origem|设为出发地
Escribe al menos dos letras para buscar o agregar tu ciudad.|Type at least two letters to find or add your city.|Saisissez au moins deux lettres pour rechercher ou ajouter votre ville.|Digite ao menos duas letras para buscar ou adicionar sua cidade.|输入至少两个字符来搜索或添加城市。
Selecciona una ciudad para continuar.|Select a city to continue.|Choisissez une ville pour continuer.|Selecione uma cidade para continuar.|请选择城市后继续。
Alcance de la escapada|Trip range|Portée du voyage|Alcance da viagem|旅行范围
Cerca de casa|Close to home|Près de chez soi|Perto de casa|离家不远
Prefiero escapadas cortas|I prefer short trips|Je préfère les courts séjours|Prefiro viagens curtas|我喜欢短途旅行
Una nueva región|A new region|Une nouvelle région|Uma nova região|新的地区
Tengo ganas de ir un poco más lejos|I want to go a little further|J’ai envie d’aller plus loin|Quero ir um pouco mais longe|想去稍远一点的地方
La distancia es parte de la aventura|Distance is part of the adventure|La distance fait partie de l’aventure|A distância faz parte da aventura|距离也是冒险的一部分
Todo el país|The whole country|Tout le pays|Todo o país|全国
Referencia|Reference|Référence|Referência|参考
Preferencia regional; no calcula carreteras.|Regional preference; roads are not calculated.|Préférence régionale ; trajets routiers non calculés.|Preferência regional; não calcula estradas.|地区偏好；不计算公路路线。
¡De una! Tu plan está listo.|All set! Your plan is ready.|C’est bon ! Votre voyage est prêt.|Pronto! Seu plano está feito.|准备好了！你的计划已完成。
Resumen de preferencias|Preferences summary|Résumé des préférences|Resumo das preferências|偏好摘要
Tu plan, de un vistazo|Your plan at a glance|Votre voyage en un coup d’œil|Seu plano num relance|行程一览
Puedes cambiarlo cuando quieras.|You can change it anytime.|Modifiable à tout moment.|Pode mudar quando quiser.|随时可以修改。
Tú eliges|You choose|À vous de choisir|Você escolhe|由你选择
para el grupo|for the group|pour le groupe|para o grupo|团队总计
Panas y días|Friends and days|Amis et jours|Amigos e dias|同行人数与天数
Región y ritmo|Region and pace|Région et rythme|Região e ritmo|地区与节奏
Arrancas desde|Starting from|Départ de|Você sai de|出发地
Por descubrir|To be discovered|À découvrir|Por descobrir|待探索
Viaja bacán. Cuida el lugar.|Enjoy the trip. Care for the place.|Profitez du voyage. Respectez le lieu.|Viaje numa boa. Cuide do lugar.|开心旅行，爱护当地。
Lo haré después|I’ll do it later|Plus tard|Faço depois|稍后再说
/ persona|/ person|/ personne|/ pessoa|/ 每人
Desde|From|Depuis|Desde|从
wambras · hasta|travelers · up to|voyageurs · jusqu’à|viajantes · até|位旅行者 · 最多
días ·|days ·|jours ·|dias ·|天 ·
Propuesta orientativa: los trayectos, horarios y distancias por carretera no están calculados. La cercanía elegida (|Indicative plan: road routes, schedules and distances are not calculated. Your chosen range (|Proposition indicative : trajets, horaires et distances routières non calculés. La distance choisie (|Proposta indicativa: trajetos, horários e distâncias rodoviárias não são calculados. A proximidade escolhida (|参考计划：未计算公路路线、时刻及距离。所选范围（
km) queda como preferencia para revisar al organizar los traslados.|km) is a preference to review when arranging transport.|km) reste une préférence à vérifier pour organiser les transports.|km) é uma preferência a revisar ao organizar o transporte.|公里）仅为偏好，请在安排交通时核实。
Pulsa reproducir dentro de Spotify para escuchar.|Press play inside Spotify to listen.|Appuyez sur lecture dans Spotify pour écouter.|Aperte reproduzir no Spotify para ouvir.|请在 Spotify 中按播放按钮收听。
Si el reproductor no carga, abre la selección directamente en Spotify. Algunas funciones dependen de tu cuenta.|If the player doesn’t load, open it directly in Spotify. Some features depend on your account.|Si le lecteur ne charge pas, ouvrez directement Spotify. Certaines fonctions dépendent de votre compte.|Se o reprodutor não carregar, abra no Spotify. Algumas funções dependem da sua conta.|若播放器无法加载，请直接在 Spotify 中打开。部分功能取决于你的账户。
Prueba con «presupuesto», «reserva» o «negocio».|Try “budget”, “booking” or “business”.|Essayez « budget », « réservation » ou « activité ».|Tente “orçamento”, “reserva” ou “negócio”.|试试“预算”、“预约”或“商家”。
El mejor viaje también cuida de quienes reciben.|A great trip cares for the hosts too.|Un beau voyage prend aussi soin des hôtes.|A melhor viagem também cuida dos anfitriões.|好的旅行也关心接待你的人。
Pregunta, escucha y respeta los ritmos de cada comunidad.|Ask, listen and respect each community’s pace.|Demandez, écoutez et respectez le rythme de chaque communauté.|Pergunte, escute e respeite o ritmo de cada comunidade.|询问、倾听，并尊重各社区的生活节奏。
Conoce sus Raymis y tradiciones. Acércate con curiosidad y respeto.|Discover Raymis and traditions with curiosity and respect.|Découvrez les Raymis et traditions avec curiosité et respect.|Conheça os Raymis e as tradições com curiosidade e respeito.|怀着好奇与尊重，了解 Raymi 节庆与当地传统。
Referencia del calendario:|Calendar reference:|Repère du calendrier :|Referência do calendário:|日历参考：
Las celebraciones pueden variar según cada comunidad. Consulta las fechas y condiciones de participación con sus organizadores.|Celebrations vary by community. Confirm dates and participation with the organizers.|Les fêtes varient selon la communauté. Confirmez dates et participation auprès des organisateurs.|As celebrações variam conforme a comunidade. Confirme datas e participação com os organizadores.|各社区的庆祝活动可能不同，请与主办方确认日期及参与条件。
Ideas, preguntas y ganas de conocer el siguiente destino.|Ideas, questions and excitement for the next destination.|Des idées, des questions et l’envie de découvrir la suite.|Ideias, perguntas e vontade de conhecer o próximo destino.|想法、疑问，还有探索下一站的期待。
Espacio de demostración.|Demo space.|Espace de démo.|Espaço de demonstração.|演示空间。
Los mensajes solo son visibles en este navegador.|Messages are only visible in this browser.|Les messages ne sont visibles que dans ce navigateur.|As mensagens só são visíveis neste navegador.|消息仅在此浏览器中可见。
Escribe una idea de viaje para probar este espacio.|Write a travel idea to try this space.|Écrivez une idée de voyage pour essayer cet espace.|Escreva uma ideia de viagem para testar este espaço.|写下一个旅行想法来体验此空间。
Prueba local · No se envían mensajes a otras personas.|Local demo · No messages are sent to others.|Démo locale · Aucun message envoyé à autrui.|Teste local · Nenhuma mensagem é enviada a outras pessoas.|本地演示 · 不会向他人发送消息。
8 pasos y nos fuimos, wambra.|8 steps and we’re off, wambra.|8 étapes et c’est parti, wambra.|8 passos e partiu, wambra.|8步准备，出发吧，wambra。
Pasos del planificador|Planner steps|Étapes de planification|Etapas do planejador|规划步骤
completado|completed|terminé|concluído|已完成
Álbum|Album|Album|Álbum|专辑
Canción|Song|Chanson|Canção|歌曲
Playlist compartida para CHULLA VIDA|Shared playlist for CHULLA VIDA|Playlist partagée pour CHULLA VIDA|Playlist compartilhada para CHULLA VIDA|为 CHULLA VIDA 分享的歌单
Música de nuestra tierra para acompañar el camino.|Music from our land for the road.|Musique de notre terre pour la route.|Música da nossa terra para o caminho.|来自这片土地的音乐，陪伴旅途。
Para perderte entre montañas|For getting lost in the mountains|Pour s’évader dans les montagnes|Para se perder entre montanhas|伴你沉醉山间
Energía para salir a la carretera|Energy for hitting the road|De l’énergie pour prendre la route|Energia para pegar a estrada|踏上旅途的活力
Las mejores historias se comparten.|The best stories are shared.|Les meilleures histoires se partagent.|As melhores histórias são compartilhadas.|最好的故事值得分享。
Rutas de páramo, pueblos y montañas.|Páramo paths, villages and mountains.|Páramos, villages et montagnes.|Rotas de páramo, vilas e montanhas.|高山草甸、小镇与群山路线。
Entre el mar y los caminos del litoral.|Between the sea and coastal paths.|Entre mer et chemins du littoral.|Entre o mar e os caminhos do litoral.|在海洋与海岸道路之间。
Ideas para descubrir el bosque.|Ideas for exploring the forest.|Des idées pour découvrir la forêt.|Ideias para descobrir a floresta.|探索森林的灵感。
¿Cómo encuentro un viaje que vaya conmigo?|How do I find a trip that suits me?|Comment trouver un voyage qui me correspond ?|Como encontro uma viagem que combine comigo?|如何找到适合自己的旅行？
¿El presupuesto es por persona o por todo el grupo?|Is the budget per person or for the group?|Le budget est-il par personne ou pour le groupe ?|O orçamento é por pessoa ou pelo grupo?|预算是每人还是整个团队的？
¿Puedo viajar sin experiencia previa?|Can I travel without prior experience?|Puis-je voyager sans expérience préalable ?|Posso viajar sem experiência prévia?|没有经验也可以参加吗？
¿Cómo funcionan las solicitudes de reserva?|How do booking requests work?|Comment fonctionnent les demandes de réservation ?|Como funcionam as solicitações de reserva?|预约申请如何运作？
¿Qué pasa si cambian mis planes?|What if my plans change?|Et si mes projets changent ?|E se meus planos mudarem?|计划变更了怎么办？
¿Qué debo llevar y cómo cuido el lugar?|What should I bring and how can I care for the place?|Que dois-je emporter et comment respecter le lieu ?|O que devo levar e como cuidar do lugar?|应该携带什么，如何爱护当地？
¿Qué puedo hacer desde mi espacio de negocios?|What can I do in my business space?|Que puis-je faire dans mon espace professionnel ?|O que posso fazer no espaço de negócios?|在商家空间可以做什么？
¿La información se conserva al cerrar la aplicación?|Is information saved when I close the app?|Les informations sont-elles conservées après fermeture ?|As informações ficam salvas ao fechar o aplicativo?|关闭应用后信息会保留吗？
¿Los pagos con tarjeta, transferencia o Deuna son reales?|Are card, transfer or Deuna payments real?|Les paiements par carte, virement ou Deuna sont-ils réels ?|Os pagamentos por cartão, transferência ou Deuna são reais?|银行卡、转账或 Deuna 付款是真的吗？
¿Cómo escucho la música del viaje?|How can I listen to travel music?|Comment écouter la musique du voyage ?|Como escuto a música da viagem?|如何收听旅途音乐？
Abre «Planificar mi viaje» y responde las ocho preguntas: intereses, presupuesto del grupo, días, personas, región, intensidad, origen y cercanía. Las sugerencias se ordenan según tus respuestas. Puedes cambiarlas cuando quieras.|Open “Plan my trip” and answer eight questions: interests, group budget, days, people, region, intensity, departure and distance. Suggestions follow your answers. Change them anytime.|Ouvrez « Planifier mon voyage » et répondez aux huit questions : intérêts, budget du groupe, jours, personnes, région, intensité, départ et distance. Les suggestions suivent vos réponses, modifiables à tout moment.|Abra “Planejar minha viagem” e responda oito perguntas: interesses, orçamento do grupo, dias, pessoas, região, intensidade, origem e distância. As sugestões seguem suas respostas. Mude quando quiser.|打开“规划旅行”，回答兴趣、团队预算、天数、人数、地区、强度、出发地和距离八个问题。推荐会按回答排序，你可以随时修改。
El planificador utiliza el presupuesto total del grupo para toda la escapada. En cada experiencia mostramos la tarifa por persona y calculamos el total según cuántos viajan. Transporte, alimentación o alojamiento solo se incluyen cuando la ficha lo indica.|The planner uses the whole group’s budget for the entire trip. Experiences show a per-person price and a group total. Transport, food and accommodation are included only when the listing says so.|Le planificateur utilise le budget total du groupe pour tout le voyage. Chaque expérience affiche le prix par personne et calcule le total. Transport, repas et hébergement sont inclus uniquement si la fiche le précise.|O planejador usa o orçamento total do grupo para toda a viagem. As experiências mostram o preço por pessoa e calculam o total. Transporte, alimentação e hospedagem só estão incluídos quando a ficha indicar.|规划器使用整个团队全程的总预算。体验显示每人价格，并按同行人数计算总价。只有详情明确说明时才包含交通、餐饮或住宿。
Sí: elige intensidad suave para ver actividades tranquilas. Revisa la duración, la altitud y las recomendaciones de cada ficha, y confirma los requisitos con el anfitrión antes de tu visita.|Yes. Choose gentle intensity for relaxed activities. Check duration, altitude and advice in each listing, and confirm requirements with the host before visiting.|Oui. Choisissez l’intensité douce pour des activités tranquilles. Consultez durée, altitude et conseils, puis confirmez les conditions auprès de l’hôte avant la visite.|Sim. Escolha intensidade leve para atividades tranquilas. Confira duração, altitude e recomendações de cada ficha, e confirme os requisitos com o anfitrião antes da visita.|可以。选择轻松强度以查看休闲活动。请阅读时长、海拔及建议，并在出发前与接待者确认参与要求。
Selecciona una experiencia y pulsa «Reservar y probar pago». Elige fecha, personas y un método de prueba; revisa el total y simula el resultado. La solicitud y su pago de demostración se guardan por separado. El negocio confirma la visita desde su panel; no hay cobros ni mensajes externos.|Choose an experience and select “Book & try demo payment”. Pick a date, group size and demo method, review the total and simulate a result. Request and demo payment are saved separately. The business confirms the visit in its panel. No charges or external messages occur.|Choisissez une expérience et « Réserver et tester le paiement ». Indiquez date, personnes et méthode de test, puis simulez le résultat. Demande et paiement de démo sont séparés. L’hôte confirme la visite dans son espace. Aucun débit ni message externe.|Escolha uma experiência e “Reservar e testar pagamento”. Selecione data, pessoas e método de teste, revise o total e simule o resultado. Solicitação e pagamento de demonstração ficam separados. O negócio confirma a visita no painel. Sem cobranças nem mensagens externas.|选择体验并点击“预约并试用演示付款”。选择日期、人数和演示方式，查看总价并模拟结果。预约与演示付款分开保存。商家在面板中确认行程，不会实际扣款或发送外部消息。
En «Mis viajes y pagos» puedes cancelar una solicitud pendiente o confirmada. Para una reserva real, consulta directamente las condiciones de cambio y cancelación del anfitrión antes de contratar.|In “Trips & payments”, cancel a pending or confirmed request. For a real booking, check the host’s change and cancellation conditions before purchasing.|Dans « Voyages et paiements », annulez une demande en attente ou confirmée. Pour une vraie réservation, vérifiez les conditions de modification et d’annulation de l’hôte avant d’acheter.|Em “Viagens e pagamentos”, cancele uma solicitação pendente ou confirmada. Para uma reserva real, consulte as condições de alteração e cancelamento do anfitrião antes de contratar.|在“旅行与付款”中可以取消待处理或已确认的申请。实际预订前，请直接向接待者了解改期及取消条件。
Consulta las recomendaciones de cada experiencia. Como base, lleva agua en un recipiente reutilizable, ropa adecuada al clima y tu identificación. Respeta los senderos, pregunta antes de fotografiar a las personas y regresa con tus residuos.|Read each experience’s advice. Bring water in a reusable bottle, weather-appropriate clothing and ID. Stay on trails, ask before photographing people and take your waste home.|Consultez les conseils de chaque expérience. Emportez de l’eau dans une gourde, des vêtements adaptés et une pièce d’identité. Respectez les sentiers, demandez avant de photographier et rapportez vos déchets.|Confira as recomendações de cada experiência. Leve água em recipiente reutilizável, roupas adequadas e identificação. Respeite as trilhas, peça antes de fotografar pessoas e leve seu lixo de volta.|阅读每项体验的建议。携带可重复使用水瓶、适合天气的衣物和证件。遵守步道规定，拍摄他人前先征求同意，并将垃圾带走。
Puedes publicar una experiencia, actualizar sus datos, ajustar precio y capacidad, y revisar o responder las solicitudes que correspondan a tu negocio. Las herramientas de gestión están separadas del recorrido de los viajeros.|Publish an experience, update details, adjust price and capacity, and review or respond to your business’s requests. Management tools are separate from the traveler experience.|Publiez une expérience, modifiez ses informations, son prix et sa capacité, puis gérez les demandes de votre activité. Les outils de gestion sont séparés du parcours voyageur.|Publique uma experiência, atualize dados, ajuste preço e capacidade, e responda às solicitações do seu negócio. As ferramentas de gestão ficam separadas da área dos viajantes.|你可以发布体验、更新信息、调整价格及容量，并查看或回应自己商家的申请。管理工具与旅行者界面分开。
Los favoritos, las preferencias, las experiencias y las solicitudes se guardan en este navegador. No se sincronizan entre dispositivos ni entre personas. Si borras los datos del navegador, se eliminan estos cambios.|Favorites, preferences, experiences and requests are saved in this browser. They do not sync between devices or people. Clearing browser data removes these changes.|Favoris, préférences, expériences et demandes restent dans ce navigateur. Aucune synchronisation entre appareils ou personnes. Effacer les données du navigateur supprime ces modifications.|Favoritos, preferências, experiências e solicitações ficam neste navegador. Não há sincronização entre dispositivos ou pessoas. Limpar os dados do navegador apaga essas alterações.|收藏、偏好、体验及申请保存在此浏览器中，不会在设备或用户之间同步。清除浏览器数据会删除这些更改。
Son simulaciones. La tarjeta está precargada con datos de prueba y no pide datos bancarios. La transferencia utiliza una referencia ficticia y el QR contiene solo texto de demostración. Puedes probar aprobación, rechazo y reintento. En «Mis viajes y pagos» puedes completar una transferencia pendiente. Ninguna opción mueve dinero ni confirma una reserva real.|They are simulations. The card uses preset test data and asks for no bank details. Transfers use fictional references; the QR contains demo text only. Try approval, rejection and retry. Complete a pending transfer in “Trips & payments”. No money moves and no real booking is confirmed.|Ce sont des simulations. La carte utilise des données de test prédéfinies, sans coordonnées bancaires. Le virement a une référence fictive ; le QR contient du texte de démo. Testez approbation, refus et nouvel essai. Finalisez un virement en attente dans « Voyages et paiements ». Aucun argent ne circule ni vraie réservation confirmée.|São simulações. O cartão usa dados de teste prontos, sem pedir dados bancários. A transferência tem referência fictícia e o QR só contém texto de demonstração. Teste aprovação, recusa e nova tentativa. Conclua uma transferência pendente em “Viagens e pagamentos”. Não movimenta dinheiro nem confirma reserva real.|这些都是模拟。银行卡使用预设测试数据，不收集银行信息。转账使用虚构编号，二维码仅含演示文字。可测试成功、拒绝及重试，也可在“旅行与付款”中完成待处理转账。不会实际转移资金或确认真实预订。
En la sección de música encontrarás «Folklore ecuatoriano», la playlist compartida para CHULLA VIDA, y otras recomendaciones. Elige una y pulsa «Abrir reproductor» o «Ir a Spotify». La música comienza cuando tú la reproduces. Algunas funciones pueden requerir tu cuenta de Spotify; CHULLA VIDA no solicita tu contraseña.|Find “Folklore ecuatoriano”, the playlist shared for CHULLA VIDA, and other recommendations in the music section. Choose one and open the player or Spotify. Music starts only when you press play. Some features require a Spotify account; CHULLA VIDA never asks for your password.|La section musique propose « Folklore ecuatoriano », la playlist partagée pour CHULLA VIDA, et d’autres suggestions. Choisissez puis ouvrez le lecteur ou Spotify. Vous lancez vous-même la musique. Certaines fonctions nécessitent un compte Spotify ; CHULLA VIDA ne demande pas votre mot de passe.|Na seção de música estão “Folklore ecuatoriano”, a playlist compartilhada para CHULLA VIDA, e outras recomendações. Escolha e abra o reprodutor ou Spotify. A música só começa quando você a reproduz. Algumas funções exigem conta Spotify; CHULLA VIDA não pede sua senha.|音乐区提供为 CHULLA VIDA 分享的“Folklore ecuatoriano”歌单及其他推荐。选择后打开播放器或 Spotify，只有你按播放才会开始。部分功能可能需要 Spotify 账户，CHULLA VIDA 不会索取密码。
Agua|Water|Eau|Água|水
Camino|Path|Chemin|Caminho|道路
Amigo|Friend|Ami|Amigo|朋友
`;

const dictionary: Record<string, Partial<Record<Language, string>>> = Object.fromEntries(rows.trim().split('\n').map(row => {
  const [es, en, fr, pt, zh] = row.split('|');
  return [es, { en, fr, pt, zh }];
}));

export function translate(language: Language, source: string, variables: Record<string, string | number> = {}): string {
  const text = language === 'es' ? source : language === 'ki' || language === 'ki-amz'
    ? translateKichwa(source) : dictionary[source]?.[language] || paymentTranslations[language]?.[source] || hostTranslations[language]?.[source] || source;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => key in variables ? String(variables[key]) : match);
}
