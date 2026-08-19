-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cpfCnpj" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "inscricaoMunicipal" TEXT,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "telefone" TEXT;
