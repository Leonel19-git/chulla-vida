const rows: [string,string,string,string,string][] = [
 ['No disponible','Unavailable','Indisponible','Indisponível','不可用'],
 ['Moneda','Currency','Devise','Moeda','币种'],
 ['Pagar {amount}','Pay {amount}','Payer {amount}','Pagar {amount}','支付 {amount}'],
 ['Para una escapada.','For a getaway.','Pour une escapade.','Para uma escapada.','适合短途出游。'],
 ['Para seguir armando planes.','Keep planning your next trips.','Pour continuer à préparer tes sorties.','Para continuar planejando viagens.','适合持续规划旅程。'],
 ['Todo un año. También con pasaporte premium.','A full year, including the premium passport.','Toute une année, avec le passeport premium.','Um ano inteiro, com passaporte premium.','全年使用，包含高级护照。'],
 ['Revisa tu plan.','Review your plan.','Vérifie ton offre.','Revise seu plano.','确认你的套餐。'],
 ['Cambiar de plan','Change plan','Changer d’offre','Trocar de plano','更换套餐'],
 ['El importe y lo que incluye, antes de confirmar.','Check the amount and benefits before confirming.','Le montant et les avantages avant de confirmer.','O valor e os benefícios antes de confirmar.','确认前查看金额及权益。'],
 ['Elige el tiempo. El destino lo pones tú.','Choose the duration. The destination is yours.','Choisis la durée. À toi de choisir la destination.','Escolha o período. O destino é com você.','选择时长，目的地由你决定。'],
 ['Duración del plan','Plan duration','Durée de l’offre','Duração do plano','套餐时长'],
 ['Disponibilidad del pago','Payment availability','Disponibilité du paiement','Disponibilidade do pagamento','付款可用状态'],
 ['Prueba local','Local demo','Démo locale','Teste local','本地演示'],
 ['Pago de la membresía','Membership payment','Paiement de l’abonnement','Pagamento da assinatura','会员付款'],
 ['Cobro aún no habilitado','Payments not enabled yet','Paiement pas encore activé','Cobrança ainda não habilitada','尚未启用收款'],
 ['El pago de membresías aún no está conectado. Puedes revisar los planes sin realizar un cobro.','Membership payments are not connected yet. You can review plans without being charged.','Le paiement des abonnements n’est pas encore connecté. Tu peux consulter les offres sans être débité.','O pagamento de assinaturas ainda não está conectado. Você pode revisar os planos sem cobrança.','会员付款尚未接通，你可以查看套餐而不会被扣款。'],
 ['Aún no se ha realizado ningún cobro.','No payment has been taken.','Aucun paiement n’a été prélevé.','Nenhuma cobrança foi realizada.','尚未发生任何扣款。'],
 ['Resumen de tu plan','Your plan summary','Récapitulatif de ton offre','Resumo do seu plano','套餐摘要'],
 ['Tu elección','Your selection','Ton choix','Sua escolha','你的选择'],
 ['Total del periodo','Total for the period','Total pour la période','Total do período','该期间总价'],
 ['Solo los datos que descargaste.','Only the data you downloaded.','Uniquement les données téléchargées.','Somente os dados que você baixou.','仅限已下载的数据。'],
 ['Entiendo que es una prueba local, sin cobro real.','I understand this is a local demo with no real charge.','Je comprends qu’il s’agit d’une démo locale sans paiement réel.','Entendo que é um teste local, sem cobrança real.','我了解这是本地演示，不会实际扣款。'],
 ['La prueba no confirma un pago ni una suscripción real.','The demo does not confirm a real payment or subscription.','La démo ne confirme ni paiement ni abonnement réel.','O teste não confirma pagamento nem assinatura real.','演示不代表真实付款或订阅。'],
 ['Revisar este plan','Review this plan','Vérifier cette offre','Revisar este plano','查看此套餐'],
 ['Elegir un plan todavía no realiza un cobro.','Selecting a plan does not charge you.','Choisir une offre ne déclenche aucun paiement.','Escolher um plano não gera cobrança.','选择套餐不会扣款。'],
 ['Seguir explorando sin plan','Keep exploring without a plan','Continuer sans abonnement','Continuar explorando sem plano','继续免费探索'],
 ['No se pudo activar la prueba. Vuelve a intentarlo.','Could not activate the demo. Try again.','Impossible d’activer la démo. Réessaie.','Não foi possível ativar o teste. Tente novamente.','无法启用演示，请重试。'],
];
export const en=Object.fromEntries(rows.map(([key,value])=>[key,value]));
export const fr=Object.fromEntries(rows.map(([key,,value])=>[key,value]));
export const pt=Object.fromEntries(rows.map(([key,,,value])=>[key,value]));
export const zh=Object.fromEntries(rows.map(([key,,,,value])=>[key,value]));
