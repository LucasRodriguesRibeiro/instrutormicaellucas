-- ============================================================================
-- INSTRUTOR MICAEL LUCAS — SUPABASE SETUP (ULTRA-LOW EGRESS + HOTMART)
-- Cole e execute este script no "SQL Editor" do painel do Supabase.
-- ============================================================================

-- 1. Tabela de alunos autorizados (compras Hotmart + liberações manuais)
create table if not exists public.alunos_autorizados (
  id bigint generated always as identity primary key,
  email text not null unique,
  nome text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'reembolsado', 'cancelado')),
  origem text not null default 'hotmart',
  transacao text,
  evento_ultimo text,
  expira_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para manter o email sempre limpo/minúsculo antes de salvar e atualizar updated_at
create or replace function public.trg_normalizar_aluno()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists before_ins_upd_alunos on public.alunos_autorizados;
create trigger before_ins_upd_alunos
  before insert or update on public.alunos_autorizados
  for each row execute function public.trg_normalizar_aluno();

-- 2. Segurança máxima (RLS): Ninguém pode listar a tabela pelo navegador!
alter table public.alunos_autorizados enable row level security;

-- Removemos qualquer policy pública de leitura direta na tabela
drop policy if exists "Leitura publica bloqueada" on public.alunos_autorizados;

-- 3. Função RPC Ultraleve (< 45 bytes de resposta) para o login do aluno
-- O navegador chama apenas esta função passando o e-mail digitado.
create or replace function public.verificar_acesso_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_reg record;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false);
  end if;

  select nome, status, expira_em
    into v_reg
    from public.alunos_autorizados
   where email = v_email
   limit 1;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if v_reg.status <> 'ativo' then
    return jsonb_build_object('ok', false, 's', v_reg.status);
  end if;

  if v_reg.expira_em is not null and v_reg.expira_em < now() then
    return jsonb_build_object('ok', false, 's', 'expirado');
  end if;

  -- Retorna apenas 'ok': true e o primeiro nome do aluno (~35 bytes de Egress!)
  return jsonb_build_object(
    'ok', true,
    'n', coalesce(nullif(split_part(trim(v_reg.nome), ' ', 1), ''), 'Aluno')
  );
end;
$$;

-- Permite que o frontend chame apenas a função RPC
revoke all on table public.alunos_autorizados from anon, authenticated;
grant execute on function public.verificar_acesso_email(text) to anon, authenticated;

-- ============================================================================
-- 4. ALUNOS CADASTRADOS MANUALMENTE
-- ============================================================================
insert into public.alunos_autorizados (email, nome, status, origem)
values
  ('bruna_soares96@outlook.com', 'Bruna Soares', 'ativo', 'manual'),
  ('lukinhaslukas8@gmail.com', 'Lucas', 'ativo', 'manual')
on conflict (email) do update set status = 'ativo';
