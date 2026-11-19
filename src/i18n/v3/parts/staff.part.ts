const rows:[string,string,string,string,string][]=[
 ['Contraseña','Password','Mot de passe','Senha','密码'],
 ['Nueva contraseña','New password','Nouveau mot de passe','Nova senha','新密码'],
 ['Equipo CHULLA VIDA','CHULLA VIDA team','Équipe CHULLA VIDA','Equipe CHULLA VIDA','CHULLA VIDA 团队'],
 ['Acceso del equipo','Team access','Accès de l’équipe','Acesso da equipe','团队登录'],
 ['Tu espacio de trabajo.','Your workspace.','Ton espace de travail.','Seu espaço de trabalho.','你的工作空间。'],
 ['Entra con tu usuario del equipo.','Sign in with your team username.','Connecte-toi avec ton identifiant d’équipe.','Entre com seu usuário da equipe.','使用团队用户名登录。'],
 ['Usuario','Username','Identifiant','Usuário','用户名'],
 ['Entrar al dashboard','Open dashboard','Ouvrir le tableau de bord','Entrar no painel','进入控制台'],
 ['Entrando…','Signing in…','Connexion…','Entrando…','正在登录…'],
 ['Usuario o contraseña incorrectos.','Incorrect username or password.','Identifiant ou mot de passe incorrect.','Usuário ou senha incorretos.','用户名或密码错误。'],
 ['Demasiados intentos. Espera un momento y vuelve a entrar.','Too many attempts. Wait a moment before trying again.','Trop de tentatives. Patiente avant de réessayer.','Muitas tentativas. Aguarde antes de tentar novamente.','尝试次数过多，请稍后重试。'],
 ['No se pudo conectar con el equipo. Reintenta en un momento.','Could not connect to the team area. Try again shortly.','Connexion à l’espace équipe impossible. Réessaie bientôt.','Não foi possível conectar à área da equipe. Tente novamente em instantes.','无法连接团队空间，请稍后重试。'],
 ['El acceso del equipo aún no está configurado.','Team access has not been configured yet.','L’accès de l’équipe n’est pas encore configuré.','O acesso da equipe ainda não está configurado.','团队登录尚未配置。'],
 ['Si necesitas recuperar el acceso, contacta con el responsable del equipo.','Contact the team owner to recover access.','Contacte le responsable de l’équipe pour récupérer ton accès.','Fale com o responsável da equipe para recuperar o acesso.','如需恢复访问，请联系团队负责人。'],
 ['Herramientas del equipo','Team tools','Outils de l’équipe','Ferramentas da equipe','团队工具'],
 ['Mi acceso','My access','Mon accès','Meu acesso','我的访问'],
 ['Administrador','Administrator','Administrateur','Administrador','管理员'],['Revisor','Reviewer','Examinateur','Revisor','审核员'],
 ['Dashboard del equipo','Team dashboard','Tableau de bord de l’équipe','Painel da equipe','团队控制台'],
 ['Crea tu contraseña.','Create your password.','Crée ton mot de passe.','Crie sua senha.','创建你的密码。'],
 ['Cambia tu contraseña.','Change your password.','Change ton mot de passe.','Altere sua senha.','修改密码。'],
 ['Tu clave inicial es temporal. Elige una nueva para abrir el dashboard.','Your initial password is temporary. Choose a new one to open the dashboard.','Ton mot de passe initial est temporaire. Choisis-en un nouveau pour ouvrir le tableau de bord.','Sua senha inicial é temporária. Escolha uma nova para abrir o painel.','初始密码为临时密码。请设置新密码后进入控制台。'],
 ['Las sesiones anteriores perderán acceso al cambiar la contraseña.','Earlier sessions will lose access when you change the password.','Les sessions précédentes perdront leur accès après le changement.','As sessões anteriores perderão acesso quando você alterar a senha.','修改密码后，旧会话将失去访问权限。'],
 ['Repite la contraseña','Repeat the password','Répète le mot de passe','Repita a senha','再次输入密码'],
 ['Al menos 14 caracteres, con mayúsculas, minúsculas, un número y un símbolo.','At least 14 characters, including uppercase, lowercase, a number and a symbol.','Au moins 14 caractères, avec majuscules, minuscules, chiffre et symbole.','Pelo menos 14 caracteres, com maiúsculas, minúsculas, número e símbolo.','至少14个字符，包含大写字母、小写字母、数字和符号。'],
 ['Guardar y abrir dashboard','Save and open dashboard','Enregistrer et ouvrir le tableau de bord','Salvar e abrir painel','保存并打开控制台'],
 ['No se pudo completar el cambio. Vuelve a entrar con la contraseña nueva o contacta con el responsable.','The change could not be completed. Sign in with the new password or contact the team owner.','Le changement n’a pas abouti. Connecte-toi avec le nouveau mot de passe ou contacte le responsable.','Não foi possível concluir a alteração. Entre com a nova senha ou fale com o responsável.','无法完成修改。请使用新密码登录或联系负责人。'],
];
export const en=Object.fromEntries(rows.map(([key,value])=>[key,value]));
export const fr=Object.fromEntries(rows.map(([key,,value])=>[key,value]));
export const pt=Object.fromEntries(rows.map(([key,,,value])=>[key,value]));
export const zh=Object.fromEntries(rows.map(([key,,,,value])=>[key,value]));
