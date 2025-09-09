CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    tipo VARCHAR(20) CHECK (tipo IN ('porteiro','morador')) NOT NULL
);

CREATE TABLE bloco (
    id_bloco SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

CREATE TABLE apartamento (
    id_apartamento SERIAL PRIMARY KEY,
    numero VARCHAR(10) NOT NULL,
    id_bloco INT NOT NULL,
    FOREIGN KEY (id_bloco) REFERENCES bloco(id_bloco)
);

CREATE TABLE usuario_apartamento (
    id_usuario INT,
    id_apartamento INT,
    PRIMARY KEY (id_usuario, id_apartamento),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_apartamento) REFERENCES apartamento(id_apartamento)
);

CREATE TABLE encomenda (
    id_encomenda SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    empresa_entrega VARCHAR(100),
    data_recebimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entregue BOOLEAN DEFAULT FALSE,
    id_apartamento INT NOT NULL,
    id_destinatario INT, -- opcional, caso queira especificar morador
    id_usuario_registro INT NOT NULL, -- porteiro que registrou
    FOREIGN KEY (id_apartamento) REFERENCES apartamento(id_apartamento),
    FOREIGN KEY (id_destinatario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_registro) REFERENCES usuario(id_usuario)
);

CREATE TABLE retirada (
    id_retirada SERIAL PRIMARY KEY,
    id_encomenda INT NOT NULL,
    nome_retirou VARCHAR(100) NOT NULL,
    data_retirada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_encomenda) REFERENCES encomenda(id_encomenda)
);

ALTER TABLE usuario
ADD COLUMN bloco VARCHAR(10),
ADD COLUMN apto VARCHAR(20);

ALTER TABLE encomenda
ADD COLUMN bloco VARCHAR(10),
ADD COLUMN apto VARCHAR(20);

ALTER TABLE usuario
ALTER COLUMN bloco SET NOT NULL,
ALTER COLUMN apto SET NOT NULL;

SELECT * FROM usuario
SELECT * FROM bloco
SELECT * FROM apartamento
SELECT * FROM usuario_apartamento
SELECT * FROM encomenda where id_encomenda = '3'
SELECT * FROM retirada

DELETE FROM usuario where id_usuario = 10

ALTER TABLE encomenda
DROP COLUMN descricao,
DROP COLUMN entregue,
DROP COLUMN id_destinatario,
DROP COLUMN id_usuario_registro;

ALTER TABLE encomenda
ADD COLUMN bloco VARCHAR(10),
ADD COLUMN apartamento VARCHAR(20),
ADD COLUMN nome VARCHAR(100),
ADD COLUMN recebido_por VARCHAR(100);
