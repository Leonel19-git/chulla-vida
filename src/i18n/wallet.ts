import type { Language } from '../types';
const rows = `
Cobros y retiros|Payments & withdrawals|Paiements et retraits|Pagamentos e saques|收款与提现
Tu trabajo tiene su recompensa.|Your work deserves its reward.|Votre travail mérite sa récompense.|Seu trabalho merece recompensa.|你的付出值得回报。
Demostración · sin dinero real|Demo · no real money|Démo · sans argent réel|Demonstração · sem dinheiro real|演示 · 无真实资金
El viajero paga a CHULLA VIDA. Al validar su llegada, el 90% queda disponible para tu negocio.|The traveler pays CHULLA VIDA. Once arrival is verified, 90% becomes available to your business.|Le voyageur paie CHULLA VIDA. Après validation de son arrivée, 90 % sont disponibles pour votre activité.|O viajante paga à CHULLA VIDA. Após validar sua chegada, 90% ficam disponíveis para seu negócio.|旅客向 CHULLA VIDA 付款。验证到达后，商家可提取 90%。
Cobrado en la plataforma|Collected on the platform|Collecté sur la plateforme|Recebido na plataforma|平台收款
Comisión CHULLA VIDA · 10%|CHULLA VIDA fee · 10%|Commission CHULLA VIDA · 10 %|Comissão CHULLA VIDA · 10%|CHULLA VIDA 佣金 · 10%
Para tu negocio · 90%|For your business · 90%|Pour votre activité · 90 %|Para seu negócio · 90%|商家所得 · 90%
Retenido hasta la llegada|Held until arrival|Retenu jusqu’à l’arrivée|Retido até a chegada|到达前暂存
Disponible para retirar|Available to withdraw|Disponible au retrait|Disponível para saque|可提现
Retiros solicitados · demo|Requested withdrawals · demo|Retraits demandés · démo|Saques solicitados · demonstração|提现申请 · 演示
Simular retiro|Simulate withdrawal|Simuler un retrait|Simular saque|模拟提现
Pago del viajero|Traveler payment|Paiement du voyageur|Pagamento do viajante|旅客付款
Llegada validada|Arrival verified|Arrivée validée|Chegada validada|到达已验证
Retiro del negocio|Business withdrawal|Retrait de l’hôte|Saque do negócio|商家提现
Valida una llegada|Verify an arrival|Valider une arrivée|Validar uma chegada|验证到达
Código del viajero o contenido del QR|Traveler code or QR contents|Code du voyageur ou contenu du QR|Código do viajante ou conteúdo do QR|旅客代码或二维码内容
Validar código|Validate code|Valider le code|Validar código|验证代码
Primero acepta la solicitud. El pago demo debe estar aprobado y la fecha de visita debe haber llegado.|First accept the request. Demo payment must be approved and the visit date must have arrived.|Acceptez d’abord la demande. Le paiement démo doit être approuvé et la date de visite atteinte.|Primeiro aceite a solicitação. O pagamento de demonstração deve estar aprovado e a data da visita deve ter chegado.|先接受预订申请。模拟付款须获批准，且须已到预订日期。
Movimientos de este negocio|This business’s transactions|Mouvements de cette activité|Movimentações deste negócio|本商家的交易
Esperando llegada|Awaiting arrival|En attente d’arrivée|Aguardando chegada|等待到达
Disponible|Available|Disponible|Disponível|可提现
Retiro solicitado|Withdrawal requested|Retrait demandé|Saque solicitado|已申请提现
Todavía no hay cobros.|No payments yet.|Aucun paiement pour le moment.|Ainda não há pagamentos.|暂无收款。
Los pagos demo aprobados aparecen aquí después de aceptar la solicitud.|Approved demo payments appear here after you accept the request.|Les paiements démo approuvés apparaissent ici après acceptation de la demande.|Pagamentos de demonstração aprovados aparecem aqui após aceitar a solicitação.|接受申请后，已批准的模拟付款会显示在此处。
Confirmar retiro de demostración|Confirm demo withdrawal|Confirmer le retrait démo|Confirmar saque de demonstração|确认模拟提现
Destino de prueba · cuenta ficticia CHULLA VIDA|Test destination · fictional CHULLA VIDA account|Destination test · compte fictif CHULLA VIDA|Destino de teste · conta fictícia CHULLA VIDA|测试收款方 · CHULLA VIDA 虚拟账户
Se registrará una solicitud local. No se enviará dinero ni se solicitarán datos bancarios.|A local request will be recorded. No money is sent and no bank details are requested.|Une demande locale sera enregistrée. Aucun argent envoyé ni coordonnées bancaires demandées.|Uma solicitação local será registrada. Nenhum dinheiro será enviado e nenhum dado bancário será solicitado.|仅在本地记录申请。不会转账，也不会要求银行资料。
Cancelar|Cancel|Annuler|Cancelar|取消
Confirmar simulación|Confirm simulation|Confirmer la simulation|Confirmar simulação|确认模拟
El saldo cambió. Revisa los movimientos antes de continuar.|The balance changed. Review transactions before continuing.|Le solde a changé. Vérifiez les mouvements avant de continuer.|O saldo mudou. Revise as movimentações antes de continuar.|余额已变化。请检查交易后再继续。
Solicitud demo registrada. No se realizó ninguna transferencia.|Demo request recorded. No transfer was made.|Demande démo enregistrée. Aucun virement effectué.|Solicitação de demonstração registrada. Nenhuma transferência realizada.|模拟申请已记录。未发生实际转账。
Un retiro previo requiere revisión porque cambió una visita. No se generan saldos negativos ni devoluciones automáticas.|A previous withdrawal needs review because a visit changed. No negative balances or automatic refunds are created.|Un retrait précédent nécessite une vérification après modification d’une visite. Aucun solde négatif ni remboursement automatique.|Um saque anterior precisa de revisão porque uma visita mudou. Não são gerados saldos negativos nem reembolsos automáticos.|某次到访状态已变更，先前提现需审核。不会生成负余额或自动退款。
Solicitud de prueba|Test request|Demande test|Solicitação de teste|测试申请
No hay saldo disponible.|No balance available.|Aucun solde disponible.|Não há saldo disponível.|暂无可提余额。
Historial de retiros|Withdrawal history|Historique des retraits|Histórico de saques|提现记录
Selecciona un negocio para ver sus cobros.|Select a business to view its payments.|Sélectionnez une activité pour voir ses paiements.|Selecione um negócio para ver seus pagamentos.|选择商家以查看收款。
Guardado solo en este navegador. La comisión se calcula por cobro, en centavos.|Saved only in this browser. The fee is calculated per charge, in cents.|Enregistré uniquement dans ce navigateur. La commission est calculée par paiement, en centimes.|Salvo apenas neste navegador. A comissão é calculada por pagamento, em centavos.|仅保存于此浏览器。每笔收款按美分计算佣金。
No pudimos guardar el retiro. Inténtalo de nuevo.|We couldn’t save the withdrawal. Try again.|Impossible d’enregistrer le retrait. Réessayez.|Não foi possível salvar o saque. Tente novamente.|无法保存提现申请，请重试。
Solicitudes aceptadas y pagos aprobados; las canceladas no generan saldo.|Accepted requests and approved payments; cancelled requests generate no balance.|Demandes acceptées et paiements approuvés ; les annulations ne génèrent aucun solde.|Solicitações aceitas e pagamentos aprovados; cancelamentos não geram saldo.|已接受申请及已批准付款；取消的申请不产生余额。
`;
const dictionary = new Map(rows.trim().split('\n').map(row => { const [key, ...values] = row.split('|'); return [key, values]; }));
export function walletText(language: Language, key: string, fallback: (key: string) => string) {
  const index = ({ en: 0, fr: 1, pt: 2, zh: 3 } as Record<string, number>)[language];
  return index === undefined ? fallback(key) : dictionary.get(key)?.[index] || fallback(key);
}
