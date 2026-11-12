// Interface copy only: business names and descriptions remain as entered by their authors.
const rows = `
Cuenta qué hace especial a tu lugar y qué recibirá cada visitante.|Describe your place and what visitors receive.|Présentez votre lieu et ce que recevront les visiteurs.|Conte sobre seu lugar e o que os visitantes recebem.|介绍你的地点及访客可获得的服务。
Cerrar formulario|Close form|Fermer le formulaire|Fechar formulário|关闭表单
Nombre de la experiencia *|Experience name *|Nom de l’expérience *|Nome da experiência *|体验名称 *
Ej. Un día entre tejidos y sabores de Saraguro|e.g. Saraguro crafts and food|Ex. Artisanat et saveurs de Saraguro|Ex. Artesanato e sabores de Saraguro|例如：萨拉古罗手工艺与美食
Negocio o comunidad anfitriona *|Host business or community *|Entreprise ou communauté hôte *|Negócio ou comunidade anfitriã *|接待商家或社区 *
Región *|Region *|Région *|Região *|地区 *
Provincia *|Province *|Province *|Província *|省份 *
Cantón, parroquia o punto de encuentro *|Town or meeting point *|Localité ou point de rencontre *|Localidade ou ponto de encontro *|城镇或集合地点 *
Descripción *|Description *|Description *|Descrição *|描述 *
Describe las actividades, el entorno y a quién le gustaría esta experiencia.|Describe the activities, setting and intended visitors.|Décrivez les activités, le cadre et le public.|Descreva as atividades, o ambiente e o público.|描述活动、环境及适合的访客。
Escribe información que puedas ofrecer y confirmar.|Only describe services you can provide and confirm.|Décrivez uniquement des services que vous pouvez assurer.|Descreva apenas serviços que pode oferecer e confirmar.|仅填写你能提供并确认的服务。
Precio por persona · USD *|Price per person · USD *|Prix par personne · USD *|Preço por pessoa · USD *|每人价格 · 美元 *
Duración en días *|Duration in days *|Durée en jours *|Duração em dias *|天数 *
Cupos máximos por día *|Daily capacity *|Capacité par jour *|Capacidade diária *|每日接待人数 *
Nivel de aventura *|Adventure level *|Niveau d’aventure *|Nível de aventura *|活动强度 *
Suave · caminatas tranquilas|Easy · relaxed walks|Facile · promenades tranquilles|Leve · caminhadas tranquilas|轻松 · 休闲步行
Media · actividad moderada|Medium · moderate activity|Moyen · activité modérée|Média · atividade moderada|适中 · 中等强度活动
Intensa · mayor esfuerzo físico|Intense · greater physical effort|Intense · effort physique soutenu|Intensa · maior esforço físico|高强度 · 更多体力要求
¿Qué incluye? *|What is included? *|Que comprend l’offre ? *|O que está incluído? *|包含什么？*
Foto de portada · URL opcional|Cover photo · optional URL|Photo de couverture · URL facultative|Foto de capa · URL opcional|封面照片 · 可选网址
Si la dejas vacía, usaremos una fotografía de referencia de la región.|Leave blank to use a regional reference photo.|Laissez vide pour utiliser une photo régionale de référence.|Deixe vazio para usar uma foto regional de referência.|留空将使用该地区的参考照片。
WhatsApp de contacto · opcional|Contact WhatsApp · optional|WhatsApp de contact · facultatif|WhatsApp de contato · opcional|联系 WhatsApp · 可选
Los cambios se guardan en este navegador.|Changes are saved in this browser.|Les modifications sont enregistrées dans ce navigateur.|As alterações ficam salvas neste navegador.|更改保存在此浏览器中。
Cancelar|Cancel|Annuler|Cancelar|取消
Nombre del negocio o comunidad *|Business or community name *|Nom de l’entreprise ou communauté *|Nome do negócio ou comunidade *|商家或社区名称 *
Ubicación y punto de encuentro *|Location and meeting point *|Adresse et point de rencontre *|Localização e ponto de encontro *|地址及集合地点 *
WhatsApp de contacto|Contact WhatsApp|WhatsApp de contact|WhatsApp de contato|联系 WhatsApp
Teléfono para llamadas|Phone number|Téléphone|Telefone|电话号码
Estos datos aparecerán en la ficha de tu experiencia.|These details appear on your experience page.|Ces informations figurent sur votre fiche.|Esses dados aparecem na página da experiência.|这些资料将显示在体验详情中。
Guardar datos|Save details|Enregistrer|Salvar dados|保存资料
estimados|estimated|estimés|estimados|预估
Pago de demostración:|Demo payment:|Paiement de démonstration :|Pagamento de demonstração:|模拟付款：
Aceptar|Accept|Accepter|Aceitar|接受
¿Cancelar la solicitud de|Cancel request for|Annuler la demande de|Cancelar a solicitação de|取消申请：
Conservar solicitud|Keep request|Conserver la demande|Manter solicitação|保留申请
Sí, cancelar|Yes, cancel|Oui, annuler|Sim, cancelar|确认取消
Tu lugar, nuevas conexiones.|Your place. New connections.|Votre lieu, de nouvelles rencontres.|Seu lugar, novas conexões.|你的天地，新的相遇。
Comparte lo que haces y recibe a quienes quieren conocerlo.|Share your work and welcome curious visitors.|Partagez votre savoir-faire et accueillez les curieux.|Compartilhe o que faz e receba novos visitantes.|分享你的特色，迎接好奇的访客。
Publicar experiencia|Publish experience|Publier une expérience|Publicar experiência|发布体验
Negocio de demostración|Demo business|Établissement de démonstration|Negócio de demonstração|演示商家
Selecciona una experiencia|Select an experience|Choisir une expérience|Escolher experiência|选择体验
Gestión del negocio|Business management|Gestion de l’activité|Gestão do negócio|商家管理
Cerrar aviso|Dismiss notice|Fermer l’avis|Fechar aviso|关闭通知
Detrás de cada viaje,|Behind every trip,|Derrière chaque voyage,|Por trás de cada viagem,|每段旅途背后，
hay alguien como tú.|there is someone like you.|il y a quelqu’un comme vous.|há alguém como você.|都有像你一样的人。
Tu experiencia es el punto de encuentro. Mantén tus precios y cupos al día para ayudar a los wambras a elegir su próxima ruta.|Keep prices and capacity current to help travelers plan.|Actualisez vos prix et disponibilités pour aider les voyageurs.|Atualize preços e vagas para ajudar os viajantes.|更新价格和名额，帮助旅客规划行程。
Gestionar mi experiencia|Manage experience|Gérer mon expérience|Gerenciar experiência|管理体验
Paisaje que invita a descubrir Ecuador|Ecuadorian landscape|Paysage équatorien|Paisagem equatoriana|厄瓜多尔风景
Resumen de las solicitudes de este negocio|Business request summary|Résumé des demandes|Resumo de solicitações|商家申请概览
Por responder|Awaiting response|À traiter|A responder|待回复
Solicitudes confirmadas|Confirmed requests|Demandes confirmées|Solicitações confirmadas|已确认申请
Personas en solicitudes activas|People in active requests|Personnes dans les demandes actives|Pessoas nas solicitações ativas|有效申请人数
Valor estimado · sin cobros|Estimated value · no charges|Valeur estimée · aucun débit|Valor estimado · sem cobrança|预估金额 · 不收费
Solicitudes recientes|Recent requests|Demandes récentes|Solicitações recentes|最近申请
Solo las solicitudes de la experiencia seleccionada.|Requests for the selected experience only.|Demandes de l’expérience sélectionnée uniquement.|Somente solicitações da experiência selecionada.|仅显示所选体验的申请。
Ver todas|View all|Tout voir|Ver todas|查看全部
Aquí empieza tu próxima visita.|Your next visit starts here.|Votre prochaine visite commence ici.|Sua próxima visita começa aqui.|下一次到访从这里开始。
Cuando un wambra solicite esta experiencia, encontrarás aquí la fecha, el grupo y los detalles para responder.|New requests will appear here with the date and group details.|Les nouvelles demandes afficheront ici leur date et leur groupe.|Novas solicitações aparecem aqui com data e grupo.|新申请的日期和团体详情将显示在这里。
Revisar mi experiencia|Review experience|Vérifier mon expérience|Revisar experiência|查看体验
Este es un espacio de demostración. Las experiencias y solicitudes se guardan en este navegador. Confirmar una solicitud no realiza cobros ni envía mensajes.|Demo: experiences and requests stay in this browser. Confirmation does not charge or send messages.|Démo : les données restent dans ce navigateur. La confirmation ne débite rien et n’envoie aucun message.|Demonstração: os dados ficam neste navegador. Confirmar não cobra nem envia mensagens.|演示：体验和申请保存在此浏览器中，确认不会收费或发送消息。
Una experiencia que merece contarse.|An experience worth sharing.|Une expérience à partager.|Uma experiência para compartilhar.|值得分享的体验。
Revisa tu publicación y mantén los detalles claros para tus visitantes.|Review your listing and keep details clear.|Vérifiez votre annonce et ses informations.|Revise a publicação e mantenha os detalhes claros.|检查发布内容，确保资料清晰。
En el catálogo local|In the local catalog|Dans le catalogue local|No catálogo local|在本地目录中
Por persona|Per person|Par personne|Por pessoa|每人
Duración|Duration|Durée|Duração|时长
Cupos por día|Daily capacity|Capacité par jour|Vagas por dia|每日名额
Editar detalles, precio y cupos|Edit details, price and capacity|Modifier détails, prix et capacité|Editar detalhes, preço e vagas|编辑详情、价格和名额
Tu primera experiencia comienza aquí.|Your first experience starts here.|Votre première expérience commence ici.|Sua primeira experiência começa aqui.|从这里创建第一个体验。
Agrega una propuesta con una descripción, precio, cupos y ubicación para que los wambras puedan descubrirla.|Add a description, price, capacity and location.|Ajoutez une description, un prix, une capacité et un lieu.|Adicione descrição, preço, vagas e localização.|添加描述、价格、名额和地点。
Crear experiencia|Create experience|Créer une expérience|Criar experiência|创建体验
Precios claros, mejores encuentros.|Clear prices, better encounters.|Des prix clairs, de belles rencontres.|Preços claros, melhores encontros.|价格透明，相遇更美好。
Indica qué está incluido y el tamaño del grupo que puedes recibir. La publicación aparecerá en el catálogo de este navegador.|Specify inclusions and group size. The listing stays in this browser.|Précisez les prestations et la taille du groupe. L’annonce reste dans ce navigateur.|Informe inclusões e tamanho do grupo. A publicação fica neste navegador.|说明包含的服务和团体人数。发布内容仅保存在此浏览器。
Organiza tus próximas visitas.|Organize upcoming visits.|Organisez vos prochaines visites.|Organize as próximas visitas.|安排未来到访。
Acepta o cancela solicitudes. El estado se actualiza en el espacio del viajero.|Accept or cancel requests. Travelers see the updated status.|Acceptez ou annulez les demandes. Le statut est visible côté voyageur.|Aceite ou cancele solicitações. O viajante verá o novo estado.|接受或取消申请，旅客端会更新状态。
Exportar CSV|Export CSV|Exporter CSV|Exportar CSV|导出 CSV
Filtrar solicitudes|Filter requests|Filtrer les demandes|Filtrar solicitações|筛选申请
Ver todas las solicitudes|View all requests|Voir toutes les demandes|Ver todas as solicitações|查看全部申请
Los importes son estimados. No se han procesado pagos ni avisos externos.|Amounts are estimates. No payments or external notices were sent.|Montants estimés. Aucun paiement ni avis externe traité.|Valores estimados. Nenhum pagamento ou aviso externo foi processado.|金额仅为预估，未处理付款或外部通知。
La información de tu negocio.|Your business details.|Les informations de votre activité.|Os dados do seu negócio.|你的商家资料。
Un punto de encuentro claro y un contacto facilitan el primer paso.|Clear meeting points and contact details help visitors.|Un lieu précis et un contact facilitent la rencontre.|Um ponto de encontro claro e um contato ajudam os visitantes.|清晰的集合地点和联系方式让出行更方便。
Perfil local|Local profile|Profil local|Perfil local|本地资料
Presenta tu negocio.|Introduce your business.|Présentez votre activité.|Apresente seu negócio.|介绍你的商家。
Publica tu primera experiencia para agregar la información de tu negocio.|Publish an experience to add your business details.|Publiez une expérience pour ajouter vos informations.|Publique uma experiência para adicionar seus dados.|发布第一个体验以添加商家资料。
El selector permite recorrer negocios de ejemplo. Esta demostración no incluye cuentas privadas ni verificación de identidad.|Browse example businesses. This demo has no private accounts or identity checks.|Parcourez des exemples. Cette démo n’a ni comptes privés ni vérification d’identité.|Explore negócios de exemplo. A demonstração não tem contas privadas nem verificação de identidade.|可浏览示例商家。演示不包含私人账户或身份验证。
Editar experiencia|Edit experience|Modifier l’expérience|Editar experiência|编辑体验
Publica una nueva experiencia|Publish a new experience|Publier une nouvelle expérience|Publicar nova experiência|发布新体验
Guardar cambios|Save changes|Enregistrer les modifications|Salvar alterações|保存更改
Resumen|Overview|Aperçu|Resumo|概览
Experiencias|Experiences|Expériences|Experiências|体验
Solicitudes|Requests|Demandes|Solicitações|申请
Confirmadas|Confirmed|Confirmées|Confirmadas|已确认
Canceladas|Canceled|Annulées|Canceladas|已取消
Todavía no hay solicitudes.|No requests yet.|Aucune demande pour le moment.|Ainda não há solicitações.|暂无申请。
No hay solicitudes en este estado.|No requests with this status.|Aucune demande avec ce statut.|Nenhuma solicitação neste estado.|没有此状态的申请。
Las nuevas solicitudes de esta experiencia aparecerán aquí. Puedes probar el recorrido desde el espacio de wambras.|New requests appear here. Try the flow from traveler mode.|Les nouvelles demandes apparaissent ici. Essayez depuis le mode voyageur.|Novas solicitações aparecem aqui. Experimente no modo viajante.|新申请显示在这里，可从旅客模式测试流程。
Elige otro filtro para revisar el resto de las visitas.|Choose another filter to see other visits.|Choisissez un autre filtre.|Escolha outro filtro para ver outras visitas.|选择其他筛选条件查看到访。
Completa los campos obligatorios e indica qué incluye la experiencia.|Complete required fields and inclusions.|Complétez les champs obligatoires et les prestations.|Preencha os campos obrigatórios e as inclusões.|请填写必填项及包含的服务。
Usa una dirección de foto que empiece con https:// o deja el campo vacío.|Use an https:// photo URL or leave blank.|Utilisez une URL https:// ou laissez vide.|Use uma URL https:// ou deixe vazio.|请使用 https:// 图片网址或留空。
Revisa el precio, la duración (1–14 días) y los cupos (1–99 personas).|Check price, duration (1–14 days) and capacity (1–99 people).|Vérifiez le prix, la durée (1–14 jours) et la capacité (1–99 personnes).|Confira preço, duração (1–14 dias) e vagas (1–99 pessoas).|请检查价格、天数（1–14）和名额（1–99人）。
Escribe el nombre del negocio y su ubicación.|Enter the business name and location.|Indiquez le nom et le lieu de l’activité.|Informe o nome e a localização do negócio.|请填写商家名称及地址。
Los datos de tu negocio se guardaron en este navegador.|Business details saved in this browser.|Informations enregistrées dans ce navigateur.|Dados salvos neste navegador.|商家资料已保存在此浏览器中。
Los cambios de tu experiencia se guardaron en este navegador.|Experience changes saved in this browser.|Modifications enregistrées dans ce navigateur.|Alterações salvas neste navegador.|体验更改已保存在此浏览器中。
Tu experiencia se publicó en el catálogo de este navegador. Puedes verla en el espacio de wambras.|Published in this browser’s catalog. View it in traveler mode.|Publication dans ce navigateur. Consultez le mode voyageur.|Publicado no catálogo deste navegador. Confira no modo viajante.|已发布到此浏览器的目录中，可在旅客模式查看。
Solicitud cancelada en este navegador.|Request canceled in this browser.|Demande annulée dans ce navigateur.|Solicitação cancelada neste navegador.|已在此浏览器中取消申请。
Se descargaron las solicitudes de este negocio en formato CSV.|Business requests downloaded as CSV.|Demandes téléchargées en CSV.|Solicitações baixadas em CSV.|商家申请已下载为 CSV。
`;
export const hostTranslations: Record<string, Record<string,string>> = { en:{},fr:{},pt:{},zh:{} };
for(const row of rows.trim().split('\n')){
  const [es,...values]=row.split('|');
  ['en','fr','pt','zh'].forEach((lang,index)=>{hostTranslations[lang][es]=values[index];});
}
