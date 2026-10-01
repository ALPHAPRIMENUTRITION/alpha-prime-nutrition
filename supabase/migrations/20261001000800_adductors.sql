-- Grupo muscular Aductores: ejercicios base (no duplica si ya existen).
insert into public.exercises (coach_id, name, muscle_group, equipment)
select null, v.name, 'Aductores', v.equipment
from (values
  ('Sentadilla sumo con barra', 'Barra'),
  ('Sentadilla sumo con mancuerna', 'Mancuernas'),
  ('Sentadilla sumo con kettlebell', 'Kettlebell'),
  ('Sentadilla sumo en Smith', 'Máquina'),
  ('Peso muerto sumo', 'Barra'),
  ('Aducción de cadera en máquina', 'Máquina'),
  ('Aducción de cadera en polea', 'Polea'),
  ('Sentadilla lateral (cosaca)', 'Peso corporal'),
  ('Zancada lateral con mancuernas', 'Mancuernas'),
  ('Plancha Copenhague', 'Peso corporal')
) as v(name, equipment)
where not exists (
  select 1 from public.exercises e where e.coach_id is null and lower(e.name) = lower(v.name)
);
