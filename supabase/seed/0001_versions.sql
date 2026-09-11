insert into public.engine_versions(version, vision_version, interpretation_version, report_version, active) values ('0.1.0', '0.1.0', '0.1.0', '0.1.0', true) on conflict (version) do nothing;
insert into public.knowledge_versions(version, description, active) values ('0.1.0', 'Base inicial del conocimiento quiromántico', true) on conflict (version) do nothing;
