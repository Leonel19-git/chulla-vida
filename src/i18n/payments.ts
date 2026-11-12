// Source literals remain stable so reservation data and payment enums never change with language.
const rows = `
Tarjeta|Card|Carte|Cartão|银行卡
Prueba una aprobación o un rechazo.|Try an approval or a decline.|Essayez une approbation ou un refus.|Teste uma aprovação ou recusa.|测试批准或拒绝。
Transferencia|Bank transfer|Virement|Transferência|银行转账
Simula una referencia por revisar.|Simulate a reference awaiting review.|Simulez une référence à vérifier.|Simule uma referência para revisão.|模拟待审核的转账编号。
Deuna · demo|Deuna · demo|Deuna · démo|Deuna · demo|Deuna · 演示
Explora un QR sin cobro.|Explore a QR code without a charge.|Explorez un QR sans débit.|Explore um QR sem cobrança.|体验不会扣款的二维码。
Elige una fecha de hoy en adelante para continuar.|Choose today or a future date to continue.|Choisissez aujourd’hui ou une date ultérieure.|Escolha hoje ou uma data futura para continuar.|请选择今天或以后的日期。
Esta experiencia admite de 1 a {max} personas. Ajusta tu grupo.|This experience allows 1 to {max} people. Adjust your group.|Cette expérience accueille de 1 à {max} personnes. Ajustez votre groupe.|Esta experiência aceita de 1 a {max} pessoas. Ajuste seu grupo.|此体验可接待 1 至 {max} 人。请调整人数。
Esta experiencia no tiene cupos. Prueba con otra escapada.|No spaces are available. Try another outing.|Aucune place disponible. Essayez une autre sortie.|Não há vagas. Tente outro passeio.|没有空位，请选择其他体验。
Rechazo de prueba. No se guardó ninguna solicitud ni se realizó un cobro. Puedes probar la aprobación.|Test declined. No request was saved and no money was charged. You can try approval.|Refus de test. Aucune demande enregistrée ni aucun débit. Essayez l’approbation.|Recusa de teste. Nenhuma solicitação foi salva e nada foi cobrado. Você pode testar a aprovação.|测试被拒绝。未保存申请，也未扣款。可以再测试批准。
No se pudo guardar la simulación. Revisa tu fecha y vuelve a intentarlo.|Could not save the simulation. Check your date and try again.|Impossible d’enregistrer la simulation. Vérifiez la date et réessayez.|Não foi possível salvar a simulação. Confira a data e tente novamente.|无法保存模拟。请检查日期并重试。
DEMOSTRACIÓN|DEMONSTRATION|DÉMONSTRATION|DEMONSTRAÇÃO|演示
COMPROBANTE DE SIMULACIÓN · SIN VALOR DE PAGO|SIMULATION RECEIPT · NOT PROOF OF PAYMENT|REÇU DE SIMULATION · SANS VALEUR DE PAIEMENT|COMPROVANTE DE SIMULAÇÃO · SEM VALOR DE PAGAMENTO|模拟凭证 · 不可作为付款证明
Fecha|Date|Date|Data|日期
Tu grupo|Your group|Votre groupe|Seu grupo|同行人数
persona|person|personne|pessoa|人
personas|people|personnes|pessoas|人
Método de prueba|Test method|Moyen de test|Método de teste|测试方式
Total simulado|Simulated total|Total simulé|Total simulado|模拟总额
Estado del pago de prueba|Test payment status|État du paiement de test|Status do pagamento de teste|测试付款状态
Pendiente de revisión|Awaiting review|À vérifier|Aguardando revisão|待审核
Aprobado|Approved|Approuvé|Aprovado|已批准
Referencia|Reference|Référence|Referência|编号
Tu solicitud|Your request|Votre demande|Sua solicitação|你的申请
No se realizó ningún cobro. La solicitud sigue pendiente de confirmación del negocio y solo se guarda en este navegador. Este documento no acredita una reserva real ni un pago real.|No money was charged. The request still needs business confirmation and is saved only in this browser. This document is not proof of a real booking or payment.|Aucun débit effectué. La demande reste à confirmer par le professionnel et est enregistrée uniquement dans ce navigateur. Ce document ne prouve ni réservation ni paiement réels.|Nada foi cobrado. A solicitação aguarda confirmação do negócio e só fica salva neste navegador. Este documento não comprova reserva nem pagamento reais.|未收取任何费用。申请仍待商家确认，且仅保存在此浏览器中。此文件不证明真实预订或付款。
Tu simulación, lista|Your simulation is ready|Votre simulation est prête|Sua simulação está pronta|模拟已完成
Prepara tu próxima escapada|Prepare your next outing|Préparez votre prochaine escapade|Prepare sua próxima escapada|准备下一次出游
Modo demostración · sin cobros ni datos bancarios reales|Demo mode · no charges or real bank details|Mode démo · sans débit ni données bancaires réelles|Modo demonstração · sem cobranças nem dados bancários reais|演示模式 · 不扣款，不使用真实银行信息
Progreso de tu solicitud|Request progress|Progression de la demande|Progresso da solicitação|申请进度
Tu escapada|Your outing|Votre escapade|Sua escapada|出游安排
Forma de pago|Payment method|Moyen de paiement|Forma de pagamento|付款方式
Revisar y simular|Review and simulate|Vérifier et simuler|Revisar e simular|检查并模拟
Transferencia de prueba pendiente|Test transfer pending|Virement de test en attente|Transferência de teste pendente|测试转账待处理
Simulación aprobada|Simulation approved|Simulation approuvée|Simulação aprovada|模拟已批准
La referencia ficticia quedó guardada para probar su revisión.|The fictitious reference was saved to test its review.|La référence fictive est enregistrée pour tester sa vérification.|A referência fictícia foi salva para testar a revisão.|虚构编号已保存，可测试审核流程。
El recorrido de pago se completó. No se realizó ningún cobro.|The payment flow is complete. No money was charged.|Le parcours de paiement est terminé. Aucun débit effectué.|O fluxo de pagamento foi concluído. Nada foi cobrado.|付款流程已完成。未扣款。
Método|Method|Moyen|Método|方式
Documento|Document|Document|Documento|文件
Demostración · sin valor de pago|Demo · not proof of payment|Démo · sans valeur de paiement|Demonstração · sem valor de pagamento|演示 · 不作为付款证明
Pendiente de confirmación|Awaiting confirmation|À confirmer|Aguardando confirmação|待确认
El negocio confirma la disponibilidad por separado. Esta prueba se guarda en tu navegador.|The business confirms availability separately. This test is saved in your browser.|Le professionnel confirme la disponibilité séparément. Ce test est enregistré dans votre navigateur.|O negócio confirma a disponibilidade separadamente. Este teste fica salvo no navegador.|商家将另行确认是否有空位。测试仅保存在浏览器中。
Ver mis viajes y pagos|View trips and payments|Voir mes voyages et paiements|Ver minhas viagens e pagamentos|查看旅行与付款
Descargar comprobante demo|Download demo receipt|Télécharger le reçu de démo|Baixar comprovante demo|下载演示凭证
Un plan a tu medida|A plan for you|Un programme à votre mesure|Um plano para você|量身安排出游
Elige cómo probar el pago|Choose how to test payment|Choisissez comment tester le paiement|Escolha como testar o pagamento|选择付款测试方式
Todo listo para la prueba|Ready for the test|Tout est prêt pour le test|Tudo pronto para o teste|已准备好测试
Una fecha, tu grupo y las ganas de salir.|A date, your group and a taste for adventure.|Une date, votre groupe et l’envie de partir.|Uma data, seu grupo e vontade de sair.|选好日期，约上同伴，准备出发。
Explora el proceso con opciones simuladas.|Explore the process with simulated options.|Explorez le parcours avec des options simulées.|Explore o processo com opções simuladas.|通过模拟选项体验流程。
Revisa los detalles antes de simular.|Check the details before simulating.|Vérifiez les détails avant de simuler.|Confira os detalhes antes de simular.|模拟前请检查详情。
¿Cuándo quieres ir?|When would you like to go?|Quand souhaitez-vous partir ?|Quando você quer ir?|想什么时候出发？
Fecha de salida · horario de Ecuador|Departure date · Ecuador time|Date de départ · heure d’Équateur|Data de saída · horário do Equador|出发日期 · 厄瓜多尔时间
¿Cuántos van?|How many are going?|Combien serez-vous ?|Quantas pessoas vão?|几个人同行？
Hasta|Up to|Jusqu’à|Até|最多
personas por salida|people per departure|personnes par départ|pessoas por saída|人每次出发
Quitar una persona|Remove one person|Retirer une personne|Remover uma pessoa|减少一人
Personas en el grupo|People in your group|Personnes dans le groupe|Pessoas no grupo|同行人数
Agregar una persona|Add one person|Ajouter une personne|Adicionar uma pessoa|增加一人
La tarifa corresponde a la experiencia completa. Los traslados y extras solo se incluyen cuando lo indica la ficha.|The price covers the complete experience. Transfers and extras are included only when stated in the listing.|Le prix couvre l’expérience complète. Transferts et suppléments sont inclus uniquement si la fiche le précise.|O preço cobre a experiência completa. Traslados e extras só estão incluídos quando a ficha informa.|价格对应完整体验。仅在详情明确说明时包含接送与额外项目。
Método de pago simulado|Simulated payment method|Moyen de paiement simulé|Método de pagamento simulado|模拟付款方式
Tarjeta de prueba|Test card|Carte de test|Cartão de teste|测试银行卡
Transferencia de prueba|Test transfer|Virement de test|Transferência de teste|测试转账
Deuna de prueba|Test Deuna|Deuna de test|Deuna de teste|Deuna 测试
DEMO|DEMO|DÉMO|DEMO|演示
CHULLA VIDA · Sin datos reales|CHULLA VIDA · No real details|CHULLA VIDA · Sans données réelles|CHULLA VIDA · Sem dados reais|CHULLA VIDA · 不使用真实信息
¿Qué resultado quieres probar?|Which result would you like to test?|Quel résultat souhaitez-vous tester ?|Qual resultado você quer testar?|想测试哪种结果？
Probar aprobación|Test approval|Tester l’approbation|Testar aprovação|测试批准
Probar rechazo|Test decline|Tester le refus|Testar recusa|测试拒绝
Referencia ficticia de transferencia|Fictitious transfer reference|Référence de virement fictive|Referência fictícia de transferência|虚构转账编号
Sin cuenta bancaria ni depósito real. Al confirmar, quedará pendiente de revisión en esta demostración.|No bank account or real deposit. Confirming leaves it awaiting review in this demo.|Sans compte bancaire ni dépôt réel. La confirmation laisse ce test en attente de vérification.|Sem conta bancária nem depósito real. Ao confirmar, ficará aguardando revisão nesta demonstração.|无需银行账户或真实存款。确认后，在此演示中进入待审核状态。
QR de demostración que contiene únicamente el texto CHULLA-VIDA:DEMO|Demo QR containing only CHULLA-VIDA:DEMO text|QR de démo contenant uniquement le texte CHULLA-VIDA:DEMO|QR de demonstração contendo apenas o texto CHULLA-VIDA:DEMO|仅包含 CHULLA-VIDA:DEMO 文字的演示二维码
QR de demostración · sin cobro|Demo QR · no charge|QR de démo · sans débit|QR de demonstração · sem cobrança|演示二维码 · 不扣款
Contiene solo «CHULLA-VIDA:DEMO». Puedes probar la aprobación en el siguiente paso.|Contains only “CHULLA-VIDA:DEMO”. Test approval in the next step.|Contient uniquement « CHULLA-VIDA:DEMO ». Testez l’approbation à l’étape suivante.|Contém apenas «CHULLA-VIDA:DEMO». Teste a aprovação na próxima etapa.|仅包含“CHULLA-VIDA:DEMO”。下一步可测试批准。
Deuna no está conectado a esta demostración.|Deuna is not connected to this demo.|Deuna n’est pas connecté à cette démo.|O Deuna não está conectado a esta demonstração.|此演示未连接 Deuna。
Fecha de salida|Departure date|Date de départ|Data de saída|出发日期
Resultado a simular|Result to simulate|Résultat à simuler|Resultado a simular|要模拟的结果
Rechazo de prueba|Test decline|Refus de test|Recusa de teste|测试拒绝
Aprobación de prueba|Test approval|Approbation de test|Aprovação de teste|测试批准
Esta acción guarda una prueba local. No descuenta dinero, no envía datos a proveedores y no confirma una reserva real.|This saves a local test. It does not charge money, send data to providers or confirm a real booking.|Cette action enregistre un test local. Aucun débit, envoi aux prestataires ou réservation réelle.|Esta ação salva um teste local. Não cobra dinheiro, não envia dados a fornecedores nem confirma reserva real.|此操作仅保存本地测试。不会扣款、向商家发送数据或确认真实预订。
Cambiar a aprobación de prueba|Switch to test approval|Passer à l’approbation de test|Mudar para aprovação de teste|改为测试批准
Preparando la prueba…|Preparing the test…|Préparation du test…|Preparando o teste…|正在准备测试…
Simulando la respuesta…|Simulating the response…|Simulation de la réponse…|Simulando a resposta…|正在模拟响应…
Guardando el resultado…|Saving the result…|Enregistrement du résultat…|Salvando o resultado…|正在保存结果…
Detener y volver|Stop and go back|Arrêter et revenir|Parar e voltar|停止并返回
Volver|Back|Retour|Voltar|返回
Ahora no|Not now|Pas maintenant|Agora não|暂时不用
Elegir forma de pago|Choose payment method|Choisir le moyen de paiement|Escolher forma de pagamento|选择付款方式
Revisar mi escapada|Review my outing|Vérifier mon escapade|Revisar minha escapada|检查出游安排
Simulación en curso…|Simulation in progress…|Simulation en cours…|Simulação em andamento…|正在模拟…
Simular transferencia|Simulate transfer|Simuler le virement|Simular transferência|模拟转账
Simular pago de {total}|Simulate payment of {total}|Simuler le paiement de {total}|Simular pagamento de {total}|模拟付款 {total}
Paisaje de referencia|Reference landscape|Paysage de référence|Paisagem de referência|景观参考图
día|day|jour|dia|天
días|days|jours|dias|天
Comisión en esta demo|Fee in this demo|Commission de cette démo|Taxa nesta demonstração|此演示的手续费
Comisión incluida · 10%|Included commission · 10%|Commission incluse · 10 %|Comissão incluída · 10%|已含佣金 · 10%
Para el anfitrión · 90%|For the host · 90%|Pour l’hôte · 90 %|Para o anfitrião · 90%|商家所得 · 90%
USD · experiencia completa|USD · complete experience|USD · expérience complète|USD · experiência completa|美元 · 完整体验
Sin cargos reales. El negocio aún debe confirmar tu fecha.|No real charges. The business must still confirm your date.|Aucun débit réel. Le professionnel doit encore confirmer votre date.|Sem cobranças reais. O negócio ainda precisa confirmar a data.|不会真实扣款。日期仍需商家确认。
Por confirmar|Awaiting confirmation|À confirmer|Aguardando confirmação|待确认
Confirmada|Confirmed|Confirmée|Confirmada|已确认
Pagada|Paid|Payée|Paga|已付款
Visita validada|Visit validated|Visite validée|Visita validada|到访已验证
Liquidada|Settled|Réglée|Liquidada|已结算
Completada|Completed|Terminée|Concluída|已完成
Cancelada|Cancelled|Annulée|Cancelada|已取消
RESUMEN DE DEMOSTRACIÓN|DEMO SUMMARY|RÉSUMÉ DE DÉMONSTRATION|RESUMO DE DEMONSTRAÇÃO|演示摘要
Total orientativo|Estimated total|Total indicatif|Total estimado|预估总额
Solicitud al anfitrión|Request to host|Demande à l’hôte|Solicitação ao anfitrião|向接待方的申请
Simulación|Simulation|Simulation|Simulação|模拟
Sin simulación de pago|No payment simulation|Aucune simulation de paiement|Sem simulação de pagamento|无付款模拟
No acredita un pago ni una reserva real. No se ha cobrado dinero.|Not proof of a real payment or booking. No money has been charged.|Ne prouve ni paiement ni réservation réels. Aucun montant débité.|Não comprova pagamento nem reserva reais. Nada foi cobrado.|不证明真实付款或预订。未扣款。
Tus viajes y pagos|Your trips and payments|Vos voyages et paiements|Suas viagens e pagamentos|你的旅行与付款
La escapada, su solicitud y la simulación de pago, en un mismo lugar.|Your outing, request and payment simulation in one place.|Votre escapade, sa demande et la simulation de paiement au même endroit.|Sua escapada, solicitação e simulação de pagamento em um só lugar.|在同一页面查看出游、申请与付款模拟。
Estás en modo de demostración.|You’re in demo mode.|Vous êtes en mode démo.|Você está no modo demonstração.|你正在使用演示模式。
Puedes probar los pagos y sus estados. No se cobra dinero ni se envían reservas externas.|Test payments and their statuses. No money is charged and no external booking is sent.|Testez les paiements et leurs états. Aucun débit ni réservation externe envoyée.|Teste pagamentos e seus status. Nada é cobrado e nenhuma reserva externa é enviada.|可以测试付款及状态。不会扣款或向外部发送预订。
Estado de solicitudes|Request status|État des demandes|Status das solicitações|申请状态
Activas|Active|Actives|Ativas|进行中
Canceladas|Cancelled|Annulées|Canceladas|已取消
Todas|All|Toutes|Todas|全部
wambra|traveler|voyageur|viajante|旅行者
wambras|travelers|voyageurs|viajantes|旅行者
en total ·|total ·|au total ·|no total ·|总计 ·
Simulación de pago aprobada|Payment simulation approved|Simulation de paiement approuvée|Simulação de pagamento aprovada|付款模拟已批准
Solicitud cancelada. El historial de la simulación se conserva; no existe un cobro ni un reembolso real.|Request cancelled. The simulation history is kept; there is no real charge or refund.|Demande annulée. L’historique du test est conservé ; aucun débit ni remboursement réel.|Solicitação cancelada. O histórico da simulação é mantido; não há cobrança nem reembolso reais.|申请已取消。保留模拟历史；不涉及真实扣款或退款。
Simulación completada. El estado del anfitrión se mantiene por separado.|Simulation complete. The host’s status remains separate.|Simulation terminée. L’état de l’hôte reste distinct.|Simulação concluída. O status do anfitrião é mantido separadamente.|模拟已完成。接待方确认状态单独保留。
No se puede completar esta simulación. Revisa el estado de la solicitud.|Cannot complete this simulation. Check the request status.|Impossible de terminer cette simulation. Vérifiez l’état de la demande.|Não é possível concluir a simulação. Confira o status da solicitação.|无法完成此模拟。请检查申请状态。
Completar simulación|Complete simulation|Terminer la simulation|Concluir simulação|完成模拟
Descargar resumen|Download summary|Télécharger le résumé|Baixar resumo|下载摘要
Cancelar solicitud|Cancel request|Annuler la demande|Cancelar solicitação|取消申请
Sin solicitudes canceladas|No cancelled requests|Aucune demande annulée|Nenhuma solicitação cancelada|没有已取消的申请
Tu próxima escapada empieza con una idea|Your next outing starts with an idea|Votre prochaine escapade commence par une idée|Sua próxima escapada começa com uma ideia|下一次出游从一个想法开始
Elige una experiencia para probar su reserva y recorrido de pago.|Choose an experience to test the booking and payment flow.|Choisissez une expérience pour tester la réservation et le paiement.|Escolha uma experiência para testar a reserva e o fluxo de pagamento.|选择体验，测试预订与付款流程。
Encontrar una escapada|Find an outing|Trouver une escapade|Encontrar uma escapada|寻找出游体验
Los estados de pago son simulaciones locales. La disponibilidad de una visita siempre requiere la confirmación del anfitrión.|Payment statuses are local simulations. Availability always requires the host’s confirmation.|Les états de paiement sont des simulations locales. La disponibilité nécessite toujours la confirmation de l’hôte.|Os status de pagamento são simulações locais. A disponibilidade sempre depende da confirmação do anfitrião.|付款状态是本地模拟。到访空位始终需要接待方确认。
¿Cancelar esta solicitud?|Cancel this request?|Annuler cette demande ?|Cancelar esta solicitação?|取消此申请？
La solicitud quedará cancelada y conservará su historial de prueba. No se realizará ningún cobro ni reembolso.|The request will be cancelled and its test history kept. No money will be charged or refunded.|La demande sera annulée et l’historique du test conservé. Aucun débit ni remboursement.|A solicitação será cancelada e o histórico de teste mantido. Não haverá cobrança nem reembolso.|申请将被取消，并保留测试历史。不会真实扣款或退款。
Mantener mi plan|Keep my plan|Garder mon programme|Manter meu plano|保留安排
Solicitud cancelada en esta demostración.|Request cancelled in this demo.|Demande annulée dans cette démo.|Solicitação cancelada nesta demonstração.|已在此演示中取消申请。
Sí, cancelar solicitud|Yes, cancel request|Oui, annuler la demande|Sim, cancelar solicitação|是，取消申请
Cambia al perfil de viajero para solicitar una reserva.|Switch to the traveler profile to request a booking.|Passez au profil voyageur pour demander une réservation.|Mude para o perfil de viajante para solicitar uma reserva.|请切换为旅行者身份再申请预订。
Elige un método de pago disponible en la demostración.|Choose a payment method available in the demo.|Choisissez un moyen de paiement disponible dans la démo.|Escolha um método de pagamento disponível na demonstração.|请选择演示中提供的付款方式。
El estado del pago de demostración no es válido.|The demo payment status is invalid.|L’état du paiement de démo est invalide.|O status do pagamento de demonstração é inválido.|演示付款状态无效。
Esta experiencia ya no está disponible.|This experience is no longer available.|Cette expérience n’est plus disponible.|Esta experiência não está mais disponível.|此体验已不再提供。
Revisa los cupos disponibles y la cantidad de personas.|Check available spaces and group size.|Vérifiez les places et le nombre de personnes.|Confira as vagas e a quantidade de pessoas.|请检查空位及同行人数。
Elige una fecha válida a partir de hoy.|Choose a valid date from today onward.|Choisissez une date valide à partir d’aujourd’hui.|Escolha uma data válida a partir de hoje.|请选择今天或以后的有效日期。
Revisa los adicionales de tu solicitud.|Check your request extras.|Vérifiez les suppléments de votre demande.|Confira os adicionais da solicitação.|请检查申请中的额外项目。
No quedan suficientes cupos para esa fecha.|Not enough spaces remain for that date.|Il ne reste pas assez de places à cette date.|Não há vagas suficientes nessa data.|该日期剩余空位不足。
`;

export const paymentTranslations: Record<'en' | 'fr' | 'pt' | 'zh', Record<string, string>> = { en: {}, fr: {}, pt: {}, zh: {} };
for (const row of rows.trim().split('\n')) {
  const [source, en, fr, pt, zh] = row.split('|');
  if (source && en && fr && pt && zh) {
    paymentTranslations.en[source] = en;
    paymentTranslations.fr[source] = fr;
    paymentTranslations.pt[source] = pt;
    paymentTranslations.zh[source] = zh;
  }
}
