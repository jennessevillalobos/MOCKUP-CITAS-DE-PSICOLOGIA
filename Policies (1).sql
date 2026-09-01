schemaname,tablename,policyname,roles,cmd,qual,with_check
public,calificaciones,Lectura publica de calificaciones,{public},SELECT,true,null
public,calificaciones,Usuarios crean calificaciones,{public},INSERT,null,(auth.uid() IS NOT NULL)
public,citas,Usuarios actualizan sus propias citas,{public},UPDATE,(auth.uid() IS NOT NULL),null
public,citas,Usuarios crean sus citas,{public},INSERT,null,(auth.uid() = usuario_id)
public,citas,Usuarios ven sus propias citas,{public},SELECT,(auth.uid() = usuario_id),null
public,clases,Lectura publica de clases,{public},SELECT,(estado = 'activo'::text),null
public,compras_digitales,Usuarios ven sus compras digitales,{public},SELECT,(auth.uid() IS NOT NULL),null
public,cursos,Lectura publica de cursos,{public},SELECT,(estado = 'publicado'::text),null
public,enlaces_descarga,Usuarios ven sus enlaces de descarga,{public},SELECT,(auth.uid() IS NOT NULL),null
public,evaluaciones,Lectura publica de evaluaciones,{public},SELECT,true,null
public,horarios,Lectura publica de horarios,{public},SELECT,true,null
public,inscripciones,Usuarios se inscriben en cursos,{public},INSERT,null,(auth.uid() IS NOT NULL)
public,inscripciones,Usuarios ven sus inscripciones,{public},SELECT,(auth.uid() = usuario_id),null
public,intentos_evaluacion,Usuarios crean sus intentos de evaluacion,{public},INSERT,null,(auth.uid() IS NOT NULL)
public,intentos_evaluacion,Usuarios ven sus intentos de evaluacion,{public},SELECT,(auth.uid() IS NOT NULL),null
public,lugares,Lectura publica de lugares,{public},SELECT,true,null
public,modalidades,Lectura publica de modalidades,{public},SELECT,true,null
public,modulos,Lectura publica de modulos,{public},SELECT,"(EXISTS ( SELECT 1
   FROM cursos
  WHERE ((cursos.id = modulos.curso_id) AND (cursos.estado = 'publicado'::text))))",null
public,monedas,Lectura publica de monedas,{public},SELECT,true,null
public,opciones,Lectura publica de opciones,{public},SELECT,true,null
public,ordenes,Usuarios crean sus propias ordenes,{public},INSERT,null,(auth.uid() IS NOT NULL)
public,ordenes,Usuarios ven sus ordenes,{public},SELECT,(auth.uid() = usuario_id),null
public,pagos,Usuarios ven sus propios pagos,{public},SELECT,(auth.uid() IS NOT NULL),null
public,preguntas,Lectura publica de preguntas,{public},SELECT,true,null
public,productos_digitales,Lectura publica de productos digitales,{public},SELECT,(estado = 'activo'::text),null
public,profesional_lugar,Lectura publica de profesional_lugar,{public},SELECT,true,null
public,profesional_servicio,Lectura publica de profesional_servicio,{public},SELECT,true,null
public,profesionales,Lectura publica de profesionales,{public},SELECT,true,null
public,progreso,Usuarios ven y actualizan su progreso,{public},ALL,(auth.uid() = usuario_id),null
public,roles,Lectura publica de roles,{public},SELECT,true,null
public,servicio_modalidad,Lectura publica de servicio_modalidad,{public},SELECT,true,null
public,servicios,Lectura publica de servicios,{public},SELECT,true,null
public,tasas_cambio,Lectura publica de tasas_cambio,{public},SELECT,true,null
public,usuario_roles,Usuarios ven su propio rol,{public},SELECT,(auth.uid() IS NOT NULL),null
public,usuarios,Usuarios actualizan su propio perfil,{public},UPDATE,(auth.uid() = id),null
public,usuarios,Usuarios ven su propio perfil,{public},SELECT,(auth.uid() = id),null