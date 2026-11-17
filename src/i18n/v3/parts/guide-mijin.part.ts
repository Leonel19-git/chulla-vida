/** Textos del recorrido y controles de voz, cargados con los diccionarios de interfaz. */
const rows: Record<string, [string, string, string, string]> = {
  'A tu medida': ['Make it yours', 'À ta mesure', 'Do seu jeito', '按你的喜好'],
  'Abre el Álbum para hojear los cromos.': ['Open the Album to browse the cards.', 'Ouvre l’Album pour parcourir les vignettes.', 'Abra o Álbum para ver os cromos.', '打开相册，浏览旅行卡片。'],
  'Abre una ficha': ['Open a card', 'Ouvre une fiche', 'Abra uma ficha', '打开详情'],
  'Busca un lugar': ['Find a place', 'Cherche un lieu', 'Busque um lugar', '查找地点'],
  'Descubre las fechas y los lugares de cada fiesta.': ['Find the dates and places for each festival.', 'Découvre les dates et les lieux de chaque fête.', 'Veja as datas e os lugares de cada festa.', '查看各个节庆的时间和地点。'],
  'Desde aquí gestionas tus solicitudes.': ['Manage your requests here.', 'Gère tes demandes ici.', 'Gerencie suas solicitações aqui.', '在这里管理申请。'],
  'Entra a tu cuenta y ajusta tus preferencias.': ['Open your account and set your preferences.', 'Accède à ton compte et règle tes préférences.', 'Entre na sua conta e ajuste suas preferências.', '进入账户并调整偏好设置。'],
  'Escribe un nombre o una provincia.': ['Type a name or a province.', 'Saisis un nom ou une province.', 'Digite um nome ou uma província.', '输入名称或省份。'],
  'Fiestas': ['Festivals', 'Fêtes', 'Festas', '节庆'],
  'Filtra por días, presupuesto o dificultad.': ['Filter by days, budget or difficulty.', 'Filtre par durée, budget ou difficulté.', 'Filtre por dias, orçamento ou dificuldade.', '按天数、预算或难度筛选。'],
  'Mi sobre · Mi viaje': ['My pack · My trip', 'Ma pochette · Mon voyage', 'Meu envelope · Minha viagem', '我的卡包 · 我的行程'],
  'Mira lo que llevas en tu álbum. Solo una visita confirmada pega el cromo.': ['See your album so far. Only a confirmed visit adds a collected card.', 'Retrouve ta collection. Seule une visite confirmée permet de coller la vignette.', 'Veja sua coleção. Só uma visita confirmada cola o cromo.', '查看你的收藏。只有确认到访后，才能贴上卡片。'],
  'Pregunta por voz o texto. Tú enciendes el micrófono.': ['Ask by voice or text. You turn the microphone on.', 'Pose tes questions par la voix ou par écrit. Tu actives le micro.', 'Pergunte por voz ou texto. Você ativa o microfone.', '通过语音或文字提问。麦克风由你开启。'],
  'Prepara tus fichas y revisa su estado.': ['Prepare your listings and check their status.', 'Prépare tes fiches et consulte leur état.', 'Prepare suas fichas e acompanhe o status.', '准备体验详情并查看状态。'],
  'Revisa cada solicitud antes de responder.': ['Review each request before replying.', 'Consulte chaque demande avant de répondre.', 'Revise cada solicitação antes de responder.', '回复前请查看每条申请。'],
  'Revisa tus datos y permisos. Tener cuenta no acredita una verificación.': ['Check your details and permissions. Having an account does not mean you are verified.', 'Vérifie tes données et tes droits d’accès. Avoir un compte ne vaut pas vérification.', 'Confira seus dados e permissões. Ter uma conta não comprova verificação.', '查看资料和权限。拥有账户并不代表已通过核验。'],
  'Reúne tus cromos y arma tu viaje con Chulla Flex.': ['Gather your cards and plan your trip with Chulla Flex.', 'Rassemble tes vignettes et prépare ton voyage avec Chulla Flex.', 'Reúna seus cromos e monte sua viagem com Chulla Flex.', '收集卡片，用 Chulla Flex 规划行程。'],
  'Toca el cromo para ver el plan. El corazón lo guarda en tu sobre.': ['Tap a card to see the plan. The heart saves it to your pack.', 'Touche une vignette pour voir le programme. Le cœur l’ajoute à ta pochette.', 'Toque no cromo para ver o plano. O coração salva no seu envelope.', '点按卡片查看计划。点击爱心即可存入卡包。'],
  'Toca una región y mira sus cromos.': ['Tap a region to see its cards.', 'Touche une région pour voir ses vignettes.', 'Toque numa região para ver seus cromos.', '点按地区，查看对应卡片。'],
  'Tu cuenta': ['Your account', 'Ton compte', 'Sua conta', '你的账户'],
  'Tu espacio de anfitrión': ['Your host area', 'Ton espace hôte', 'Seu espaço de anfitrião', '你的接待方面板'],
  'Tu álbum del Ecuador': ['Your Ecuador album', 'Ton album de l’Équateur', 'Seu álbum do Equador', '你的厄瓜多尔相册'],
  'Tus experiencias': ['Your experiences', 'Tes expériences', 'Suas experiências', '你的体验项目'],
  'Tus solicitudes': ['Your requests', 'Tes demandes', 'Suas solicitações', '你的申请'],
  'Yo · Tu cuenta': ['Me · Your account', 'Moi · Ton compte', 'Eu · Sua conta', '我 · 你的账户'],
  'Ver recorrido de anfitriones': ['See the host tour', 'Voir le parcours des hôtes', 'Ver o guia de anfitriões', '查看接待方引导'],
  'Solo aparecen las voces disponibles en tu navegador.': ['Only voices available in your browser are listed.', 'Seules les voix disponibles dans ton navigateur sont proposées.', 'Só aparecem as vozes disponíveis no seu navegador.', '仅显示浏览器中可用的语音。'],
  'Tu pana de aventuras': ['Your adventure buddy', 'Ton compagnon d’aventure', 'Seu parceiro de aventuras', '你的冒险伙伴'],
  'Cancelar descarga': ['Cancel download', 'Annuler le téléchargement', 'Cancelar download', '取消下载'],
  'Cancelar y volver': ['Cancel and go back', 'Annuler et revenir', 'Cancelar e voltar', '取消并返回'],
  'Listo, terminé de hablar': ['Done speaking', 'J’ai fini de parler', 'Pronto, terminei de falar', '我说完了'],
};
export const en = Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[0]]));
export const fr = Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[1]]));
export const pt = Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[2]]));
export const zh = Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[3]]));
