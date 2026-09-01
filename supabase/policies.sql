schemaname,tablename,policyname,roles,cmd,qual,with_check
public,citas,Usuarios crean sus citas,{public},INSERT,null,(auth.uid() = usuario_id)
public,citas,Usuarios ven sus propias citas,{public},SELECT,(auth.uid() = usuario_id),null
public,clases,Lectura publica de clases,{public},SELECT,(estado = 'activo'::text),null
public,cursos,Lectura publica de cursos,{public},SELECT,(estado = 'publicado'::text),null
public,inscripciones,Usuarios ven sus inscripciones,{public},SELECT,(auth.uid() = usuario_id),null
public,modalidades,Lectura publica de modalidades,{public},SELECT,true,null
public,ordenes,Usuarios ven sus ordenes,{public},SELECT,(auth.uid() = usuario_id),null
public,progreso,Usuarios ven y actualizan su progreso,{public},ALL,(auth.uid() = usuario_id),null
public,roles,Lectura publica de roles,{public},SELECT,true,null
public,servicios,Lectura publica de servicios,{public},SELECT,true,null
public,usuarios,Usuarios actualizan su propio perfil,{public},UPDATE,(auth.uid() = id),null
public,usuarios,Usuarios ven su propio perfil,{public},SELECT,(auth.uid() = id),null