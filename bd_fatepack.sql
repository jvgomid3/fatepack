-- Ajuste de chave primária auto-incremento para a tabela usuario
-- Objetivo: garantir que id_usuario gere sempre um novo valor e não cause colisão
-- Ambiente: PostgreSQL (Supabase usa PostgreSQL 15+)

BEGIN;

-- 1) Garante que exista PK em (id_usuario)
DO $$
DECLARE
	has_pk boolean;
BEGIN
	SELECT EXISTS (
		SELECT 1
			FROM pg_constraint c
			JOIN pg_class t ON t.oid = c.conrelid
			JOIN pg_namespace n ON n.oid = t.relnamespace
		 WHERE n.nspname = 'public'
			 AND t.relname = 'usuario'
			 AND c.contype = 'p'
	) INTO has_pk;

	IF NOT has_pk THEN
		EXECUTE 'ALTER TABLE public.usuario ADD PRIMARY KEY (id_usuario)';
	END IF;
END $$;

-- 2) Ajusta o mecanismo de geração do id (identity/sequence)
DO $$
DECLARE
	seq_name text;
	max_id   bigint;
BEGIN
	-- Tenta descobrir a sequence vinculada (serve p/ identity e serial)
	SELECT pg_get_serial_sequence('public.usuario', 'id_usuario') INTO seq_name;

	-- Valor atual máximo na tabela
	SELECT COALESCE(MAX(id_usuario), 0) FROM public.usuario INTO max_id;

	IF seq_name IS NULL THEN
		-- Não há sequence vinculada: cria e vincula
		seq_name := 'public.usuario_id_usuario_seq';
		EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || seq_name;
		-- Se a coluna for identity, não pode setar DEFAULT; nesse caso, troque para BY DEFAULT AS IDENTITY
		BEGIN
			EXECUTE 'ALTER TABLE public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval(''' || seq_name || ''')';
		EXCEPTION WHEN others THEN
			-- Se falhar por ser identity, forçamos o modo identity
			BEGIN
				EXECUTE 'ALTER TABLE public.usuario ALTER COLUMN id_usuario DROP IDENTITY IF EXISTS';
			EXCEPTION WHEN others THEN NULL; END;
			EXECUTE 'ALTER TABLE public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval(''' || seq_name || ''')';
		END;
		EXECUTE 'ALTER SEQUENCE ' || seq_name || ' OWNED BY public.usuario.id_usuario';
	END IF;

	-- Alinha a sequence/identity ao maior id existente
	EXECUTE 'SELECT setval(''' || seq_name || ''', ' || max_id || ')';
END $$;

COMMIT;

-- Observação:
-- - Após rodar este script, novos INSERTs em public.usuario não devem fornecer id_usuario;
--   o banco gerará automaticamente um novo id sequencial (max+1).
