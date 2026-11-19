const rows: [string,string,string,string,string][] = [
 ['Cada viaje deja su huella.','Every trip leaves a memory.','Chaque voyage laisse une trace.','Cada viagem deixa sua marca.','每次旅行，都留下足迹。'],
 ['Color intenso: visitas verificadas.','Strong colour: verified visits.','Couleur intense : visites vérifiées.','Cor intensa: visitas verificadas.','深色：已验证的到访。'],
 ['Ver cromos de {region}','View {region} stickers','Voir les vignettes de {region}','Ver figurinhas de {region}','查看{region}贴纸'],
 ['Así se vive el viaje','This is how we travel','C’est ça, le voyage','É assim que se viaja','这就是旅行'],
 ['¡De ley, nos vamos!','We’re going, for sure!','C’est sûr, on y va !','Com certeza, bora!','说走就走！'],
 ['Menos «algún día». Más «de una».','Less “someday”. More “let’s go”.','Moins de « un jour ». Plus de « on y va ».','Menos “um dia”. Mais “bora agora”.','少一点“改天”，多一点“现在出发”。'],
 ['Pilas: cuida lo nuestro.','Look after the places we share.','Prends soin de nos lieux de vie.','Cuide dos lugares que são de todos.','用心爱护我们共同的家园。'],
 ['La foto al feed. El recuerdo, contigo.','The photo on your feed. The memory stays with you.','La photo dans ton fil. Le souvenir avec toi.','A foto no feed. A lembrança fica com você.','照片留在动态里，回忆留在心里。'],
 ['¡De una, wambra!','Let’s go, wambra!','On y va, wambra !','Bora, wambra!','出发吧，wambra！'],
 ['Tu nombre, tus panas, tus historias.','Your name, your friends, your stories.','Ton nom, tes amis, tes histoires.','Seu nome, seus amigos, suas histórias.','你的名字、朋友和旅行故事。'],
];
export const en=Object.fromEntries(rows.map(([key,value])=>[key,value]));
export const fr=Object.fromEntries(rows.map(([key,,value])=>[key,value]));
export const pt=Object.fromEntries(rows.map(([key,,,value])=>[key,value]));
export const zh=Object.fromEntries(rows.map(([key,,,,value])=>[key,value]));
