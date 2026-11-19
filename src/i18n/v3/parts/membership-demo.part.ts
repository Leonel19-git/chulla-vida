const rows: [string,string,string,string,string][] = [
 ['No se pudo descargar. Vuelve a intentarlo.','Could not download. Try again.','Téléchargement impossible. Réessaie.','Não foi possível baixar. Tente novamente.','下载失败，请重试。'],
 ['Seguir explorando','Keep exploring','Continuer à explorer','Continuar explorando','继续探索'],
 ['Pago de prueba aprobado','Demo payment approved','Paiement de test accepté','Pagamento de teste aprovado','演示付款成功'],
 ['Pago de prueba rechazado','Demo payment declined','Paiement de test refusé','Pagamento de teste recusado','演示付款被拒绝'],
 ['Transferencia de prueba pendiente','Demo transfer pending','Virement de test en attente','Transferência de teste pendente','演示转账待审核'],
 ['Modo prueba · sin cobro real','Demo mode · no real charge','Mode test · aucun débit réel','Modo teste · sem cobrança real','演示模式 · 不会实际扣款'],
 ['Simulación del pago del plan','Plan payment simulation','Simulation du paiement de l’offre','Simulação do pagamento do plano','套餐付款演示'],
 ['Esta prueba no activa una membresía pagada.','This demo does not activate a paid membership.','Ce test n’active pas un abonnement payant.','Este teste não ativa uma assinatura paga.','此演示不会开通付费会员。'],
 ['Simula la revisión del comprobante:','Simulate the receipt review:','Simule la vérification du justificatif :','Simule a revisão do comprovante:','模拟审核凭证：'],
 ['Aprobar transferencia de prueba','Approve demo transfer','Accepter le virement de test','Aprovar transferência de teste','批准演示转账'],
 ['Rechazar transferencia de prueba','Decline demo transfer','Refuser le virement de test','Recusar transferência de teste','拒绝演示转账'],
 ['Descargar comprobante de prueba','Download demo receipt','Télécharger le reçu de test','Baixar comprovante de teste','下载演示凭证'],
 ['Hacer otra prueba','Run another demo','Faire un autre test','Fazer outro teste','再次演示'],
 ['Método de pago de prueba','Demo payment method','Mode de paiement de test','Método de pagamento de teste','演示付款方式'],
 ['Confirma el modo prueba para abrir el formulario.','Confirm demo mode to open the form.','Confirme le mode test pour ouvrir le formulaire.','Confirme o modo teste para abrir o formulário.','确认演示模式后打开表单。'],
 ['Mis comprobantes de planes de prueba','My demo plan receipts','Mes reçus d’offres de test','Meus comprovantes de planos de teste','我的套餐演示凭证'],
 ['Descargar {code}','Download {code}','Télécharger {code}','Baixar {code}','下载 {code}'],
 ['Transferencia de membresía de prueba: sin movimiento de dinero.','Demo membership transfer: no money moves.','Virement de test d’abonnement : aucun argent transféré.','Transferência de assinatura de teste: sem movimentar dinheiro.','会员转账演示：不会转移资金。'],
 ['El comprobante durará esta sesión: el navegador no permitió guardarlo.','The receipt lasts this session: browser storage was unavailable.','Le reçu reste pour cette session : le navigateur n’a pas pu le conserver.','O comprovante dura esta sessão: o navegador não permitiu salvá-lo.','浏览器未能保存凭证，本次会话结束后将不再保留。'],
 ['El pago se simula en el formulario. No se mueve dinero real.','The form simulates payment. No real money moves.','Le formulaire simule le paiement. Aucun argent réel n’est transféré.','O formulário simula o pagamento. Nenhum dinheiro real é movimentado.','表单仅模拟付款，不会转移真实资金。'],
];
export const en=Object.fromEntries(rows.map(([key,value])=>[key,value]));
export const fr=Object.fromEntries(rows.map(([key,,value])=>[key,value]));
export const pt=Object.fromEntries(rows.map(([key,,,value])=>[key,value]));
export const zh=Object.fromEntries(rows.map(([key,,,,value])=>[key,value]));
